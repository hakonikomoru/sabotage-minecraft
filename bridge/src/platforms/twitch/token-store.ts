import { config } from "../../config.js";
import { refreshAccessToken } from "./auth.js";
import { twitchLog } from "./logger.js";

export class TwitchTokenStore {
  private accessToken = config.twitch.accessToken;
  private refreshToken = config.twitch.refreshToken;

  getAccessToken(): string {
    return this.accessToken;
  }

  getRefreshToken(): string {
    return this.refreshToken;
  }

  async getValidAccessToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error("TWITCH_ACCESS_TOKEN is not configured");
    }
    return this.accessToken;
  }

  async refreshIfNeeded(): Promise<string> {
    if (!this.refreshToken) {
      return this.getValidAccessToken();
    }

    try {
      const tokens = await refreshAccessToken(this.refreshToken);
      if (tokens.access_token) {
        this.accessToken = tokens.access_token;
      }
      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token;
      }
      twitchLog.info("Access token refreshed.");
      return this.accessToken;
    } catch (error) {
      twitchLog.error("Access token refresh failed", error);
      throw error;
    }
  }

  async withHelixAuth(
    request: (accessToken: string) => Promise<Response>,
  ): Promise<Response> {
    let response = await request(this.accessToken);
    if (response.status === 401 && this.refreshToken) {
      await this.refreshIfNeeded();
      response = await request(this.accessToken);
    }
    return response;
  }
}
