import type { SensorView } from "../types";
import { SensorCard } from "./SensorCard";

export function Dashboard({ sensors }: { sensors: SensorView[] }) {
  if (!sensors.length) {
    return (
      <section className="grid">
        <article className="empty">Датчики не найдены</article>
      </section>
    );
  }

  return (
    <section className="grid">
      {sensors.map((sensor) => (
        <SensorCard key={sensor.id} sensor={sensor} />
      ))}
    </section>
  );
}
