import WebSocket from "ws";
import { config } from "../../config.js";
import { twitchLog } from "./logger.js";
import type { TwitchTokenStore } from "./token-store.js";

const HELIX_EVENTSUB_URL = "https://api.twitch.tv/helix/eventsub/subscriptions";
const CHAT_MESSAGE_SUBSCRIPTION = {
  type: "channel.chat.message",
  version: "1",
} as const;

type EventSubMetadata = {
  message_id: string;
  message_type: string;
  message_timestamp?: string;
  subscription_type?: string;
  subscription_version?: string;
};

type EventSubWelcomePayload = {
  session: {
    id: string;
    status?: string;
    keepalive_timeout_seconds?: number;
    reconnect_url?: string;
  };
};

type EventSubReconnectPayload = {
  session: {
    reconnect_url: string;
  };
};

type EventSubNotificationPayload = {
  subscription: {
    id: string;
    type: string;
    version: string;
    status: string;
  };
  event: Record<string, unknown>;
};

type EventSubRevocationPayload = {
  subscription: {
    id: string;
    type: string;
    status: string;
  };
};

export type TwitchEventSubHandlers = {
  onChatMessage: (event: Record<string, unknown>) => void;
  onDisconnected?: () => void;
};

export class TwitchEventSubWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private keepaliveTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private stopped = false;
  private subscribed = false;

  constructor(
    private readonly tokenStore: TwitchTokenStore,
    private readonly handlers: TwitchEventSubHandlers,
    private readonly ids: {
      broadcasterUserId: string;
      userId: string;
    },
    private readonly url = config.twitch.eventsubWebSocketUrl,
  ) {}

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect(this.url);
  }

  stop(): void {
    this.stopped = true;
    this.clearKeepalive();
    this.ws?.close();
    this.ws = null;
    this.sessionId = null;
    this.subscribed = false;
    twitchLog.info("EventSub WebSocket stopped.");
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.subscribed;
  }

  private async connect(url: string): Promise<void> {
    if (this.stopped) return;

    twitchLog.info("Connecting to EventSub WebSocket...");
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.once("open", () => {
        twitchLog.info("EventSub WebSocket connected.");
        resolve();
      });

      ws.once("error", (error) => {
        reject(error);
      });

      ws.on("message", (data) => {
        this.handleMessage(data.toString()).catch((error) => {
          twitchLog.error("EventSub message handling failed", error);
        });
      });

      ws.on("close", () => {
        this.clearKeepalive();
        this.subscribed = false;
        this.handlers.onDisconnected?.();
        if (!this.stopped) {
          this.scheduleReconnect();
        }
      });
    }).catch(async (error) => {
      twitchLog.error("EventSub WebSocket connection failed", error);
      await this.scheduleReconnect();
    });
  }

  private async handleMessage(raw: string): Promise<void> {
    const parsed = JSON.parse(raw) as {
      metadata: EventSubMetadata;
      payload: unknown;
    };

    switch (parsed.metadata.message_type) {
      case "session_welcome":
        await this.handleWelcome(parsed.payload as EventSubWelcomePayload);
        break;
      case "session_keepalive":
        this.resetKeepalive();
        break;
      case "session_reconnect":
        await this.handleReconnect(parsed.payload as EventSubReconnectPayload);
        break;
      case "notification":
        this.handleNotification(parsed.payload as EventSubNotificationPayload);
        break;
      case "revocation":
        this.handleRevocation(parsed.payload as EventSubRevocationPayload);
        break;
      default:
        twitchLog.warn(
          `Unhandled EventSub message type: ${parsed.metadata.message_type}`,
        );
    }
  }

  private async handleWelcome(payload: EventSubWelcomePayload): Promise<void> {
    this.sessionId = payload.session.id;
    this.reconnectAttempt = 0;
    twitchLog.info("EventSub session received.");
    this.resetKeepalive(payload.session.keepalive_timeout_seconds ?? 10);

    await this.subscribeChatMessages(this.sessionId);
    this.subscribed = true;
    twitchLog.info("Subscribed to channel.chat.message.");
  }

  private async handleReconnect(payload: EventSubReconnectPayload): Promise<void> {
    const reconnectUrl = payload.session.reconnect_url;
    twitchLog.warn(`EventSub reconnect requested: ${reconnectUrl}`);
    this.ws?.close();
    this.ws = null;
    await this.connect(reconnectUrl);
  }

  private handleNotification(payload: EventSubNotificationPayload): void {
    if (payload.subscription.type !== CHAT_MESSAGE_SUBSCRIPTION.type) {
      return;
    }
    this.handlers.onChatMessage(payload.event);
  }

  private handleRevocation(payload: EventSubRevocationPayload): void {
    twitchLog.warn(
      `EventSub subscription revoked: type=${payload.subscription.type} status=${payload.subscription.status}`,
    );
    this.subscribed = false;
  }

  private async subscribeChatMessages(sessionId: string): Promise<void> {
    const body = {
      type: CHAT_MESSAGE_SUBSCRIPTION.type,
      version: CHAT_MESSAGE_SUBSCRIPTION.version,
      condition: {
        broadcaster_user_id: this.ids.broadcasterUserId,
        user_id: this.ids.userId,
      },
      transport: {
        method: "websocket",
        session_id: sessionId,
      },
    };

    const response = await this.tokenStore.withHelixAuth((accessToken) =>
      fetch(HELIX_EVENTSUB_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": config.twitch.clientId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );

    if (response.status === 409) {
      twitchLog.info("channel.chat.message subscription already exists.");
      return;
    }

    if (response.status === 429) {
      throw new Error("EventSub subscription rate limited (429)");
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `EventSub subscription failed (${response.status}): ${detail}`,
      );
    }
  }

  private resetKeepalive(timeoutSeconds = 10): void {
    this.clearKeepalive();
    this.keepaliveTimer = setTimeout(() => {
      if (!this.stopped) {
        twitchLog.warn("EventSub keepalive timeout — reconnecting.");
        this.ws?.close();
      }
    }, timeoutSeconds * 1000 + 2000);
  }

  private clearKeepalive(): void {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.stopped) return;
    this.reconnectAttempt += 1;
    const delayMs = Math.min(30_000, 1000 * 2 ** Math.min(this.reconnectAttempt, 5));
    twitchLog.warn(`Reconnecting EventSub WebSocket in ${delayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (!this.stopped) {
      await this.connect(config.twitch.eventsubWebSocketUrl);
    }
  }
}
