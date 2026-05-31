import type { SensorView, ClimateData, AcState, IoTDevice } from "../types";
import { pickNumber } from "./sensors";

export function getBedroomClimate(
  sensors: SensorView[],
  weather: { current?: { temperature: number | null } } | null,
  devices?: IoTDevice[],
): ClimateData {
  const temperature = pickNumber(sensors, "temperature");
  const humidity = pickNumber(sensors, "humidity");
  const battery = pickNumber(sensors, "battery_level");
  const outdoor = weather?.current?.temperature ?? null;

  const recommendations: string[] = [];
  const recommendationUrgency: boolean[] = [];
  const risks: string[] = [];

  const acState = devices ? getAcState(devices) : null;

  let comfort = "Комфортно";
  let comfortTone: "good" | "warn" | "bad" = "good";
  let sleepScore = 100;

  if (temperature !== null) {
    if (temperature < 18) {
      comfort = "Прохладно";
      comfortTone = "warn";
      sleepScore -= 18;
      if (acState?.on && acState.mode === "heat") {
        push(
          `Кондиционер греет до ${acState.targetTemp}°C — скоро потеплеет.`,
          false,
        );
      } else if (acState?.on) {
        push("Прохладно: выключи охлаждение или переведи кондиционер на обогрев.", true);
      } else {
        push("В спальне прохладно: включи кондиционер на обогрев до 22°C.", true);
      }
    } else if (temperature > 24) {
      comfort = "Жарко";
      comfortTone = "bad";
      sleepScore -= 28;
      if (acState?.on) {
        push(
          `Кондиционер работает — охлаждает до ${acState.targetTemp}°C. Должно стать прохладнее.`,
          false,
        );
      } else {
        push("Для сна жарковато: включи кондиционер на 22–23°C.", true);
      }
    } else if (temperature > 22) {
      comfort = "Тепло";
      comfortTone = "warn";
      sleepScore -= 8;
      if (acState?.on) {
        push(
          `Кондиционер охлаждает до ${acState.targetTemp}°C, скоро будет комфортно.`,
          false,
        );
      } else {
        push("Немного тепло: включи кондиционер на 22°C или проветри.", true);
      }
    } else {
      if (acState?.on) {
        push(
          `Кондиционер поддерживает ${acState.targetTemp}°C — климат в норме.`,
          false,
        );
      } else {
        push("Температура спальни подходит для сна.", false);
      }
    }
  } else {
    comfort = "Нет температуры";
    comfortTone = "warn";
    push("Не вижу датчик температуры спальни.", true);
  }

  if (humidity !== null) {
    if (humidity < 35) {
      comfortTone = comfortTone === "bad" ? "bad" : "warn";
      sleepScore -= 18;
      risks.push("сухой воздух");
      push("Воздух сухой: включи увлажнитель.", true);
    } else if (humidity > 60) {
      comfortTone = comfortTone === "bad" ? "bad" : "warn";
      sleepScore -= 15;
      risks.push("высокая влажность");
      push("Влажность высокая: проветри комнату или включи осушение.", true);
    } else {
      push("Влажность в норме для сна.", false);
    }
  } else {
    comfortTone = comfortTone === "bad" ? "bad" : "warn";
    push("Не вижу датчик влажности спальни.", true);
  }

  if (battery !== null && battery < 20) {
    risks.push("низкий заряд датчика");
    push("У датчика климата низкий заряд батареи.", true);
  }

  if (outdoor !== null && temperature !== null) {
    const delta = Math.round((temperature - outdoor) * 10) / 10;
    if (outdoor < temperature - 2 && temperature > 22) {
      push(
        `На улице прохладнее на ${delta}°C: проветривание быстро снизит температуру.`,
        false,
      );
    }
    if (outdoor > temperature && temperature > 23) {
      push("На улице теплее, проветривание сейчас не охладит спальню.", false);
    }
  }

  if (!risks.length) risks.push("критичных рисков нет");
  if (!recommendations.length)
    push("Сценарий нормальный, ничего делать не нужно.", false);

  function push(text: string, urgent: boolean) {
    recommendations.push(text);
    recommendationUrgency.push(urgent);
  }

  return {
    temperature,
    humidity,
    battery,
    outdoor,
    comfort,
    comfortTone,
    sleepScore: Math.max(0, Math.min(100, sleepScore)),
    risks,
    recommendations: recommendations.slice(0, 3),
    recommendationUrgency: recommendationUrgency.slice(0, 3),
    acState,
  };
}

export function getAcState(devices: IoTDevice[]): AcState | null {
  const ac = devices.find((d) => d.type?.includes("thermostat.ac"));
  if (!ac || !ac.capabilities) return null;

  let on = true;
  let targetTemp: number | null = null;
  let mode = "auto";

  for (const cap of ac.capabilities) {
    const st = (cap.state as Record<string, unknown>) ?? {};
    if (cap.type?.includes("on_off")) {
      on = st.value === true;
    }
    if (cap.type?.includes("range") && st.instance === "temperature") {
      targetTemp = Number(st.value);
    }
    if (cap.type?.includes("mode") && st.instance === "thermostat") {
      mode = String(st.value ?? "auto");
    }
  }

  return { on, targetTemp, mode };
}

export function getHumidityLabel(value: number | null): string {
  if (value === null) return "Нет данных";
  if (value < 35) return "Сухо";
  if (value > 60) return "Влажно";
  return "Норма";
}
