/*
  SKELETONS.
  ------------------------------------------------------------------
  Every loading state in the app was the word "Loading…" centred in an empty
  screen. On campus wifi that word IS the app's first impression, and when the
  data lands the layout jumps from one line of text to a full list.

  A skeleton fixes both: it shows the SHAPE of what's coming, at the geometry of
  the real thing, so nothing moves when the content arrives. The `skeleton`
  class (app/globals.css) does the breathing; these components do the shapes.

  Keep them honest — a skeleton that doesn't match its real card is worse than
  no skeleton, because the jump it causes now comes as a surprise.
*/

function Bar({ w = "100%", h = 10 }: { w?: string; h?: number }) {
  return <span className="skeleton block rounded-sm" style={{ width: w, height: h }} />;
}

/* A list of rows: avatar + two lines. Matches a message row or a person row. */
export function SkeletonRows({ count = 6, avatar = true }: { count?: number; avatar?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-3.5 py-3">
          {avatar && <span className="skeleton h-10 w-10 shrink-0 rounded-full" />}
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Bar w={`${58 + ((i * 13) % 28)}%`} h={11} />
            <Bar w={`${34 + ((i * 17) % 30)}%`} h={9} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* Cards with a photo block on top — the gym card and the varsity session card. */
export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-2.5 px-3 py-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border">
          <div className="skeleton h-24" />
          <div className="flex items-center justify-between gap-3 bg-surface px-3 py-3">
            <Bar w="46%" h={10} />
            <Bar w="18%" h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* A block of text lines, for a screen that's mostly prose or a form. */
export function SkeletonLines({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-2.5 px-4 py-4">
      {Array.from({ length: count }, (_, i) => (
        <Bar key={i} w={i === count - 1 ? "52%" : `${76 + ((i * 11) % 20)}%`} h={11} />
      ))}
    </div>
  );
}
