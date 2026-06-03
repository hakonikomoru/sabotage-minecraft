import { google } from "googleapis";
import { config } from "../../config.js";
import { logger } from "../../logs/logger.js";

let oauthClient: InstanceType<typeof google.auth.OAuth2> | null = null;

export function getOAuthClient() {
  if (!oauthClient) {
    oauthClient = new google.auth.OAuth2(
      config.youtube.clientId,
      config.youtube.clientSecret,
      config.youtube.redirectUri,
    );
    oauthClient.setCredentials({
      refresh_token: config.youtube.refreshToken,
    });
  }
  return oauthClient;
}

export function getYoutubeClient() {
  return google.youtube({
    version: "v3",
    auth: getOAuthClient(),
  });
}

export async function resolveLiveChatId(
  liveVideoId: string,
): Promise<string | null> {
  const youtube = getYoutubeClient();
  const response = await youtube.videos.list({
    part: ["liveStreamingDetails"],
    id: [liveVideoId],
  });

  const liveChatId =
    response.data.items?.[0]?.liveStreamingDetails?.activeLiveChatId ?? null;

  if (!liveChatId) {
    logger.warn(`No active live chat for video ${liveVideoId}`);
  }

  return liveChatId ?? null;
}

export function getAuthUrl(): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.readonly"],
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  return tokens;
}
