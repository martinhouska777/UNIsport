"use client";

/*
  HOW POINTS WORK — the rules, behind the ⓘ in the corner.
  ---------------------------------------------------------------------------
  These used to be five bullet points pinned under every board, which is a poor
  trade twice over: everybody scrolls past them forever after reading them once,
  and there is never room to say the thing properly. Behind a button they can be
  complete.

  EVERY NUMBER IN HERE IS READ FROM lib/points.ts. Nothing is retyped, so the
  rules cannot drift out of step with what the boards actually pay — which
  would be worse than having no rules screen at all.

  Same chrome as OptionPickerSheet (bottom sheet, handle, X, backdrop) so the
  two things this screen can open feel like one app.
*/
import { IconX } from "@/components/icons";
import { DAILY_SESSION_CAP, sessionPoints } from "@/lib/points";
import { MIN_GROUP_MEMBERS } from "@/lib/leaderboards";
import { honorCodeFor } from "@/lib/honorCode";

function Rate({ points, what }: { points: number; what: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5">
      <span className="flex h-9 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-tint text-[14px] font-semibold text-primary">
        {points}
      </span>
      <span className="text-[13px] leading-snug text-text">{what}</span>
    </div>
  );
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[13px] font-medium text-text">{title}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

export default function ScoringSheet({
  universityKey,
  onClose,
}: {
  universityKey: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative flex max-h-[85%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div>
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <div>
              <div className="text-[15px] font-medium text-text">How points work</div>
              <div className="mt-0.5 text-[11px] text-muted">Every session is worth something.</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Rate points={sessionPoints.solo} what="A session on your own." />
            <Rate points={sessionPoints.partner} what="With someone you've trained with before." />
            <Rate
              points={sessionPoints.newPartner}
              what="With someone you've never trained with before."
            />
          </div>

          <p className="text-[12px] leading-relaxed text-muted">
            That is the whole scoring system. Training with people is worth more because
            that is what this app is for — the fastest way up any board is to bring
            somebody along, and the very fastest is to train with somebody new.
          </p>

          <div className="h-px bg-border" />

          <div className="flex flex-col gap-3.5">
            <Rule title="A partner has to be a real person">
              They have to be picked from the app, so they have an account and can see the
              session on their own calendar. A name typed into a box scores nothing.
            </Rule>

            <Rule title={`${DAILY_SESSION_CAP} sessions a day, at most`}>
              Anything past the {DAILY_SESSION_CAP === 2 ? "second" : `${DAILY_SESSION_CAP}th`}{" "}
              session in one day earns nothing, and when a day holds more than that, the
              most valuable ones are the ones that count. Otherwise the board is won by
              whoever taps Log Session the most times in an evening.
            </Rule>

            <Rule title="The boards reset">
              Every month everyone starts level again, so the table is always still
              winnable. All time is the one that never resets — that one is the record,
              not the race.
            </Rule>

            <Rule title="Houses and dorms are ranked per member">
              Points divided by everyone who lives there, not the total — otherwise the
              biggest house wins every month forever. It also means a few very keen people
              can&rsquo;t carry a house on their own: getting more of you logging is the
              only way the number moves. A house needs {MIN_GROUP_MEMBERS} members signed
              up to appear at all.
            </Rule>

            <Rule title="Nobody can see your workouts">
              A board only ever shows a name, a house, a class year and a total. Never a
              workout, an exercise, a note, a photo or a date — there is no way to read a
              leaderboard backwards into what somebody actually did.
            </Rule>
          </div>

          <div className="h-px bg-border" />

          <p className="text-[12px] leading-relaxed text-muted">
            {honorCodeFor(universityKey).footer}
          </p>
        </div>
      </div>
    </div>
  );
}
