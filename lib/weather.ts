/*
  THE WEATHER ON THE TEAM'S WATER: wind and UV right now, what a rower
  checks before going out (owner, 2026-10-16: "weather and wind speed etc
  this is what rowers look for and uv status").

  From Open-Meteo: no key, called straight from the phone. Where and in which
  units is the school's data (lib/themes.ts `water`). One fetch per place per
  page load; the numbers only move every 15 minutes.

  The full forecast is Windy's page for the same point, the way a gym's
  address opens Google Maps (lib/gyms.ts gymMapsUrl): wind, gusts and where
  it comes from, hour by hour, on any phone or laptop.
*/

export type WeatherUnits = "us" | "metric";

export type WeatherNow = {
  /** mph or km/h, as asked */
  wind: number;
  /** Where the wind comes FROM, degrees (0 = north). */
  dir: number;
  uv: number;
  /** "mph" or "km/h" */
  speed: string;
};

const cache = new Map<string, Promise<WeatherNow | null>>();

export function fetchWeather(lat: number, lon: number, units: WeatherUnits): Promise<WeatherNow | null> {
  const key = `${lat},${lon},${units}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=wind_speed_10m,wind_direction_10m,uv_index` +
    (units === "us" ? "&wind_speed_unit=mph" : "");
  const p = fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const c = j?.current;
      if (!c) return null;
      return {
        wind: c.wind_speed_10m,
        dir: c.wind_direction_10m,
        uv: c.uv_index,
        speed: units === "us" ? "mph" : "km/h",
      };
    })
    .catch(() => null);
  cache.set(key, p);
  // A failed fetch is tried again next time instead of being remembered.
  p.then((w) => {
    if (!w) cache.delete(key);
  });
  return p;
}

/** Windy's forecast for the point, the full picture one tap away. */
export const windyUrl = (lat: number, lon: number) =>
  `https://www.windy.com/${lat.toFixed(3)}/${lon.toFixed(3)}?${lat.toFixed(3)},${lon.toFixed(3)},12`;
