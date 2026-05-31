import type { WeatherResponse } from "../types";

function fmt(v: number | null | undefined): string {
  if (v == null) return "--";
  return `${Math.round(v)}°C`;
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return "--";
  return `${v}%`;
}
function fmtNum(v: number | null | undefined, unit: string): string {
  if (v == null) return "--";
  return `${v} ${unit}`;
}
function fmtAge(min?: number | null): string {
  if (min == null || min <= 0) return "сейчас";
  return `${min} мин назад`;
}

interface Props {
  weather: WeatherResponse;
}

export function WeatherPanel({ weather }: Props) {
  if (!weather.ok || !weather.current) {
    return (
      <section className="weatherBand">
        <strong>{weather.message || "Погода загружается"}</strong>
        <span>Open-Meteo</span>
      </section>
    );
  }

  return (
    <section className="weatherBand">
      <div>
        <span className="weatherCity">{weather.city || "Погода"}</span>
        <strong>{fmt(weather.current.temperature)}</strong>
        <span>
          {weather.current.description} · {fmtAge(weather.cacheAgeMinutes)}
        </span>
      </div>
      <div>
        <span>ощущается {fmt(weather.current.feelsLike)}</span>
        <span>влажность {fmtPct(weather.current.humidity)}</span>
        <span>ветер {fmtNum(weather.current.windSpeed, "")}</span>
      </div>
      {weather.today && (
        <div>
          <span>
            сегодня {fmt(weather.today.min)} / {fmt(weather.today.max)}
          </span>
          <span>
            осадки {fmtNum(weather.today.precipitation, "мм")}
          </span>
        </div>
      )}
    </section>
  );
}
