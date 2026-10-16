"use client";

/*
  THE WEATHER CHIP on Varsity Home: the wind and the UV at the boathouse,
  beside the settings cog (owner, 2026-10-16, picked "D" of five places:
  "I want the D just in short"). Short on purpose: the arrow, the speed and
  the UV, nothing else.

  A tap opens the full forecast, the way a gym's address opens a map ("could
  it have link to weather? like we had link to maps in student mode").

  The arrow points where the wind blows TO, as Windy's arrows do. Wind is
  never coloured as calm or rough: no traffic lights. A school with no
  `water` (lib/themes.ts) shows nothing.
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import { fetchWeather, windyUrl, type WeatherNow } from "@/lib/weather";
import { IconSun } from "@/components/icons";

export default function WeatherChip() {
  const { universityKey } = useAppState();
  const water = getUniversity(universityKey)?.water;
  const [w, setW] = useState<WeatherNow | null>(null);

  useEffect(() => {
    if (!water) return;
    let live = true;
    fetchWeather(water.lat, water.lon, water.units).then((x) => {
      if (live) setW(x);
    });
    return () => {
      live = false;
    };
  }, [water]);

  if (!water || !w) return null;

  return (
    <a
      href={windyUrl(water.lat, water.lon)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Weather"
      className="press-icon flex flex-shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold tabular-nums text-text"
    >
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="flex-shrink-0 text-primary"
        style={{ transform: `rotate(${w.dir + 180}deg)` }}
      >
        <path d="M12 20V4M5 11l7-7 7 7" />
      </svg>
      {Math.round(w.wind)} {w.speed}
      <IconSun size={13} className="ml-1.5 flex-shrink-0 text-accent" />
      UV {Math.round(w.uv)}
    </a>
  );
}
