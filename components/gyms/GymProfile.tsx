"use client";

/*
  ONE GYM'S PAGE.

  Restyled 2026-09-22 to match the person profile (app/(app)/people/[id]):
  white lifted cards on the page instead of full-width grey bands divided by
  hairlines — the owner picked that look there and asked for it here. The
  chassis is the same three classes: `rounded-2xl border border-border
  bg-surface p-3.5`, with SectionLabel on top of each card.

  What the page is, top to bottom: which gym and where — what the campus
  thinks of it (the rating, its breakdown and the comments) — the week's hours
  — photos — who has said they're going. "How busy is it" was cut on the
  owner's instruction the same day; so was the strip of your own sessions here,
  and so was the "Open now" line (the hours card answers it).

  All colour is theme tokens (rule 1).
*/
import { useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import { useFavorites, useGymPhotos } from "@/lib/gymSocial";
import GymPhotos from "@/components/gyms/GymPhotos";
import GymReviews from "@/components/gyms/GymReviews";
import WeekHours from "@/components/gyms/WeekHours";
import GoingLine, { boardHref } from "@/components/gyms/GoingLine";
import PostGoingSheet from "@/components/gyms/PostGoingSheet";
import Avatar from "@/components/messages/Avatar";
import { useClock } from "@/lib/gymHours";
import Button, { ButtonLink } from "@/components/ui/Button";
import { type Gym, gymMapsUrl } from "@/lib/gyms";
import { useBoardByGym } from "@/lib/gymGoing";
import { focusLabel, postWhenLabel } from "@/lib/buddyBoard";
import { useProfileData } from "@/components/profile/useProfileData";
import { dateLabel } from "@/lib/schedule";
import { useSharedHooks } from "@/components/match/useSharedHooks";
import HookChip from "@/components/match/HookChip";
import { IconArrowLeft, IconHeart, IconMapPin } from "@/components/icons";

export default function GymProfile({ gym }: { gym: Gym }) {
  const { userId, universityKey } = useAppState();
  const { data: myProfile } = useProfileData();
  const { isFavorite, toggle } = useFavorites(userId);
  // The school's own pictures of this gym (db/gym_photos.sql).
  const { photosFor, addPhoto, removePhoto } = useGymPhotos(userId);
  // Who has already said they're coming here (the Buddy Board, by gym).
  const { goingFor } = useBoardByGym(userId);
  const going = goingFor(gym.name);
  // One shared fact per person going — why you'd join THIS one.
  const { hookFor } = useSharedHooks(userId);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const favorite = isFavorite(gym.slug);
  const now = useClock();
  // See FavHeart in the gyms list: counts taps so the pop plays on the tap and
  // not on every render of a gym that's already a favourite.
  const [favTaps, setFavTaps] = useState(0);
  // The address is a way of GETTING there, so it opens a map (see gymMapsUrl).
  const mapsHref = gymMapsUrl(gym, getUniversity(universityKey)?.name ?? "");

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-1 flex-col">
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

      <div className="flex flex-col gap-2.5 px-3.5 pb-3 pt-3">
        {/*
          THE OVERVIEW — the name and where it is. NO "Open now" (owner,
          2026-09-22): that line belongs on the Gyms list, where you are
          choosing between fifteen of them; on the gym's own page the opening
          hours are right there and saying it twice is saying it twice. The
          address is a way of GETTING there, so it opens a map.
        */}
        <div className="rounded-2xl border border-border bg-surface p-3.5">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-text">{gym.name}</h1>
          <div className="mt-2.5 flex flex-col gap-2 text-[14px] text-text">
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="press-icon flex w-fit items-center gap-1.5 underline decoration-border underline-offset-4"
            >
              <IconMapPin size={16} /> {gym.address}
            </a>
          </div>
        </div>

        {/*
          THE RATING — the score, what it is made of, your own stars and the
          comments. Real rows (db/gym_reviews.sql), never the placeholder
          numbers in lib/gyms.ts.
          data-tour: the gym tour lights this (lib/tour.ts).
        */}
        <div data-tour="gym-rate">
          <GymReviews userId={userId} gymSlug={gym.slug} />
        </div>

        {/*
          THE HOURS — the only place on this page that answers "can I go in".
          Same hours every day while the data holds one line per gym (owner,
          2026-09-22) — see weekHours() for the day that changes.
        */}
        <WeekHours hours={gym.hours} now={now} />

        {/*
          PHOTOS, where the empty four-panel carousel once was. Taken by the
          people who train here rather than by anyone walking the campus with a
          camera — the newest one also becomes the gym's picture on the list.
        */}
        <GymPhotos
          photos={photosFor(gym.slug)}
          onAdd={(file) => addPhoto(gym.slug, file)}
          onRemove={removePhoto}
        />

        {/*
          WHO'S GOING. The Buddy Board already holds people who volunteered for
          a session here; this is where somebody deciding whether to go finds
          them. One row per post, nearest first; the header line opens the board
          narrowed to this gym. Hidden entirely when nobody has posted.
        */}
        {going && (
          <div className="rounded-2xl border border-border bg-surface p-3.5">
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
      </div>

      {/*
        The page's one conversion action, stuck to the bottom of the viewport
        (above the tab bar). It used to say "Find a partner at this gym" and
        open a search form — a question. This is an ANSWER: two taps and you
        are on the board, on this card, and findable by time. Seeing who else
        is going is the second action, because that is what it is.
      */}
      <div
        data-tour="gym-partner"
        className="sticky bottom-0 z-10 mt-auto flex flex-col gap-2 border-t border-border bg-surface px-3.5 pb-4 pt-3"
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
