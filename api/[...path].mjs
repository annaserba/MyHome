import https from "node:https";
import http from "node:http";

let weatherCache = null;
const WEATHER_CACHE_MS = 60 * 60 * 1000;

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/api/config") {
      return sendJson(res, { port: 4173, networkUrls: getNetworkUrls() });
    }
    if (url.pathname === "/api/iot") {
      return sendJson(res, await getIot());
    }
    if (url.pathname === "/api/weather") {
      return sendJson(res, await getWeather());
    }
    if (url.pathname === "/api/alerts") {
      return sendJson(res, await getAlerts());
    }
    sendJson(res, { error: "Not found" }, 404);
  } catch (err) {
    sendJson(res, { error: err.message || "Server error" }, 500);
  }
}

function sendJson(res, data, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(data));
}

async function getIot() {
  const token = process.env.YANDEX_OAUTH_TOKEN;
  if (!token || token === "ВАШ_НОВЫЙ_OAUTH_ТОКЕН") {
    return { ok: false, setupRequired: true, message: "Укажите YANDEX_OAUTH_TOKEN", devices: [] };
  }
  try {
    const data = await requestJson("https://api.iot.yandex.net/v1.0/user/info", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return normalize(data);
  } catch (e) {
    return { ok: false, message: "Не удалось получить данные Яндекс IoT", devices: [] };
  }
}

function normalize(data) {
  const roomsById = new Map((data.rooms || []).map((r) => [r.id, r.name]));
  const devices = (data.devices || []).map((device) => ({
    id: device.id,
    name: device.name || "Без имени",
    type: device.type || "",
    room: roomsById.get(device.room) || device.room || "",
    online: device.online !== false,
    properties: (device.properties || []).map((p) => ({
      name: p.name || p.parameters?.instance || "Датчик",
      type: p.type || "",
      state: p.state || null,
      unit: unitLabel(p.parameters?.unit),
      instance: p.parameters?.instance || "",
    })),
    capabilities: (device.capabilities || []).map((c) => ({
      type: c.type || "",
      state: c.state || null,
    })),
  }));
  const filter = (process.env.ROOM_FILTER || "").trim().toLowerCase();
  const filtered = filter
    ? devices
        .filter((d) => d.room.toLowerCase().includes(filter))
        .sort((a, b) => {
          const aEx = a.room.toLowerCase() === filter;
          const bEx = b.room.toLowerCase() === filter;
          return aEx === bEx ? 0 : aEx ? -1 : 1;
        })
    : devices;
  return { ok: true, devices: filtered, roomFilter: process.env.ROOM_FILTER || "", totalDevices: devices.length };
}

function unitLabel(unit) {
  const u = {
    "unit.temperature.celsius": "°C", "unit.percent": "%", "unit.ppm": "ppm",
    "unit.pressure.mmhg": "мм рт. ст.", "unit.illumination.lux": "лк",
  };
  return u[unit] || unit || "";
}

async function getAlerts() {
  const iot = await getIot();
  if (!iot.ok) return { alerts: [], message: iot.message };
  const devices = iot.devices || [];
  let temp = null, humidity = null, battery = null, acOn = null;

  for (const d of devices) {
    const props = d.properties || [];
    const caps = d.capabilities || [];

    if (d.type?.includes("thermostat.ac") && acOn === null) {
      for (const c of caps) {
        if (c.type?.includes("on_off")) acOn = c.state?.value === true;
      }
    }
    if (!d.type?.includes("sensor.climate")) continue;
    if (temp !== null && humidity !== null && battery !== null) break;

    for (const p of props) {
      const val = p.state?.value != null ? Number(p.state.value) : null;
      if (val === null || isNaN(val)) continue;
      if (p.instance === "temperature" && temp === null) temp = val;
      if (p.instance === "humidity" && humidity === null) humidity = val;
      if (p.instance === "battery_level" && battery === null) battery = val;
    }
  }

  const alerts = [];
  if (temp !== null) {
    if (temp > 24) alerts.push({ text: `🌡 Температура ${temp}°C — жарко для сна`, level: "bad" });
    else if (temp > 22) alerts.push({ text: `🌡 Температура ${temp}°C — тепловато`, level: "warn" });
    else if (temp < 18) alerts.push({ text: `🌡 Температура ${temp}°C — прохладно`, level: "warn" });
  }
  if (humidity !== null) {
    if (humidity < 35) alerts.push({ text: `💧 Влажность ${humidity}% — сухой воздух`, level: "warn" });
    else if (humidity > 60) alerts.push({ text: `💧 Влажность ${humidity}% — слишком влажно`, level: "warn" });
  }
  if (battery !== null && battery < 20) alerts.push({ text: `🔋 Заряд датчика ${battery}%`, level: "bad" });
  if (acOn === false && temp !== null && temp > 22) alerts.push({ text: "❄ Кондиционер выключен — включи на охлаждение", level: "warn" });
  if (acOn === false && temp !== null && temp < 18) alerts.push({ text: "❄ Кондиционер выключен — включи на обогрев", level: "warn" });

  return { alerts, temp, humidity, battery, acOn };
}

async function getWeather() {
  const now = Date.now();
  if (weatherCache && now - weatherCache.at < WEATHER_CACHE_MS) {
    return { ...weatherCache.data, cached: true, cacheAgeMinutes: Math.floor((now - weatherCache.at) / 60000) };
  }
  const lat = process.env.WEATHER_LAT || "44.9521";
  const lon = process.env.WEATHER_LON || "34.1024";
  const city = process.env.WEATHER_CITY || "Симферополь";
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&forecast_days=2&timezone=auto`;

  try {
    const data = await requestJson(apiUrl, { timeout: 6000, headers: { "User-Agent": "MyHome/2.0" } });
    const c = data.current || {};
    const d = data.daily || {};
    const code = c.weather_code ?? d.weather_code?.[0];
    const result = {
      ok: true, city,
      current: {
        temperature: r(c.temperature_2m), feelsLike: r(c.apparent_temperature),
        humidity: r(c.relative_humidity_2m), windSpeed: r(c.wind_speed_10m),
        description: desc(code),
      },
      today: { min: r(d.temperature_2m_min?.[0]), max: r(d.temperature_2m_max?.[0]), precipitation: r(d.precipitation_sum?.[0]) },
      tomorrow: { min: r(d.temperature_2m_min?.[1]), max: r(d.temperature_2m_max?.[1]), precipitation: r(d.precipitation_sum?.[1]) },
    };
    weatherCache = { at: now, data: result };
    return result;
  } catch {
    if (weatherCache) return { ...weatherCache.data, ok: true, cached: true, stale: true };
    return { ok: false, city, message: "Погода временно недоступна" };
  }
}

function r(v) { return v == null ? null : Math.round(Number(v) * 10) / 10; }

function desc(code) {
  const d = { 0: "Ясно", 1: "Преимущественно ясно", 2: "Переменная облачность", 3: "Пасмурно", 45: "Туман", 48: "Изморозь", 51: "Морось", 53: "Морось", 55: "Сильная морось", 61: "Небольшой дождь", 63: "Дождь", 65: "Сильный дождь", 71: "Небольшой снег", 73: "Снег", 75: "Сильный снег", 80: "Ливень", 81: "Ливень", 82: "Сильный ливень", 85: "Снегопад", 86: "Сильный снегопад", 95: "Гроза", 96: "Гроза с градом", 99: "Сильная гроза с градом" };
  return d[code] || "Погода";
}

function requestJson(url, opts = {}) {
  return requestRaw(url, opts).then((t) => JSON.parse(t));
}

function requestRaw(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === "https:" ? https : http;
    const req = client.request(u, {
      method: opts.method || "GET",
      timeout: opts.timeout || 5000,
      headers: { Accept: "application/json", ...(opts.headers || {}) },
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data || "{}");
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
    });
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.on("error", reject);
    req.end();
  });
}

function getNetworkUrls() {
  const urls = [];
  if (process.env.PUBLIC_URL) urls.push(process.env.PUBLIC_URL.replace(/\/$/, ""));
  return urls;
}
