import type { SensorView, IoTDevice } from "../types";

export function buildSensors(devices: IoTDevice[]): SensorView[] {
  return devices.flatMap((device) => {
    if (!device.properties || device.properties.length === 0) {
      return [
        {
          id: `${device.id}-status`,
          device,
          title: device.name,
          value: device.online ? "online" : "offline",
          rawValue: device.online,
          unit: "",
          type: device.type || "device",
          instance: "",
        },
      ];
    }
    return device.properties.map((property, index) => ({
      id: `${device.id}-${property.type || index}`,
      device,
      title: property.name || property.instance || "Датчик",
      value: formatValue(property.state),
      rawValue:
        typeof property.state === "object" &&
        property.state !== null &&
        "value" in property.state
          ? (property.state as Record<string, unknown>).value ?? null
          : null,
      unit: property.unit || "",
      type: property.type || property.instance || "sensor",
      instance: property.instance || "",
    }));
  });
}

export function pickNumber(
  sensors: SensorView[],
  instance: string,
): number | null {
  const matches = sensors.filter(
    (s) =>
      s.instance === instance &&
      typeof s.rawValue === "number" &&
      !Number.isNaN(s.rawValue),
  );
  const climate = matches.find((s) =>
    s.device.type?.includes("sensor.climate"),
  );
  const anySensor =
    climate ?? matches.find((s) => s.device.type?.includes("sensor"));
  const sensor = anySensor ?? matches[0];
  return sensor ? Number(sensor.rawValue) : null;
}

export function getSensorIcon(sensor: SensorView): string {
  if (sensor.instance === "temperature") return "🌡";
  if (sensor.instance === "humidity") return "💧";
  if (sensor.instance === "battery_level") return "🔋";
  if (sensor.instance === "motion") return "◉";
  if (sensor.instance === "open") return "▣";
  if (sensor.instance === "smoke") return "⚠";
  if (sensor.instance === "water_leak") return "≈";
  if (sensor.device.name?.toLowerCase().includes("ламп")) return "☀";
  if (sensor.device.name?.toLowerCase().includes("кондиционер")) return "❄";
  if (sensor.device.name?.toLowerCase().includes("увлажнитель")) return "💧";
  if (sensor.device.name?.toLowerCase().includes("робот")) return "🤖";
  return "📟";
}

export function getWeatherIcon(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("ясно") || d.includes("солн")) return "☀️";
  if (d.includes("перемен") || d.includes("малообл")) return "⛅";
  if (d.includes("облач")) return "☁️";
  if (d.includes("дожд") || d.includes("лив") || d.includes("морось"))
    return "🌧";
  if (d.includes("снег") || d.includes("изморозь")) return "❄️";
  if (d.includes("гроз")) return "⛈";
  if (d.includes("туман")) return "🌫";
  return "🌤";
}

function formatValue(state: unknown): string {
  if (!state || typeof state !== "object") return "нет данных";
  if ("value" in state && (state as Record<string, unknown>).value !== undefined)
    return formatStateValue((state as Record<string, unknown>).value);
  return JSON.stringify(state);
}

function formatStateValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "да" : "нет";
  const labels: Record<string, string> = {
    dry: "сухо",
    wet: "протечка",
    detected: "обнаружено",
    not_detected: "не обнаружено",
    opened: "открыто",
    closed: "закрыто",
    normal: "норма",
    alarm: "тревога",
    low: "низкий",
    high: "высокий",
    pressed: "нажато",
  };
  return labels[String(value)] ?? String(value);
}
