/*
  POST /api/varsity/erg-scan
  Body: { image: "data:image/jpeg;base64,..." }
  Reads a photo of an erg monitor (Concept2 PM5, RP3) with Claude vision and
  returns the workout summary as structured JSON. Server-side only (uses
  ANTHROPIC_API_KEY); fails soft with 503 when the key isn't configured.
  The model, the instructions and the answer's shape live in
  lib/varsity/ergRead.ts, so the test script can run the same call.
*/
import { anthropic, hasAnthropicKey } from "@/lib/anthropic/server";
import { readErgPhoto, type ErgMediaType } from "@/lib/varsity/ergRead";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// The client shrinks photos to a ~1200px JPEG before sending (lib/varsity/ergScan.ts),
// which lands well under 1 MB of base64. Anything far above that is not a phone
// photo of a monitor — refuse it before it reaches the (paid) vision call.
const MAX_BASE64_CHARS = 2_500_000;

export async function POST(request: Request) {
  if (!hasAnthropicKey()) {
    return Response.json({ error: "unconfigured" }, { status: 503 });
  }

  // Signed-in users only: every call here costs money, and the route used to
  // answer anyone on the internet who POSTed an image.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { image?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const dataUrl = typeof body.image === "string" ? body.image : "";
  const m = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i.exec(dataUrl);
  if (!m) return Response.json({ error: "bad_image" }, { status: 400 });
  const media = (m[1].toLowerCase() === "image/jpg" ? "image/jpeg" : m[1].toLowerCase()) as ErgMediaType;
  const data = m[2];
  if (data.length > MAX_BASE64_CHARS) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  try {
    const read = await readErgPhoto(anthropic(), media, data);
    // What each scan really costs, so the monthly bill is a measurement.
    console.log(
      `erg-scan: ${read.cost.inputTokens} in / ${read.cost.outputTokens} out tokens, ${read.cost.cents}¢`,
    );
    if ("error" in read) {
      console.error("erg-scan: no answer, stop_reason", read.stopReason);
      return Response.json({ error: read.error }, { status: 502 });
    }
    return Response.json({ result: read.result });
  } catch (e) {
    console.error("erg-scan:", e);
    return Response.json({ error: "scan_failed" }, { status: 502 });
  }
}
