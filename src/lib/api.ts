import type { IoTResponse, WeatherResponse, ConfigResponse } from "../types";

const BASE = "";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export function fetchConfig() {
  return fetchJson<ConfigResponse>("/api/config");
}

export function fetchIot() {
  return fetchJson<IoTResponse>("/api/iot");
}

export function fetchWeather() {
  return fetchJson<WeatherResponse>("/api/weather");
}
