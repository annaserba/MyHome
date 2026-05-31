const https = require("node:https");
const http = require("node:http");

let cachedYandexClient = null;
let weatherCache = null;
const WEATHER_CACHE_MS = 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/api/config") {
      return sendJson(res, { port: 4173, networkUrls: getNetworkUrls() });
    }
    if (url.pathname === "/api/iot") {
      return sendJson(res, await getYandexSmartHome());
    }
    if (url.pathname === "/api/weather") {
      return sendJson(res, await getWeather());
    }
    if (url.pathname === "/api/alerts") {
      return sendJson(res, await getAlerts());
    }
    sendJson(res, { error: "Not found" }, 404);
  } catch (error) {
    sendJson(res, { error: error.message || "Server error" }, 500);
  }
};

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(data));
}

async function getYandexSmartHome() {
  const token = process.env.YANDEX_OAUTH_TOKEN;
  if (!token || token === "ВАШ_НОВЫЙ_OAUTH_ТОКЕН") {
    return { ok: false, setupRequired: true, message: "Добавьте YANDEX_OAUTH_TOKEN в переменные окружения", devices: [] };
  }
  try {
    const data = await getYandexViaPackage(token);
    return normalizeYandexResponse(data);
  } catch {
    try {
      const data = await requestJson("https://api.iot.yandex.net/v1.0/user/info", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return normalizeYandexResponse(data);
    } catch (apiError) {
      return { ok: false, message: "Не удалось получить данные Яндекс IoT", devices: [] };
    }
  }
}

async function getYandexViaPackage(token) {
  if (!cachedYandexClient) {
    const YandexIoT = require("yandex-iot-api");
    cachedYandexClient = new YandexIoT(token);
  }
  return cachedYandexClient.getUserInfo();
}

function normalizeYandexResponse(data) {
  const roomsById = new Map((data.rooms || []).map((room) => [room.id, room.name]));
  const devices = (data.devices || []).map((device) => {
    const properties = (device.properties || []).map((property) => ({
      name: getPropertyLabel(property),
      type: property.type || "",
      state: property.state || null,
      unit: getUnitLabel(property.parameters && property.parameters.unit),
      instance: property.parameters && property.parameters.instance ? property.parameters.instance : ""
    }));
    const capabilities = (device.capabilities || []).map((capability) => ({
      type: capability.type || "",
      state: capability.state || null
    }));
    return {
      id: device.id, name: device.name || "Без имени", type: device.type || "",
      room: roomsById.get(device.room) || device.room || "",
      online: device.online !== false, properties, capabilities
    };
  });
  const roomFilter = normalizeText(process.env.ROOM_FILTER || "");
  const filteredDevices = roomFilter
    ? devices
        .filter((device) => normalizeText(device.room).includes(roomFilter))
        .sort((a, b) => {
          const aExact = normalizeText(a.room) === roomFilter;
          const bExact = normalizeText(b.room) === roomFilter;
          return aExact === bExact ? 0 : aExact ? -1 : 1;
        })
    : devices;
  return {
    ok: true, status: data.status || "ok", rooms: data.rooms || [],
    roomFilter: process.env.ROOM_FILTER || "", devices: filteredDevices,
    totalDevices: devices.length, updatedAt: new Date().toISOString()
  };
}

function normalizeText(value) { return String(value || "").trim().toLowerCase(); }

function getPropertyLabel(property) {
  const instance = property.parameters && property.parameters.instance ? property.parameters.instance : "";
  const labels = {
    temperature: "Температура", humidity: "Влажность", battery_level: "Заряд батареи",
    co2_level: "CO₂", pressure: "Давление", illumination: "Освещённость",
    motion: "Движение", open: "Открытие", smoke: "Дым", gas: "Газ",
    water_leak: "Протечка", vibration: "Вибрация", button: "Кнопка"
  };
  return property.name || labels[instance] || labels[property.type] || "Датчик";
}

function getUnitLabel(unit) {
  const units = {
    "unit.temperature.celsius": "°C", "unit.percent": "%", "unit.ppm": "ppm",
    "unit.pressure.mmhg": "мм рт. ст.", "unit.illumination.lux": "лк",
    "unit.volt": "В", "unit.ampere": "А", "unit.watt": "Вт", "unit.kilowatt_hour": "кВт·ч"
  };
  return units[unit] || unit || "";
}

async function getAlerts() {
  var iotData = await getYandexSmartHome();
  if (!iotData.ok) return { alerts: [], message: iotData.message };
  var devices = iotData.devices || [];
  var temp = null, humidity = null, battery = null, acOn = null;

  for (var i = 0; i < devices.length; i++) {
    var d = devices[i];
    var props = d.properties || [];
    var caps = d.capabilities || [];

    if (d.type && d.type.includes("thermostat.ac") && acOn === null) {
      for (var j = 0; j < caps.length; j++) {
        var st = caps[j].state || {};
        if (caps[j].type && caps[j].type.includes("on_off")) acOn = st.value === true;
      }
    }
    if (!d.type || !d.type.includes("sensor.climate")) continue;
    if (temp !== null && humidity !== null && battery !== null) continue;

    for (var k = 0; k < props.length; k++) {
      var p = props[k];
      var val = p.state && p.state.value !== undefined ? Number(p.state.value) : null;
      if (val === null) continue;
      if (p.instance === "temperature" && temp === null) temp = val;
      if (p.instance === "humidity" && humidity === null) humidity = val;
      if (p.instance === "battery_level" && battery === null) battery = val;
    }
  }

  var alerts = [];
  if (temp !== null) {
    if (temp > 24) alerts.push({ text: "\uD83C\uDF21 Температура " + temp + "\u00B0C \u2014 жарко для сна", level: "bad" });
    else if (temp > 22) alerts.push({ text: "\uD83C\uDF21 Температура " + temp + "\u00B0C \u2014 тепловато", level: "warn" });
    else if (temp < 18) alerts.push({ text: "\uD83C\uDF21 Температура " + temp + "\u00B0C \u2014 прохладно", level: "warn" });
  }
  if (humidity !== null) {
    if (humidity < 35) alerts.push({ text: "\uD83D\uDCA7 Влажность " + humidity + "% \u2014 сухой воздух", level: "warn" });
    else if (humidity > 60) alerts.push({ text: "\uD83D\uDCA7 Влажность " + humidity + "% \u2014 слишком влажно", level: "warn" });
  }
  if (battery !== null && battery < 20) alerts.push({ text: "\uD83D\uDD0B Заряд датчика климата " + battery + "%", level: "bad" });
  if (acOn === false && temp !== null && temp > 22) alerts.push({ text: "\u2744 Кондиционер выключен \u2014 включи на охлаждение", level: "warn" });
  if (acOn === false && temp !== null && temp < 18) alerts.push({ text: "\u2744 Кондиционер выключен \u2014 включи на обогрев", level: "warn" });

  return { alerts: alerts, temp: temp, humidity: humidity, battery: battery, acOn: acOn };
}

async function getWeather() {
  const now = Date.now();
  if (weatherCache && now - weatherCache.fetchedAtMs < WEATHER_CACHE_MS) {
    return { ...weatherCache.data, cached: true, cacheAgeMinutes: Math.floor((now - weatherCache.fetchedAtMs) / 60000) };
  }
  const latitude = process.env.WEATHER_LAT || "44.9521";
  const longitude = process.env.WEATHER_LON || "34.1024";
  const city = process.env.WEATHER_CITY || "Симферополь";
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&forecast_days=2&timezone=auto`;

  try {
    const data = await requestJson(apiUrl, { timeout: 5000 });
    const current = data.current || {};
    const daily = data.daily || {};
    const todayCode = current.weather_code ?? daily.weather_code?.[0];
    const result = {
      ok: true, city, cached: false, cacheAgeMinutes: 0,
      current: {
        temperature: round(current.temperature_2m), feelsLike: round(current.apparent_temperature),
        humidity: round(current.relative_humidity_2m), windSpeed: round(current.wind_speed_10m),
        precipitation: round(current.precipitation), description: getWeatherDescription(todayCode)
      },
      today: {
        min: round(daily.temperature_2m_min?.[0]), max: round(daily.temperature_2m_max?.[0]),
        precipitation: round(daily.precipitation_sum?.[0]), description: getWeatherDescription(daily.weather_code?.[0])
      },
      tomorrow: {
        min: round(daily.temperature_2m_min?.[1]), max: round(daily.temperature_2m_max?.[1]),
        precipitation: round(daily.precipitation_sum?.[1]), description: getWeatherDescription(daily.weather_code?.[1])
      }
    };
    weatherCache = { fetchedAtMs: now, data: result };
    return result;
  } catch {
    if (weatherCache) return { ...weatherCache.data, ok: true, cached: true, stale: true, cacheAgeMinutes: Math.floor((now - weatherCache.fetchedAtMs) / 60000) };
    return { ok: false, city, message: "Погода временно недоступна" };
  }
}

function round(value) {
  if (value === undefined || value === null) return null;
  return Math.round(Number(value) * 10) / 10;
}

function getWeatherDescription(code) {
  const descriptions = {
    0: "Ясно", 1: "Преимущественно ясно", 2: "Переменная облачность", 3: "Пасмурно",
    45: "Туман", 48: "Изморозь", 51: "Морось", 53: "Морось", 55: "Сильная морось",
    56: "Ледяная морось", 57: "Сильная ледяная морось", 61: "Небольшой дождь",
    63: "Дождь", 65: "Сильный дождь", 66: "Ледяной дождь", 67: "Сильный ледяной дождь",
    71: "Небольшой снег", 73: "Снег", 75: "Сильный снег", 77: "Снежные зёрна",
    80: "Ливень", 81: "Ливень", 82: "Сильный ливень", 85: "Снегопад", 86: "Сильный снегопад",
    95: "Гроза", 96: "Гроза с градом", 99: "Сильная гроза с градом"
  };
  return descriptions[code] || "Погода";
}

function requestJson(url, options = {}) {
  return requestRaw(url, options).then((text) => JSON.parse(text));
}

function requestRaw(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const body = options.body ? JSON.stringify(options.body) : null;
    const req = client.request(parsed, {
      method: options.method || "GET",
      timeout: options.timeout || 5000,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data || "{}");
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
    });
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function getNetworkUrls() {
  const urls = [];
  if (process.env.PUBLIC_URL) urls.push(process.env.PUBLIC_URL.replace(/\/$/, ""));
  return urls;
}
