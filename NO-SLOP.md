# What the owner has rejected: the "AI slop" list

Read this before building or changing any screen, text, image or video for UNIsport. Every
line is something the owner saw, called out and had changed. Don't build any of it again.

Built on 2026-10-11 from a read of every UNIsport chat (12 Sep to 11 Oct) and the owner's
words in the commit messages. Rules for every project are in `C:\Users\marti\.claude\CLAUDE.md`;
Rowbase keeps its own list (`C:\Rowbase\NO-SLOP.md`).

**Keeping this list:** whenever the owner asks for a change to how something looks, reads or
behaves, add a line here the same day, in the same commit as the fix: the rule, the owner's
own words, the date. Newest at the bottom of each part.

## Words on screen

1. **No sentence explaining a control, a state or a result.** The control is the state:
   Publish or Unpublish, and which one is showing is the answer. Something happened = a word
   and a tick ("✓ Uploaded"). Empty screens say only what is empty ("No favourites yet.").
   Only exceptions: an error you can act on, a warning before a permanent delete. No
   reassurance tacked on either ("Nothing else.", "No spam."). The most
   repeated complaint by far, about 100 times. (2026-09-12: "cut the AI slop … people know it";
   2026-09-20: "it doesn't need to explain how to do it. You just know."; 2026-10-11;
   2026-10-15: "Cut 'Nothing else.' from the waitlist done screen.")
2. **No example text in a field that already has a label.** A placeholder only when it is the
   field's only name (a search box) or a format the app parses (mm:ss). (2026-09-22: "Harvard
   students are pretty smart.")
3. **No dots between words or values**: no "·", "•" or " - ". Use a comma, a new line or a
   separate element. (2026-10-11: "It looks really AI.")
4. **No em dashes** anywhere a person reads. (2026-10-11: "yes fix the dash".)
5. **No numbers nobody acts on**: "117 athletes", "66 people", "8/8 filled", "1 of 12 days",
   "39 sessions · 32h 59m", "40 points behind", "UT 36%". (2026-09-22: "don't write 44 people,
   25 boats"; 2026-10-02: "we don't care how many logged".)
6. **Never the same information twice on one screen.** (2026-10-11: "3 × 25 UT2, so we don't
   need to write it there again".)
7. **No screen titles inside the app, and the shortest label that works**: "Search", not
   "Search by name or date"; "Publish", not "Unpublish, tell the team". An obvious icon beats a
   word: the pencil, not "Edit"; an open or closed eye, not "Shown to others". (2026-09-13:
   "I don't want there to be Team on top left"; 2026-09-15; 2026-09-16.)
   A preview card says the short version: a gym on the Gyms list shows its rating and how many
   are going ("3 going"), never which day or hour; those are on the gym page. (2026-10-18:
   "in the gym preview can you show rating and just how many people are going and not when".)
8. **Words never used**: "squad" (say team), "missed" (say Log), "outing", "Strong fit",
   "Example" tags everywhere, "optional" (mark required fields with a red asterisk instead).
   (2026-10-11: "Don't ever mention squad again"; 2026-10-04: "nedávej všude example";
   2026-10-11: "I don't want the strong fit".)

## Look

9. **White cards with a thin outline and one accent** (a stripe, a coloured tag, a header). No
   grey or dark-grey tiles, no gradients, no black borders, no glow. Plain white alone looks
   unfinished. (2026-09-22: "its just grey everywhere"; 2026-09-27: "Now it's just white, and I
   don't like how it looks", "nedělej ty černé okraje"; 2026-10-11: three app-wide sweeps.)
   No poster style either: never a solid block of the school colour with white words on it as a
   card's header. The colour sits in a crest tile or a thin stripe down the left edge, like the
   Gyms list (main gyms: the school crest; houses: crest + left stripe). (2026-10-18: "i dont like
   how it is poster style a little bit", "I like the D with houses having stripes but on left not
   top".)
   What you share or have picked is SOLID school colour with white words, never the light tint:
   the shared hours, the interests you share on someone's profile, the applied filters, a filter
   tab with something set and the value picked inside it. (2026-10-18: "for interests i think it
   would be good if they had full color aswell", "that are applied will be red like full red".)
   Content laid out as plain lines, with no card around it, sits on white like the top bar, not
   on the page colour; cards stay on the page colour. On the Profile tab only the top is white
   (photo, name, counts, badges, bio); "Did this happen?", the leaderboards and the calendar sit
   on the page colour. (2026-10-18: "make the top in profile white", "calendar and leaderboards
   will have grey background only the top will have white".)
10. **Text people read is black.** Grey is only for marks (`var(--faint)`). Nothing white on
    white, nothing yellow on yellow. (2026-09-30: "je tam spoustu šedých písmen … udělat černé";
    2026-10-11: "make it so it's not white on white".)
11. **Keep the colours nobody asked to change.** A sweep to white never takes the school
    colour or an accent off something else. (2026-10-01: "why are they grey when we have the
    colors"; 2026-10-11: "I want it red as it was before".)
12. **Fill the width, keep it compact, never cramped.** Content edge to edge, controls small,
    symmetrical, no lines, frames or boxes that do nothing. (2026-09-15: "the gray line on the
    top that doesn't do anything"; 2026-09-22: "so much empty space"; 2026-10-02: "they're
    crammed".) Tabs and the options they open are clearly apart: a line across the whole panel
    and room on both sides of it. (2026-10-18: "in filters we want to split more the top and
    bottom".)
13. **Every new screen reuses a pattern the app already has** (Messages is the model). Familiar
    things copy WhatsApp, Instagram, Hevy or Strava closely. (2026-09-14: "just look at WhatsApp
    how he does it and copy it"; 2026-09-27: "I like how it is done on messages".)
    A pale pink tile with a thin red line icon looks generated. Community channels are a solid
    circle in the channel's own colour with a white icon, like Apple Reminders lists, the same
    mark in the list, the chat header and Channel info (`components/messages/ChannelBadge.tsx`).
    (2026-10-18: "they look really ai", direction D of five.) A list of reasons, like Why you
    match, keeps its ticks: no icon per row. Why you match is a done checklist, solid
    school-colour square ticks on a white card with the title in the school's colour.
    (2026-10-18: "i dont want icons just better ticks and color", picked B of four.)
    The tab you are on, in every bar and sidebar, just turns red with its icon solid, the way
    Strava does it: no pink pill behind it. Match's icon is Strava's two people.
    (2026-10-18: "match will be the 2 people from strava", "make it just turn red not like
    we have but the strava type".)
14. **Light mode is the main mode**; the landing page is light only. (2026-09-15, 2026-09-20.)
15. **Animation is quick and one continuous motion.** (2026-09-13: "it takes too long … I just
    want to see the thing".)

## Doing the work

16. **When the owner flags one thing, fix the same thing everywhere in the app in the same
    pass**: student mode, Varsity, the coach console and the laptop layout. Don't ask "should I
    do it there too?". (2026-09-17: "Look through the app and use your head"; 2026-10-04:
    "dělej tak u všeho"; 2026-10-11: "go through the app if something else has this issue",
    three times in one day.)
17. **Change only what was named.** Cutting a sentence never removes the control next to it,
    and a request about one screen never lands on another. If "the animation" or "the screen"
    could be two things, ask one question first. (2026-09-16: "put the memories back i want the
    tab there just without pictures"; 2026-10-01: "you did it wrong … revert it back".)
18. **Done means every item in the message is built and pushed**, and checked in the real app,
    signed in, at phone width. Ask the owner to sign in early instead of shipping with "couldn't
    check, no login". (2026-09-20: "And I said it, and you should change it."; 2026-09-22: "let
    me sign into the app then … so you can see it on your own".)
19. **Once the owner has given the direction, do the whole list and then report.** Don't stop
    after every small slice to ask "should I start the next one?". Stop for review before a new
    feature or a new look, and show 3–5 previews for a new look. This narrows rule 4 in
    CLAUDE.md. (2026-09-27: "change everything and then tell me what you did and i will review
    it"; 2026-10-01: "continue".) A new look is built only after the owner names the preview he
    wants. If he moves on without picking, the previews wait and the screen stays as it was;
    never pick one for him. (2026-10-18: "i dont like the why you match i said give me
    preview".)
20. **A suggestion is never filled in for you.** Offer the guess on a button ("Use them");
    nothing is saved until it is pressed. (2026-09-17: "do it as an option … It was very
    confusing.")
21. **No features, stats or links nobody asked for.** No "Add to Home Screen" prompt either:
    UNIsport is going on the App Store. (2026-09-22: "we don't want the telemetry there now";
    2026-10-11: "I don't need to connect it"; 2026-10-16: "it will be on app store why would
    we do this".)
22. **Demo data looks real and varied**: different gyms, concentrations and names, never
    everyone at Malkin studying economics. No friends' real names in screenshots. (2026-09-16:
    "I don't just want everything Malkin … i want different stuff".)

## Coach screens

23. **Plain lists.** No podium, medals, emoji or progress bars. Places 1, 2, 3 may be gold,
    silver and bronze number badges. (2026-09-27: "Don't put medals and other emojis there";
    2026-10-01: "don't put the progress bars anywhere, it's for coaches so make it simple".)
24. **Walks and tours explain only what isn't obvious.** Coaches get the how of a workflow, not
    every button. (2026-10-04: "nepotřebujeme vysvětlovat každý button".)

## Marketing, social and video

25. **Copy uses the owner's own words and the site's tone, one simple message.** No invented
    taglines. Dictated copy goes in as he said it, with only typos fixed. (2026-09-22: "use the
    tone from my website so its not generic ai slop"; 2026-09-28: "just 'find your ideal
    training partner.' Just a text.")
26. **The app is described by matching first, for every student**, never as a rowing app.
    (2026-09-20.)
27. **Social images: white ground, the real current screen in light mode, a whole phone held
    straight, no logo.** Arrows are thin and black and never point at obvious buttons
    (Message, Follow). (2026-09-22: "Don't put the logo there", "these are old ones";
    2026-09-28: "just make the phone straight … realistic".)
28. **Video sound is soft**: instrumental songs only, no aggressive sound effects, none at all
    except the connecting moment. Real downloaded sounds, never synthesised. No speed changes.
    (2026-09-22: "dont want the sounds to be aggressive rather … smooth"; 2026-09-27: "skip all
    sound effects because they're distracting".)

## Walks (the tutorials)

29. **What a walk lights works when you tap it.** A tap on the lit control does what it says
    (the invite card's Accept accepts, the leaderboards' arrows switch the competition), never
    a silent Next. After an answer the walk runs on by itself to where the answer lands: Accept
    goes straight through "You're on" to Upcoming sessions on the Profile, no Next in between.
    The app walk's closing card stays on the leaderboards, and Done takes you to Match; the
    finger never taps Match. A screen the walk stops on is never empty: with nothing real on
    it, the walk shows example data (Sessions board, house race, invite chat) that is gone
    when the walk ends. (2026-10-18: "add tap on the message", "when you tap add to calendar
    i want it to go all the way automatically", "when you click the competition it clicked
    badly", "at the end you stay in the leaderboards and say that is all … dont tap the match
    after that", "for the sessions add data there".)
