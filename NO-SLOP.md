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
    "When" is asked as two dropdowns on one line, Day beside Time, in the Sessions Filters,
    the post form and Search by time (look A of four), never a grid of day tiles or a row of
    day pills. The gym focus list carries what people actually train, shoulders, glutes,
    upper and lower body included. (2026-10-24: "do A but add everything there like
    shoulders upper body lower body like what people do and apply it to all filters, post a
    session and search by time".)
    A shut boat card shows its cox on a second line under the boat, with the cox's yellow C
    (8+ and 4+, gone once the card is open); a boat with no cox shows its stroke there, with the
    seat's number chip from the hull. "Not in a boat" is one card, always open, a row
    per group like the coach's sheet: the group on the left (Launch, Erg, Rx, OYO), its names
    on the right, never a count. (2026-10-24: "in eights show cox in preveiw and not in baot
    make it by catagories", then "do C" of four; "for the boat without cox put there the stroke
    seat".)
    A person's picture opens their profile, the way Instagram does it: on a Match card a tap on
    the picture does what View profile does. (2026-10-29: "when you click on the profile picture
    it will open the profile aswell not just from view profile".)
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
    The account a walk or a video is shot on has a made-up name, and so does anyone called
    Martin Houska it meets (the first card on Match): Lucas Bennett, Ethan Hale, Oliver
    Grant, through `db/shoot_names.sql`. The owner's name is never on the Match tab twice.
    (2026-10-18: "do a fake name and not Martin Houska, then we will shoot it", "also make
    sure that my name is not there twice".)

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
    (2026-09-20.) The Instagram posts are the student side; no Varsity or Coach post until the
    owner asks for one by name. (2026-09-22: "no, student first"; 2026-10-23: "no not varsity
    we want to continue on the student side".)
27. **Social images: white ground, the real current screen in light mode, a whole phone held
    straight, no logo except on a post's last slide.** Arrows are thin, black and solid (a full line, never dashed: tried
    for a few hours on 2026-10-22, then "actually do it full lines"), end in a small arrowhead whose
    tip touches the spot, and never point at what explains itself: Follow, or a plan card's
    gym, day and time (2026-10-22: "dont put the plan card text that is easy"). An arrow is a
    straight line from the label to the spot, the label as level with its spot as the labels
    around it allow; never a curve that bends into an S or runs down the phone's edge
    (2026-10-24: "make the arrows better now some of them have strange shapes"). Message gets
    a label only on a profile, for what it leads to: setting up a session (2026-10-22). No small
    label above a slide's headline ("01 Match", "Browse", "Why you match"): the slide opens
    on its headline. (2026-09-22: "Don't put the logo there", "these are old ones";
    2026-09-28: "just make the phone straight … realistic"; 2026-10-22: "smaž to match
    nahoře to z té webovky ten malý text a udělej tu šipku šipkou na konec a udělej ji
    přerušovaně tu čáru".)
    A part of a screen another slide already shows (the calendars on the profile) is a label
    with an arrow on that slide, never a slide of its own. (2026-10-22: "cut 3 and jsut
    describe calendar on second image with arrow".)
    A feature slide labels every feature on it worth knowing, not just one (the Sessions slide:
    the post button, Filters, Search by time, Accept; the Match slide: Filters too, 2026-10-23:
    "for the first card, also do a filter"), and the screen shows what a label says: "goes into
    both of your calendars" points at a plan just accepted, never one still waiting.
    (2026-10-22: "put all the features you think are worth doing", "show something when you
    just accepted from other guy and say it goes to both of your calendars".)
    A label keeps the feature's own short name, close to the word on the screen, with a verb
    added where it reads more naturally: "Send a message" on Message, "Plan a session", "Build
    memories", "Find a mentor", "See why you match". Never a new name made up to dodge the
    screen's word ("Say hello", "Look back", "Only what suits you" were tried the same day and
    reverted). Match is named on the Match slide, on the left, its arrow on the interests a card
    shares with you. (2026-10-22: "match do it on left adn pointing to intersts etc and on the
    right name it differently and in second dont name it message its obvious", then "actually
    name is close as it is jsut add verb there this is bad so back as it was".)
    On the Match slide the name is "Find people" now, the owner's own (2026-10-23). A label
    whose sentence says it all has no name over it: the plan just accepted is "Once you accept
    the session, it goes into both of your calendars.", alone, never under "Both calendars".
    The lines are the owner's dictated words when he gives them, with only the grammar fixed.
    (2026-10-23: "don't name it 'Both Calendars.' Just write there once [you accept] the
    session, it goes into both your calendars".)
    When he writes the labels himself, his names stand over the screen's word ("Search
    similarities", "Rack up points", "Snap a picture"), and a label missing from his text is
    off the slide. (2026-10-24, both posts rewritten: "can you change the text for this?")
    A post's last slide carries the logo, top to bottom: the name UNIsport as the site writes
    it, the U mark, "Get in early." on one line and smaller than the other headlines, "UNIsport
    is launching at Harvard University first.", then "Link in bio". The slides before it stay
    without a logo. (2026-10-29: "put the logo there in the last thing and like get in early",
    then "the name unisport then the logo then get in early on one line and smaller".)
    Nothing on a post looks like a link or a button when it can't be tapped: no blue pill with
    the address. The waitlist is "Link in bio", in plain words. (2026-10-29: "jestli to nejde
    tak tam nedavej neco co vypada jako odkaz ale neni rekni link in bio".)
28. **Video sound is soft**: instrumental songs only, no aggressive sound effects, none at all
    except the connecting moment. Real downloaded sounds, never synthesised. No speed changes.
    (2026-09-22: "dont want the sounds to be aggressive rather … smooth"; 2026-09-27: "skip all
    sound effects because they're distracting".)
    The intro's sound is only what the owner lists: a mouse click on the two presses (the one in
    his 25 Oct video, kept as it sounds there: "tenhle mouse click"), a normal pop as the three
    tiles pop up, the same pop on each letter of UNIsport at the end. No
    whooshes, no push. When he asks for sounds, look first in the reels he uploaded
    (`C:\VideoEditing\references\reels`; reel 01 plays its effects alone, so its click and pops
    come out clean), never only in the libraries. (2026-10-24: "I want some sound from some reel
    that we put in", "that's all I want for sound".)

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
    A tap on the leaderboards' arrows switches the board and the light stays where it is,
    also while the new board is counting and on a board with nobody on it: it never shrinks
    to the arrows and grows back, and the caption never jumps. A stray tap elsewhere in that
    light (a house, the gap beside an arrow) does nothing; Next moves on. (2026-10-18: "when you're supposed to click on leaderboards
    it clicks differently, so fix that and make sure it's smooth".)
