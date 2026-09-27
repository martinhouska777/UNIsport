/*
  WhatsApp's two ticks on a message you sent: muted until the other person has
  opened the chat, then the success colour. Drawn in the thread (inside your
  bubble) and on the chat list (in front of your last message), so "seen"
  looks the same in both places. Size comes from the caller.
*/
export default function ReadTicks({ seen, className = "" }: { seen: boolean; className?: string }) {
  return (
    <span
      className={`tracking-[-0.2em] ${seen ? "text-success" : "text-muted"} ${className}`}
      aria-label={seen ? "Read" : "Delivered"}
    >
      ✓✓
    </span>
  );
}
