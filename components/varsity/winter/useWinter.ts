"use client";

/*
  The published winter points and its standings, for the athlete's screens:
  the Profile row, the standings page, the Log screen and the Calendar's day.
  The config is read once per team (winterPointsStore keeps it); the team's
  sessions and names only where the standings are drawn.
*/
import { useEffect, useMemo, useState } from "react";
import {
  curWeek,
  eventPeople,
  isoToday,
  scoreAll,
  type Scores,
  type WinterPoints,
  type WpLog,
  type WpPerson,
} from "@/lib/varsity/winterPoints";
import { fetchWinterConfig, fetchWinterLogs, fetchWinterPeople } from "@/lib/varsity/winterPointsStore";

/** `teamId` undefined = not known yet (nothing is asked). */
export function useWinterConfig(teamId: string | null | undefined) {
  const [state, setState] = useState<{ teamId: string | null | undefined; config: WinterPoints | null; ready: boolean }>({
    teamId,
    config: null,
    ready: false,
  });
  if (state.teamId !== teamId) setState({ teamId, config: null, ready: false });
  useEffect(() => {
    if (teamId === undefined) return;
    let active = true;
    fetchWinterConfig(teamId).then((config) => {
      if (active) setState({ teamId, config, ready: true });
    });
    return () => {
      active = false;
    };
  }, [teamId]);
  return { config: state.config, ready: state.ready };
}

export type Standings = {
  ready: boolean;
  today: string;
  cur: number;
  people: Record<string, WpPerson>;
  scores: Scores;
};

/** Everyone's points, from the team's sessions in the event's dates. Pass a null config to ask nothing. */
export function useWinterStandings(
  teamId: string | null | undefined,
  userId: string | null,
  config: WinterPoints | null,
): Standings {
  const today = isoToday();
  const [data, setData] = useState<{ key: string; people: Record<string, WpPerson>; logs: Record<string, WpLog[]> } | null>(
    null,
  );
  const key = config && teamId !== undefined ? `${teamId}|${config.start}|${config.end}` : "";
  useEffect(() => {
    if (!config || teamId === undefined) return;
    let active = true;
    const to = config.end < today ? config.end : today;
    Promise.all([fetchWinterPeople(teamId), fetchWinterLogs(teamId, userId, config.start, to)]).then(
      ([people, logs]) => {
        if (active) setData({ key, people, logs });
      },
    );
    return () => {
      active = false;
    };
    // `key` carries the team and the dates; the config object changes identity on every read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId, today]);
  const ready = !!data && data.key === key;
  const scores = useMemo(
    () => (config && ready && data ? scoreAll(config, eventPeople(config), data.logs, today) : {}),
    [config, ready, data, today],
  );
  return {
    ready,
    today,
    cur: config ? curWeek(config, today) : 0,
    people: ready && data ? data.people : {},
    scores,
  };
}
