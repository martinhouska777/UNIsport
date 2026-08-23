/*
  THE WORDMARK — one mark, two sizes: small in the top bar, large at the top of
  the intro. Written once here so the two can never drift apart.

  Size and weight come from the caller (className); the letters, the italic
  display face and the blue half belong to the mark itself.
*/
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display italic tracking-tight text-l-text ${className}`}>
      UNI<span className="text-l-accent">sport</span>
    </span>
  );
}
