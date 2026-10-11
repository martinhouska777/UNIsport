/*
  GET /api/calendar/plan/<planId>
  The calendar file for one accepted session — the "Apple Calendar" choice on a
  plan card. Opening it on an iPhone shows the calendar's own "Add" sheet.

  It reads the plan as the signed-in student (my_upcoming_plans), so it only
  ever answers for a session they are in, and it says what the plan says now
  rather than what a link was built with.
*/
import { createClient } from "@/lib/supabase/server";
import { icsFile, planEvent } from "@/lib/calendarEvent";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_upcoming_plans");
  if (error) return new Response("Sign in to UNIsport first.", { status: 401 });

  const row = (data as Record<string, unknown>[]).find((r) => r.plan_id === id);
  if (!row) return new Response("This session isn't coming up any more.", { status: 404 });

  const ics = icsFile(
    planEvent({
      planId: id,
      activity: row.activity as string,
      otherName: (row.other_name as string) ?? "Member",
      place: (row.place as string) ?? null,
      scheduledAt: row.scheduled_at as string,
    }),
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="unisport-session.ics"',
      "Cache-Control": "no-store",
    },
  });
}
