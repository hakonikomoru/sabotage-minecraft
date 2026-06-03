import {
  http,
  HttpRequest,
  HttpRequestMethod,
  HttpHeader,
} from "@minecraft/server-net";
import { CONFIG } from "./config.js";

function buildHeaders() {
  return [
    new HttpHeader("Content-Type", "application/json"),
    new HttpHeader("X-Bridge-Api-Key", CONFIG.bridge.apiKey),
  ];
}

async function requestJson(path, method = HttpRequestMethod.Get, body) {
  const request = new HttpRequest(`${CONFIG.bridge.baseUrl}${path}`);
  request.method = method;
  request.headers = buildHeaders();
  if (body !== undefined) {
    request.body = JSON.stringify(body);
  }
  const response = await http.request(request);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Bridge HTTP ${response.status}: ${path}`);
  }
  return JSON.parse(response.body ?? "{}");
}

export async function fetchPendingEvents() {
  const data = await requestJson("/api/minecraft/events");
  return Array.isArray(data.events) ? data.events : [];
}

export async function ackEvents(eventIds) {
  if (!eventIds.length) return { acked: 0 };
  return requestJson("/api/minecraft/events/ack", HttpRequestMethod.Post, {
    eventIds,
  });
}

export async function checkBridgeHealth() {
  const request = new HttpRequest(`${CONFIG.bridge.baseUrl}/health`);
  request.method = HttpRequestMethod.Get;
  const response = await http.request(request);
  return response.status === 200;
}
