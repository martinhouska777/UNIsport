"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { useFavorites, useGymRatings, useGymCrowd, timeAgo, CROWD_FRESH_LABEL } from "@/lib/gymSocial";
import { StarRater, CrowdPicker, CrowdSentence, BusyBars } from "@/components/gyms/RateCrowd";
import OpenNow from "@/components/gyms/OpenNow";
import GoingLine, { boardHref } from "@/components/gyms/GoingLine";
import PostGoingSheet from "@/components/gyms/PostGoingSheet";
import Avatar from "@/components/messages/Avatar";
import { useClock } from "@/lib/gymHours";
import Button, { ButtonLink } from "@/components/ui/Button";
import { gymHighlights, type Gym } from "@/lib/gyms";
import { useBoardByGym } from "@/lib/gymGoing";
import { focusLabel, postWhenLabel } from "@/lib/buddyBoard";
import { useProfileData } from "@/components/profile/useProfileData";
import { dateLabel } from "@/lib/schedule";
import { useSharedHooks } from "@/components/match/useSharedHooks";
import HookChip from "@/components/match/HookChip";
import {
  IconArrowLeft,
  IconHeart,
  IconMapPin,
  IconChevronDown,
} from "@/components/icons";

export default function GymProfile({ gym }: { gym: Gym }) {
  const { userId } = useAppState();
  const { data: myProfile } = useProfileData();
  const { isFavorite, toggle } = useFavorites(userId);
  const { getRating, setRating } = useGymRatings(userId);
  const { getCrowd, reportCrowd } = useGymCrowd(userId);
  // Who has already said they're coming here (the Buddy Board, by gym).
  const { goingFor } = useBoardByGym(userId);
  const going = goingFor(gym.name);
  // One shared fact per person going — why you'd join THIS one.
  const { hookFor } = useSharedHooks(userId);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const favorite = isFavorite(gym.slug);
  const rating = getRating(gym.slug);
  const highlights = gymHighlights(gym);
  const crowd = getCrowd(gym.slug);
  const now = useClock();
  // See FavHeart in the gyms list: counts taps so the pop plays on the tap and
  // not on every render of a gym that's already a favourite.
  const [favTaps, setFavTaps] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-2.5">
        <Link
          href="/gyms"
          aria-label="Back to gyms"
          className="tap44 press-icon flex h-8 w-8 items-center justify-center text-muted"
        >
          <IconArrowLeft size={18} />
        </Link>
        <span className="truncate px-2 text-[13px] font-medium text-text">
          {gym.name}
        </span>
        <button
          type="button"
          aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={favorite}
          onClick={() => {
            setFavTaps((t) => t + 1);
            toggle(gym.slug);
          }}
          className={`tap44 press-icon flex h-8 w-8 items-center justify-center ${
            favorite ? "text-primary-live" : "text-muted"
          }`}
        >
          <span key={favTaps} className={favTaps > 0 && favorite ? "react-pop block" : "block"}>
            <IconHeart size={18} filled={favorite} />
          </span>
        </button>
      </div>

      {/*
        WHERE THE PHOTO CAROUSEL USED TO BE. Four panels — Main Floor, Cardio,
        Pool, Courts — each a 200px empty rectangle holding one grey icon and one
        word, with page dots underneath. A photo slot with no photos, and it
        pushed everything the page is actually for below the fold.

        Gone rather than restyled: there is no photography to put in it, and the
        gym's own icon still marks its card in the list. gym.gallery stays in the
        data (lib/gyms.ts) — that is where the card reads its icon from, and
        where real photos will land when there are some.
      */}
      {/* Header block */}
      <div className="border-b border-border px-3.5 py-3">
        <h1 className="mb-1.5 text-[15px] font-medium text-text">{gym.name}</h1>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-muted">
          <OpenNow hours={gym.hours} now={now} />
          {/* No star average: the numbers in lib/gyms.ts are placeholders
              (see the gyms list). Back when real ratings exist. */}
          <span className="flex items-center gap-1.5">
            <IconMapPin size={13} /> {gym.address}
          </span>
        </div>

        {/*
          The headline kit, up here rather than fifteen rows down. "Can I squat,
          is there a bench, is there a pool" is the question a gym page is
          actually asked, and it used to be answered somewhere in the middle of
          four equal-looking lists. Which numbers count is DATA (lib/gyms.ts).
        */}
        {highlights.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {highlights.map((h) => (
              <li
                key={h}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-2"
              >
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        WHO'S GOING. The Buddy Board already holds people who volunteered for
        a session here; this is where somebody deciding whether to go finds
        them. One row per post, nearest first; the header line opens the board
        narrowed to this gym. Hidden entirely when nobody has posted.
      */}
      {going && (
        <div className="border-b border-border px-3.5 py-3.5">
          <GoingLine going={going} gymName={gym.name} />
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {going.posts.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 py-2">
                <Avatar size={30} src={p.authorPhoto} alt={p.authorName} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-text">
                    <span className="truncate">
                      {p.authorName}
                      {p.mine && <span className="text-muted"> · your post</span>}
                    </span>
                    {!p.mine && <HookChip hook={hookFor(p.authorId)} />}
                  </div>
                  <div className="text-[11px] text-muted">
                    {focusLabel(p.focus)}
                    {p.date ? ` · ${dateLabel(p.date)}` : ""} · {postWhenLabel(p.hour, p.timeOfDay)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Your rating + live crowd — what you fill in after / during a workout */}
      {/* data-tour: the gym tour lights this pair (lib/tour.ts). */}
      <div data-tour="gym-rate" className="border-b border-border px-3.5 py-3.5">
        {/* Plainly YOURS. It is stored for you alone (lib/gymSocial.ts) and
            averaged with nobody's, so the heading says so instead of implying
            the stars feed a score somewhere. */}
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Your rating
          </h2>
          <span className="text-[11px] text-muted">
            {rating ? `You rated · ${timeAgo(rating.at)}` : "Tap a star · just for you"}
          </span>
        </div>
        <div className="mt-2">
          <StarRater value={rating?.value ?? 0} onRate={(n) => setRating(gym.slug, n)} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            How busy right now?
          </h2>
          {/* Fresh reports if anybody filed one — with the honest headcount,
              "2 people said Busy in the last hour"; otherwise the app says what
              it actually knows — the typical week — and says that it is typical. */}
          <span className="text-right text-[11px] text-muted">
            {crowd ? <CrowdSentence crowd={crowd} /> : "Typical for this time"}
          </span>
        </div>
        {/* The next six hours, so "come back at nine" is an answer the page can
            give. Hidden once a live report is in — that is the better answer. */}
        {!crowd && (
          <div className="mt-2.5">
            <BusyBars kind={gym.kind} now={now} />
          </div>
        )}
        {/* The highlighted button is YOUR answer. Tapping another replaces it —
            one person is always one voice in the count, never two. */}
        <div className="mt-3">
          <CrowdPicker value={crowd?.myLevel ?? null} onReport={(l) => reportCrowd(gym.slug, l)} />
        </div>
        <div className="mt-2 text-[11px] text-muted">
          {crowd?.myLevel
            ? `Your report is in — everyone at your school sees it for the next ${CROWD_FRESH_LABEL}. Tap another to change it.`
            : `Tap one — everyone at your school sees it for the next ${CROWD_FRESH_LABEL}.`}
        </div>
      </div>

      {/*
        Equipment, folded away. All four sections used to be open at once — ~25
        rows of identical weight between the top of the page and the "find a
        partner" button, which is why nobody ever reached it. Closed, the whole
        gym fits on a screen and the sections become a table of contents; the
        headline numbers are already up in the header for anyone who only wanted
        those.

        <details> rather than React state on purpose: it opens without
        JavaScript, it is keyboard-operable and screen-reader-announced for
        free, and the browser handles find-in-page opening the right section.
      */}
      {gym.equipment
        .filter((section) => section.rows.length > 0)
        .map((section) => (
          <details key={section.title} className="group border-b border-border">
            <summary className="tap44 flex cursor-pointer list-none items-center justify-between px-3.5 py-3 [&::-webkit-details-marker]:hidden">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {section.title}
              </h2>
              {/* Chevron only. A bare row-count here read as a score. */}
              <span className="text-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none">
                <IconChevronDown size={16} />
              </span>
            </summary>
            <div className="flex flex-col divide-y divide-border px-3.5 pb-3">
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-xs text-muted">{row.label}</span>
                  <span className="text-xs font-medium text-text">{row.value}</span>
                </div>
              ))}
            </div>
          </details>
        ))}

      {/*
        WHERE "RATINGS BREAKDOWN" USED TO BE — three gold bars (Equipment,
        Cleanliness, Atmosphere) and "142 ratings". Every one of those numbers
        was invented in lib/gyms.ts and shown on a real, named campus gym; a
        student rating the gym changed none of them. Gone until real ratings
        exist. The fields stay in the data for that day.
      */}

      {/*
        The page's one conversion action, stuck to the bottom of the viewport
        (above the tab bar). It used to say "Find a partner at this gym" and
        open a search form — a question. This is an ANSWER: two taps and you
        are on the board, on this card, and findable by time. Seeing who else
        is going is the second action, because that is what it is.
      */}
      <div
        data-tour="gym-partner"
        className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-border bg-surface px-3.5 pb-4 pt-3"
      >
        <Button size="lg" full onClick={() => setPosting(true)}>
          {posted ? "Posted · post another time" : "Post that you’re going"}
        </Button>
        <ButtonLink href={boardHref(gym.name)} variant="secondary" size="md" full>
          {going ? `See who else is going (${going.posts.length})` : "See who else is going"}
        </ButtonLink>
      </div>

      {posting && (
        <PostGoingSheet
          gymName={gym.name}
          primaryActivity={myProfile?.primaryActivity as string | undefined}
          onClose={() => setPosting(false)}
          onPosted={() => {
            setPosting(false);
            setPosted(true);
          }}
        />
      )}
    </div>
  );
}
