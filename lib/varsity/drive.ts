/*
  GOOGLE DRIVE — where the squad's footage actually lives.
  ---------------------------------------------------------------------------
  The team already has a Drive folder ("HUBC Footage 25-26") that everyone
  uploads to, sorted into a subfolder per month. Nothing about that is wrong —
  what was missing is any record of WHICH BOAT a file is of. So the app keeps
  the folder and takes over the filing: it uploads into the same month folder,
  under a name built from the lineup (lib/varsity/crewVideos.ts), and remembers
  the crew on our side.

  Two consequences worth knowing:
    • the file is browsable in Drive by anyone, with or without the app — the
      squad does not have to move house to use this,
    • the video is NOT in our own storage, so a full-length practice video has
      somewhere to go (the app's own bucket has a per-file ceiling).

  HOW THE PERMISSION WORKS. The browser asks Google for an access token that
  belongs to the PERSON UPLOADING — they sign in, they see what is being asked
  for, and the token dies within the hour. Nothing about their account is ever
  stored here and no password ever passes through the app. There is no client
  secret either: a browser app is a "public client", so the Client ID below is
  the whole configuration, and it is not a secret.

  QUOTA, the one gotcha: in a normal shared folder (as opposed to a Workspace
  Shared Drive) an uploaded file counts against the UPLOADER's own Google
  storage, not the folder owner's. Fine while it is the owner testing; worth
  knowing before forty rowers upload gigabytes each.
*/

/*
  The team's folder, from the link the owner sent. It is an id, not a secret —
  the same string that is already in the URL everyone shares. Overridable by
  env so a second school is a config change, not a code change.
*/
export const DRIVE_FOLDER_ID =
  process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID || "1VT4bQekg52BDcMUpixye7yGm3Aqg-H69";

/* The app's Google Client ID. Public by design (see above), but it does have to
   be set: without it there is nothing to sign in to, and the app quietly falls
   back to its own storage. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/*
  What we ask Google for. Full Drive access, because the app writes into a
  folder the SQUAD made rather than one the app made — the narrower `drive.file`
  scope only ever sees the app's own files and the ones a user hand-picks
  through Google's file picker, so it cannot see the team folder at all.

  That makes this a "restricted" scope, which matters when this stops being a
  test: Google wants an app verified before the public can use one. Until then
  the project stays in testing mode, where the people listed as test users can
  sign in (past a "Google hasn't verified this app" screen). A Workspace school
  can also publish it as an INTERNAL app, which needs no verification at all.
*/
const SCOPE = "https://www.googleapis.com/auth/drive";

export const driveConfigured = () => !!GOOGLE_CLIENT_ID;

/* ── Signing in ─────────────────────────────────────────────────────────── */

/* Google's own script defines this. Only the two calls we make are described. */
type TokenResponse = { access_token?: string; expires_in?: number; error?: string };
type TokenClient = { requestAccessToken: (o: { prompt: string }) => void };
type Gsi = {
  accounts: {
    oauth2: {
      initTokenClient: (o: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: unknown) => void;
      }) => TokenClient;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";

let gsiPromise: Promise<Gsi | null> | null = null;
function loadGsi(): Promise<Gsi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  gsiPromise ??= new Promise<Gsi | null>((resolve) => {
    const done = () => resolve(window.google ?? null);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", done);
      existing.addEventListener("error", () => resolve(null));
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.onload = done;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return gsiPromise;
}

/*
  The live token, in memory and mirrored to sessionStorage. Per tab and gone
  when the tab closes — an access token is not something to leave lying around
  in a browser overnight, and asking Google for a fresh one is one silent call.
*/
const TOKEN_KEY = "unisport.driveToken";
type Token = { value: string; expiresAt: number };
let token: Token | null = null;

function readToken(): Token | null {
  if (token && token.expiresAt > Date.now()) return token;
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    const t = raw ? (JSON.parse(raw) as Token) : null;
    // A minute of headroom: a token that expires mid-upload is a failed upload.
    if (t && t.expiresAt > Date.now() + 60_000) {
      token = t;
      return t;
    }
  } catch {
    /* private mode: we just ask Google again */
  }
  return null;
}

function writeToken(t: Token) {
  token = t;
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  } catch {
    /* nothing to do — the in-memory copy still works for this page */
  }
}

/** True when this browser already holds a usable Drive token. */
export const driveConnected = () => !!readToken();

/*
  Get a token. `interactive` decides what happens when there isn't one:
  false → give up quietly (used on load, to light up "Connected" without ever
  throwing a popup at somebody who only opened their Home screen);
  true  → open Google's sign-in, which must be inside a click.
*/
export async function driveToken(interactive: boolean): Promise<string | null> {
  const held = readToken();
  if (held) return held.value;
  if (!driveConfigured()) return null;

  const gsi = await loadGsi();
  if (!gsi) return null;

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const finish = (v: string | null) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    const client = gsi.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) return finish(null);
        writeToken({
          value: r.access_token,
          expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000,
        });
        finish(r.access_token);
      },
      error_callback: () => finish(null),
    });
    /*
      "" — never "consent". Google shows the consent screen on its own the first
      time, when there is nothing granted yet; asking for it EVERY time meant a
      rower who reconnects (which on a phone is most mornings, see the token
      note above) had to walk back through the unverified-app warning and the
      permission list to upload one clip. With "", a second connect is a popup
      that closes on its own.
    */
    client.requestAccessToken({ prompt: "" });
    // A silent attempt with no session never calls back at all.
    if (!interactive) setTimeout(() => finish(null), 3000);
  });
}

/** Forget the token (a shared laptop, or switching Google accounts). */
export function disconnectDrive() {
  token = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/* ── Folders ────────────────────────────────────────────────────────────── */

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

type DriveFile = { id: string; name: string };

/*
  Find a folder inside another one, or make it. Every folder the app files a
  video into is built out of this one call: the month, the day inside it, and
  the session inside that.

  `prefixMatch` exists for ONE of those — the month. That list of month folders
  is HAND-MADE and hand-made lists have typos in them; the squad's really does
  read "Febuary". Matching on the first three letters lands in the folder they
  already use, where an exact match would create a correctly-spelled twin
  beside it and split the month in two. The folders the app makes itself are
  matched exactly, because nobody typed them.
*/
export async function driveFolder(
  parentId: string,
  name: string,
  accessToken: string,
  prefixMatch = false,
): Promise<string> {
  const q = [
    `'${parentId}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ");
  const res = await fetch(
    `${API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (res.ok) {
    const { files } = (await res.json()) as { files?: DriveFile[] };
    const want = name.trim().toLowerCase();
    const hit = files?.find((f) => {
      const got = f.name.trim().toLowerCase();
      return prefixMatch ? got.startsWith(want.slice(0, 3)) : got === want;
    });
    if (hit) return hit.id;
  }

  const made = await fetch(`${API}/files?fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!made.ok) return parentId; // couldn't make one: the video still lands in the parent
  const { id } = (await made.json()) as { id: string };
  return id;
}

/*
  Walk a whole path down, making what isn't there: main → month → day →
  session. Each step falls back to the folder above it, so a folder Drive
  refuses to create costs tidiness and never the upload itself. An empty name
  is skipped rather than made into a folder called nothing.
*/
export async function driveFolderPath(
  rootId: string,
  steps: { name: string; prefixMatch?: boolean }[],
  accessToken: string,
): Promise<string> {
  let id = rootId;
  for (const step of steps) {
    if (!step.name.trim()) continue;
    id = await driveFolder(id, step.name, accessToken, !!step.prefixMatch);
  }
  return id;
}

/* ── Uploading ──────────────────────────────────────────────────────────── */

// 8 MB a go. Drive wants a multiple of 256 KB, and this is small enough that a
// dropped connection at the boathouse costs one chunk, not one video.
const CHUNK = 8 * 1024 * 1024;

export type DriveUpload = { id: string; link: string };
export type DriveError = { error: string };

/*
  Send one file, in chunks, straight from this browser to Drive. The app's own
  server is nowhere in the path — a 3 GB outing video never touches it.

  `onProgress` gets 0–1 so the button can say how far along it is; a long upload
  with no feedback reads as a hung app.
*/
export async function driveUpload(
  file: File,
  name: string,
  folderId: string,
  accessToken: string,
  onProgress?: (fraction: number) => void,
): Promise<DriveUpload | DriveError> {
  // 1. Open a resumable session. Drive answers with a URL to push bytes at.
  const start = await fetch(`${UPLOAD_API}/files?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Upload-Content-Type": file.type || "video/mp4",
      "X-Upload-Content-Length": String(file.size),
    },
    body: JSON.stringify({ name, parents: [folderId] }),
  });
  if (!start.ok) {
    return {
      error:
        start.status === 401 || start.status === 403
          ? "Google refused the upload — reconnect Drive and try again."
          : "Could not start the upload to Drive.",
    };
  }
  const session = start.headers.get("location");
  if (!session) return { error: "Google did not open an upload session." };

  // 2. Push the file up a chunk at a time. Drive replies 308 while it wants
  //    more, and 200/201 with the finished file when it has everything.
  let sent = 0;
  while (sent < file.size) {
    const end = Math.min(sent + CHUNK, file.size);
    const res = await fetch(session, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${sent}-${end - 1}/${file.size}` },
      body: file.slice(sent, end),
    });

    if (res.status === 308) {
      // Drive says how much it actually kept — trust that, not our own count.
      const range = res.headers.get("range");
      const got = range ? Number(range.split("-")[1]) + 1 : end;
      sent = Number.isFinite(got) ? got : end;
      onProgress?.(sent / file.size);
      continue;
    }
    if (res.ok) {
      onProgress?.(1);
      const { id } = (await res.json()) as { id: string };
      return { id, link: driveFileLink(id) };
    }
    return { error: "The upload to Drive failed part-way. Nothing was saved." };
  }
  return { error: "The upload finished without Drive confirming the file." };
}

/* ── Links ──────────────────────────────────────────────────────────────── */

/** What we store, and what "open in Drive" points at. */
export const driveFileLink = (id: string) => `https://drive.google.com/file/d/${id}/view`;

/** The squad's folder itself — what the "Open Drive" button on Home opens. */
export const driveFolderLink = (id: string = DRIVE_FOLDER_ID) =>
  `https://drive.google.com/drive/folders/${id}`;

/** The id back out of any Drive link we might have stored. */
export function driveFileId(url: string): string | null {
  return /drive\.google\.com\/file\/d\/([^/?#]+)/.exec(url)?.[1] ?? null;
}

/*
  How a Drive video is PLAYED inside the app. Not a <video> tag: the file is on
  Drive, so streaming it means Drive's own player, embedded. It carries the
  viewer's own Google session, which is the correct behaviour — someone with no
  access to the folder sees nothing rather than a broken player.
*/
export function drivePreviewUrl(url: string): string | null {
  const id = driveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}
