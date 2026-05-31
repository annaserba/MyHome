import type { ClimateData, WeatherResponse } from "../types";
import { getWeatherIcon } from "../lib/sensors";
import { getHumidityLabel } from "../lib/climate";

interface Props {
  climate: ClimateData;
  weather: WeatherResponse;
}

const MODE_LABEL: Record<string, string> = {
  auto: "авто",
  cool: "охлаждение",
  heat: "обогрев",
  dry: "осушение",
  fan_only: "вентиляция",
};

function fmt(value: number | null | undefined): string {
  if (value == null) return "--";
  return `${Math.round(value)}°C`;
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return "--";
  return `${value}%`;
}

export function ClimateHero({ climate, weather }: Props) {
  const w = weather;
  const desc = w.current?.description ?? "Погода";

  return (
    <section className={`climateHero ${climate.comfortTone}`}>
      <div className="heroPrimary">
        <span className="heroIcon">🌡</span>
        <div>
          <p className="eyebrow">Спальня</p>
          <strong>{fmt(climate.temperature)}</strong>
          <span>
            {climate.comfort} · 😴 {climate.sleepScore}/100
          </span>
        </div>
      </div>

      <div className="heroWeather">
        <span className="heroIcon">💧</span>
        <div>
          <p className="eyebrow">Влажность</p>
          <strong>{fmtPct(climate.humidity)}</strong>
          <span>{getHumidityLabel(climate.humidity)}</span>
        </div>
      </div>

      <div className="heroWeather">
        <span className="heroIcon">{getWeatherIcon(desc)}</span>
        <div>
          <p className="eyebrow">{weather.city || "На улице"}</p>
          <strong>{fmt(w.current?.temperature)}</strong>
          <span>
            💧{fmtPct(w.current?.humidity)} · 💨{" "}
            {w.current?.windSpeed != null
              ? `${w.current.windSpeed} м/с`
              : "--"}
          </span>
        </div>
      </div>

      {climate.acState && (
        <div className="heroWeather">
          <span className="heroIcon">❄</span>
          <div>
            <p className="eyebrow">Кондиционер</p>
            <strong>
              {climate.acState.on
                ? fmt(climate.acState.targetTemp)
                : "выкл"}
            </strong>
            <span>
              {climate.acState.on
                ? MODE_LABEL[climate.acState.mode] ||
                  climate.acState.mode
                : "не работает"}
            </span>
          </div>
        </div>
      )}

      <div className="recommendations">
        {climate.recommendations.map((text, i) => (
          <p
            key={i}
            className={climate.recommendationUrgency[i] ? "action" : ""}
          >
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}
