import type { SensorView } from "../types";
import { getSensorIcon } from "../lib/sensors";

export function SensorCard({ sensor }: { sensor: SensorView }) {
  const { device } = sensor;
  return (
    <article className="sensor">
      <div className="sensorHead">
        <span className={device.online ? "pill ok" : "pill"}>
          {getSensorIcon(sensor)} {device.online ? "online" : "offline"}
        </span>
        <span className="room">{device.room || "Без комнаты"}</span>
      </div>
      <h2>{device.name}</h2>
      <p className="sensorType">{sensor.title}</p>
      <div className="reading">
        <strong>{sensor.value}</strong>
        {sensor.unit && <span>{sensor.unit}</span>}
      </div>
    </article>
  );
}
