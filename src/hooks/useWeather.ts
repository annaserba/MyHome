import { useState, useEffect, useCallback } from "react";
import type { WeatherResponse } from "../types";
import { fetchWeather } from "../lib/api";

export function useWeather(refreshMs = 300000) {
  const [data, setData] = useState<WeatherResponse>({ ok: false });

  const refresh = useCallback(async () => {
    try {
      setData(await fetchWeather());
    } catch {
      setData({ ok: false, message: "Погода недоступна" });
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, refreshMs);
    return () => clearInterval(timer);
  }, [refresh, refreshMs]);

  return data;
}
