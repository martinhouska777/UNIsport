/*
  What a closer offers the flow that runs it (components/landing/StoryCloser.tsx):
  where its phone is, and the four moments of its arrival and departure. Both
  closers implement this; the flow never knows which one it is talking to.
*/
export type CloserHandle = {
  /** The section element. */
  el: () => HTMLElement | null;
  /** The phone's rect on screen right now. */
  phoneRect: () => DOMRect | null;
  /** Where the phone's centre will be, in viewport coordinates, ONCE THE
      SECTION IS PINNED — the flight's landing target, known before the page
      has got there. */
  phoneTarget: () => { x: number; y: number; w: number } | null;
  /** Before arrival: put everything away. "hide" = the phone is invisible
      because the page's phone will fly in and land on it; "pre" = the phone
      is parked for its own slide-in entrance. */
  prime: (mode: "hide" | "pre") => void;
  /** The flight has landed: switch the phone on where it stands and play the
      rest — letter out / oars up, words in, then the cycle starts. */
  arriveAfterFlight: () => void;
  /** No flight (narrow screen, reduced motion, or a jump from elsewhere):
      the phone slides in, then the rest. */
  arriveInPlace: () => void;
  /** The way back, first act: words leave, letter home / oars gather and
      sink. Resolves when the act is over and the flight home may start. */
  retract: () => Promise<void>;
  /** Hide the phone for the flight home (the page's phone takes over). */
  setPhoneHidden: (hidden: boolean) => void;
  /** Scrolled back above it: put it away so coming back plays it again. */
  rewind: () => void;
};
