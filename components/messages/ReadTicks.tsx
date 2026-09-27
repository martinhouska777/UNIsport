import type { TickState } from "@/lib/supabase/messages";

/*
  WhatsApp's ticks on a message you sent (owner, 2026-09-27: "copy what
  WhatsApp has", all three steps):
    sent       one grey tick
    delivered  two grey ticks — their app has checked in since
    read       two ticks in the SCHOOL'S colour — they have opened the chat
  WhatsApp's read ticks are blue; here they are the school's own colour
  (owner: "you can do it in each university's color"), so Harvard's are
  crimson and Yale's blue with no code per school — `primary-live`, the tap
  colour, which each theme lifts until it reads on its own ground (rule 1).

  Drawn in the thread (inside your bubble) and on the chat list (in front of
  your last message), so the state looks the same in both places. The second
  tick hides its short stroke behind the first, the way WhatsApp's does.
*/
const LABEL: Record<TickState, string> = { sent: "Sent", delivered: "Delivered", read: "Read" };

export default function ReadTicks({
  state,
  size = 11,
  className = "",
}: {
  state: TickState;
  /** height in px; the width follows */
  size?: number;
  className?: string;
}) {
  const two = state !== "sent";
  return (
    <svg
      viewBox={`0 0 ${two ? 17 : 12.5} 11`}
      height={size}
      width={(size * (two ? 17 : 12.5)) / 11}
      role="img"
      aria-label={LABEL[state]}
      className={`inline-block shrink-0 ${state === "read" ? "text-primary-live" : "text-muted"} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.4 5.9 L4.9 9.3 L11.3 1.8" />
      {two && <path d="M8.2 8.2 L9.3 9.3 L15.7 1.8" />}
    </svg>
  );
}
