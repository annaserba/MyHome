export interface ConfigResponse {
  networkUrls: string[];
}

export interface IoTResponse {
  ok: boolean;
  setupRequired?: boolean;
  message?: string;
  roomFilter?: string;
  devices: IoTDevice[];
  totalDevices?: number;
  updatedAt?: string;
}

export interface IoTDevice {
  id: string;
  name: string;
  type: string;
  room: string;
  online: boolean;
  properties: IoTProperty[];
  capabilities?: IoTProperty[];
}

export interface IoTProperty {
  name: string;
  type: string;
  state: unknown;
  unit: string;
  instance: string;
}

export interface WeatherResponse {
  ok: boolean;
  city?: string;
  message?: string;
  cached?: boolean;
  stale?: boolean;
  cacheAgeMinutes?: number;
  current?: {
    temperature: number | null;
    feelsLike: number | null;
    humidity: number | null;
    windSpeed: number | null;
    precipitation: number | null;
    description: string;
  };
  today?: {
    min: number | null;
    max: number | null;
    precipitation: number | null;
    description: string;
  };
}

export interface SensorView {
  id: string;
  device: IoTDevice;
  title: string;
  value: string;
  rawValue: unknown;
  unit: string;
  type: string;
  instance: string;
}

export interface ClimateData {
  temperature: number | null;
  humidity: number | null;
  battery: number | null;
  outdoor: number | null;
  comfort: string;
  comfortTone: "good" | "warn" | "bad";
  sleepScore: number;
  risks: string[];
  recommendations: string[];
  recommendationUrgency: boolean[];
  acState: AcState | null;
}

export interface AcState {
  on: boolean;
  targetTemp: number | null;
  mode: string;
}
