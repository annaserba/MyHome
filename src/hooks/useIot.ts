import { useState, useEffect, useCallback } from "react";
import type { IoTResponse } from "../types";
import { fetchIot } from "../lib/api";

export function useIot(refreshMs = 15000) {
  const [data, setData] = useState<IoTResponse>({
    ok: false,
    devices: [],
  });
  const [status, setStatus] = useState("Загрузка");

  const refresh = useCallback(async () => {
    try {
      const result = await fetchIot();
      setData(result);
      setStatus(
        result.ok
          ? `Обновлено ${new Date().toLocaleTimeString("ru-RU")}`
          : result.message || "Данные недоступны",
      );
      return result;
    } catch {
      setStatus("Нет связи с сервером");
      return { ok: false, devices: [] } as IoTResponse;
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, refreshMs);
    return () => clearInterval(timer);
  }, [refresh, refreshMs]);

  return { data, status, refresh };
}
