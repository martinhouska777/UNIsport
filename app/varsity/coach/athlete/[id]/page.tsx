/*
  One athlete's training, inside the Coach Console.
  Reached from the Squad list on the Team screen. The console layout already
  gates the whole area to an approved coach or captain; the DATABASE is what
  decides whether the numbers on this page come back at all (a captain gets an
  empty calendar here, by design — see db/varsity_coach_reads.sql).
*/
import AthleteDataScreen from "@/components/varsity/coach/athlete/AthleteDataScreen";

export default async function CoachAthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AthleteDataScreen athleteId={id} />;
}
