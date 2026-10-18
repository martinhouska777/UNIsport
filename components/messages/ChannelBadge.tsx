"use client";

/*
  A COMMUNITY CHANNEL'S MARK — a solid circle in the channel's own colour with
  a white icon (owner, 2026-10-18, direction D: "like Apple Reminders lists").
  The same mark in the channel list, the chat's header and Channel info, so a
  channel is recognised by its colour wherever you meet it. The colours are
  data (lib/channelLook.ts).
*/
import type { ReactElement } from "react";
import {
  IconActivity,
  IconBarbell,
  IconBulb,
  IconMessage,
  IconRun,
  IconStar,
} from "@/components/icons";
import { channelColours } from "@/lib/channelLook";

// Channel icon keys (seeded in db/messages.sql) → icon components.
const CHANNEL_ICONS: Record<string, (p: { size?: number }) => ReactElement> = {
  barbell: IconBarbell,
  bulb: IconBulb,
  activity: IconActivity,
  star: IconStar,
  run: IconRun,
};

export default function ChannelBadge({
  icon,
  channelId,
  size,
}: {
  icon: string;
  channelId: string;
  /** The circle's width and height in px; the icon is drawn at about 45% of it. */
  size: number;
}) {
  const Glyph = CHANNEL_ICONS[icon] ?? IconMessage;
  const { bg, fg } = channelColours(icon, channelId);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full [&_svg]:stroke-[2.2]"
      style={{ width: size, height: size, background: bg, color: fg }}
    >
      <Glyph size={Math.round(size * 0.45)} />
    </div>
  );
}
