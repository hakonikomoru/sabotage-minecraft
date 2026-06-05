import {
  http,
  HttpRequest,
  HttpRequestMethod,
  HttpHeader,
} from "@minecraft/server-net";
import { CONFIG } from "../config.js";

function buildHeaders(gameState) {
  const headers = [
    new HttpHeader("Content-Type", "application/json"),
    new HttpHeader("X-Bridge-Api-Key", CONFIG.bridge.apiKey),
  ];
  if (gameState) {
    headers.push(new HttpHeader("X-Sab-Game-State", gameState));
  }
  return headers;
}

async function requestJson(path, method = HttpRequestMethod.Get, body, gameState) {
  const request = new HttpRequest(`${CONFIG.bridge.baseUrl}${path}`);
  request.method = method;
  request.headers = buildHeaders(gameState);
  if (body !== undefined) {
    request.body = JSON.stringify(body);
  }
  const response = await http.request(request);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Bridge HTTP ${response.status}: ${path}`);
  }
  return JSON.parse(response.body ?? "{}");
}

export async function fetchPendingEvents(gameState) {
  const data = await requestJson("/api/minecraft/events", HttpRequestMethod.Get, undefined, gameState);
  return Array.isArray(data.events) ? data.events : [];
}

export async function ackEvents(eventIds, gameState) {
  if (!eventIds.length) return { acked: 0 };
  return requestJson("/api/minecraft/events/ack", HttpRequestMethod.Post, {
    eventIds,
  }, gameState);
}

export async function checkBridgeHealth() {
  try {
    const request = new HttpRequest(`${CONFIG.bridge.baseUrl}/health`);
    request.method = HttpRequestMethod.Get;
    const response = await http.request(request);
    return response.status === 200;
  } catch {
    return false;
  }
}
