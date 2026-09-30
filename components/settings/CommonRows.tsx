"use client";

/*
  THE ROWS BOTH SETTINGS HAVE. The student's Settings and Varsity Mode's are
  two different pages (owner, 2026-09-30: one per mode), but how the app looks,
  what it measures in, where notifications are set and the legal pages are the
  same for everyone — so they're written once, here, and each page places them.

  Each returns plain rows (a fragment), so they sit inside the page's own Group
  and share its hairlines.
*/
import { useThemeMode } from "@/components/ThemeMode";
import { useUnits } from "@/components/useUnits";
import { ChoiceRow, DropdownRow, Row } from "@/components/settings/SettingsShell";
import { distanceOptions, weightOptions } from "@/lib/varsity/units";
import { IconBell, IconInfo, IconLock, IconPalette, IconRuler } from "@/components/icons";

// Unit pills show the short unit ("km"); a screen reader hears the full name.
const unitPills = <K extends string>(options: { key: K; label: string; short: string }[]) =>
  options.map((o) => ({ key: o.key, label: o.short, ariaLabel: o.label }));

/* Notifications and Design open pages; Units opens in place. */
export function AppRows() {
  const { mode } = useThemeMode();
  const { units, setUnits } = useUnits();
  return (
    <>
      <Row icon={<IconBell size={20} />} label="Notifications" href="/settings/notifications" />
      <Row
        icon={<IconPalette size={20} />}
        label="Design"
        detail={mode === "dark" ? "Dark" : "Light"}
        href="/settings/design"
      />
      {/* Units — what the app SHOWS, not what it stores: everything is kept in
          metres and kilograms underneath (lib/varsity/units.ts). */}
      <DropdownRow icon={<IconRuler size={20} />} label="Units" detail={`${units.distance} · ${units.weight}`}>
        <ChoiceRow
          label="Distance"
          options={unitPills(distanceOptions)}
          value={units.distance}
          onPick={(distance) => setUnits({ ...units, distance })}
        />
        <ChoiceRow
          label="Weight"
          options={unitPills(weightOptions)}
          value={units.weight}
          onPick={(weight) => setUnits({ ...units, weight })}
        />
      </DropdownRow>
    </>
  );
}

export function LegalRows() {
  return (
    <>
      <Row icon={<IconLock size={20} />} label="Privacy Policy" href="/privacy" />
      <Row icon={<IconInfo size={20} />} label="Terms of Service" href="/terms" />
    </>
  );
}
