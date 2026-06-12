import { config } from "../../config.js";

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/authorize";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_VALIDATE_URL = "https://id.twitch.tv/oauth2/validate";
const TWITCH_HELIX_USERS_URL = "https://api.twitch.tv/helix/users";

/** Scopes for BedrockBox Twitch EventSub MVP. Re-OAuth required after scope changes. */
const TWITCH_SCOPES = [
  "user:read:chat",
  "moderator:read:followers",
  "channel:read:subscriptions",
  "channel:read:redemptions",
  "bits:read",
];

export type TwitchTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string[];
  token_type?: string;
};

export type TwitchUser = {
  id: string;
  login: string;
  display_name: string;
};

export function getTwitchAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: config.twitch.clientId,
    redirect_uri: config.twitch.redirectUri,
    response_type: "code",
    scope: TWITCH_SCOPES.join(" "),
  });
  return `${TWITCH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<TwitchTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.twitch.clientId,
    client_secret: config.twitch.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.twitch.redirectUri,
  });

  const response = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twitch token exchange failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as TwitchTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TwitchTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.twitch.clientId,
    client_secret: config.twitch.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twitch token refresh failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as TwitchTokenResponse;
}

export async function validateAccessToken(
  accessToken: string,
): Promise<{ userId: string; login: string; scopes: string[] }> {
  const response = await fetch(TWITCH_VALIDATE_URL, {
    headers: { Authorization: `OAuth ${accessToken}` },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twitch token validation failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    user_id: string;
    login: string;
    scopes: string[];
  };

  return {
    userId: data.user_id,
    login: data.login,
    scopes: data.scopes ?? [],
  };
}

export async function resolveUserByLogin(
  login: string,
  accessToken: string,
): Promise<TwitchUser | null> {
  const url = new URL(TWITCH_HELIX_USERS_URL);
  url.searchParams.set("login", login);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": config.twitch.clientId,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twitch users lookup failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ id: string; login: string; display_name: string }>;
  };

  const user = data.data?.[0];
  if (!user) return null;

  return {
    id: user.id,
    login: user.login,
    display_name: user.display_name,
  };
}
