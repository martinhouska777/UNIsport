/*
  THE WORDMARK — one mark, two sizes: small in the top bar, large at the top of
  the intro. Written once here so the two can never drift apart.

  Size and weight come from the caller (className); the letters and the italic
  display face belong to the mark itself.

  The second half is the accent colour. In the top bar that is the page's blue;
  in the intro it is whichever school is showing, which is why the caller can
  hand it a different class (`accentClassName`) rather than the mark deciding.
*/
export default function Wordmark({
  className = "",
  accentClassName = "text-l-accent",
}: {
  className?: string;
  accentClassName?: string;
}) {
  return (
    <span className={`font-display italic tracking-tight text-l-text ${className}`}>
      UNI<span className={accentClassName}>sport</span>
    </span>
  );
}
