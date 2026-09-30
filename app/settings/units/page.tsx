"use client";

/*
  SETTINGS → UNITS. What the app SHOWS, not what it stores: everything is kept
  in metres and kilograms underneath (lib/varsity/units.ts), so switching is
  only ever a change of display. Both option lists are data.
*/
import { useUnits } from "@/components/useUnits";
import { ChoiceRow, SettingsBody, SettingsHeader } from "@/components/settings/SettingsShell";
import { distanceOptions, weightOptions } from "@/lib/varsity/units";

// The pills show the short unit ("km"); a screen reader hears the full name.
const pills = <K extends string>(options: { key: K; label: string; short: string }[]) =>
  options.map((o) => ({ key: o.key, label: o.short, ariaLabel: o.label }));

export default function UnitsSettingsPage() {
  const { units, setUnits } = useUnits();

  return (
    <>
      <SettingsHeader title="Units" />
      <SettingsBody>
        <div className="flex flex-col gap-2 px-3.5 py-4">
          <ChoiceRow
            label="Distance"
            options={pills(distanceOptions)}
            value={units.distance}
            onPick={(distance) => setUnits({ ...units, distance })}
          />
          <ChoiceRow
            label="Weight"
            options={pills(weightOptions)}
            value={units.weight}
            onPick={(weight) => setUnits({ ...units, weight })}
          />
        </div>
      </SettingsBody>
    </>
  );
}
