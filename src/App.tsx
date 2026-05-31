import { useMemo } from "react";
import { useIot } from "./hooks/useIot";
import { useWeather } from "./hooks/useWeather";
import { getBedroomClimate } from "./lib/climate";
import { buildSensors } from "./lib/sensors";
import { ClimateHero } from "./components/ClimateHero";
import { WeatherPanel } from "./components/WeatherPanel";
import { Dashboard } from "./components/Dashboard";
import { SetupPanel } from "./components/SetupPanel";
import "./styles/index.css";

export function App() {
  const { data: iot, status, refresh } = useIot();
  const weather = useWeather();

  const sensors = useMemo(
    () => buildSensors(iot.devices || []),
    [iot.devices],
  );
  const climate = useMemo(
    () => getBedroomClimate(sensors, weather, iot.devices),
    [sensors, weather, iot.devices],
  );

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">MyHome</p>
          <h1>{iot.roomFilter || "Панель датчиков"}</h1>
        </div>
        <div className="actions">
          <button
            onClick={() => refresh()}
            className="iconButton"
            title="Обновить"
          >
            ↻
          </button>
        </div>
      </section>

      <section className="statusBand">
        <div>
          <span className={iot.ok ? "dot live" : "dot"} />
          <span>
            {iot.roomFilter
              ? `${status} · фильтр: ${iot.roomFilter}`
              : status}
          </span>
        </div>
      </section>

      {iot.setupRequired ? (
        <SetupPanel />
      ) : (
        <>
          <WeatherPanel weather={weather} />
          <ClimateHero climate={climate} weather={weather} />
          <Dashboard sensors={sensors} />
        </>
      )}
    </main>
  );
}
