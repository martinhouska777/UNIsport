/*
  POST /api/varsity/erg-scan
  Body: { image: "data:image/jpeg;base64,..." }
  Reads a photo of a Concept2 (PM5) / RP3 erg monitor with Claude vision and
  returns the workout summary as structured JSON. Server-side only (uses
  ANTHROPIC_API_KEY); fails soft with 503 when the key isn't configured.
*/
import { anthropic, hasAnthropicKey } from "@/lib/anthropic/server";

export const runtime = "nodejs";

const SYSTEM = `You read photos of indoor rowing-machine monitors (Concept2 PM5, RP3) and extract the workout summary.

Rules:
- Read ONLY what is shown on the screen. If a value isn't visible or is unreadable, return null for it — never guess.
- "time" is total time: convert to total minutes as a decimal (22:30 -> 22.5, 1:08:00 -> 68).
- "meters" / "distance" -> total metres (integer).
- "/500m" / split / pace -> average split as a string "m:ss" or "m:ss.t" (e.g. "1:52.3").
- "s/m" / "spm" / rate -> stroke rate, strokes per minute (integer).
- "watts" -> average watts (integer).
- If both a per-interval row and a final SUMMARY/total are visible, use the SUMMARY totals.
- Set "confident" to false if the photo is blurry, cropped, or you are unsure of the main numbers.`;

// Structured-output schema (output_config.format). Nullable via anyOf; every
// field required; additionalProperties:false (required by structured outputs).
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    monitor: { type: "string", enum: ["C2", "RP3", "other"] },
    totalMinutes: { anyOf: [{ type: "number" }, { type: "null" }] },
    totalMetres: { anyOf: [{ type: "integer" }, { type: "null" }] },
    splitPer500: { anyOf: [{ type: "string" }, { type: "null" }] },
    strokeRate: { anyOf: [{ type: "integer" }, { type: "null" }] },
    avgWatts: { anyOf: [{ type: "integer" }, { type: "null" }] },
    confident: { type: "boolean" },
  },
  required: [
    "monitor",
    "totalMinutes",
    "totalMetres",
    "splitPer500",
    "strokeRate",
    "avgWatts",
    "confident",
  ],
} as const;

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function POST(request: Request) {
  if (!hasAnthropicKey()) {
    return Response.json({ error: "unconfigured" }, { status: 503 });
  }

  let body: { image?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const dataUrl = typeof body.image === "string" ? body.image : "";
  const m = /^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i.exec(dataUrl);
  if (!m) return Response.json({ error: "bad_image" }, { status: 400 });
  const media = (m[1].toLowerCase() === "image/jpg" ? "image/jpeg" : m[1].toLowerCase()) as MediaType;
  const data = m[2];

  try {
    const resp = await anthropic().messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "disabled" }, // a quick read; structured output keeps it terse
      // cache_control on the (small) system prompt as requested — only actually
      // caches once a prefix exceeds the model's ~4K-token minimum, so it's a
      // no-op at this size but harmless and future-proof.
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data } },
            { type: "text", text: "Extract this erg monitor's summary metrics as JSON." },
          ],
        },
      ],
      output_config: { format: { type: "json_schema", schema } },
    });

    const text = resp.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return Response.json({ error: "no_output" }, { status: 502 });
    }
    return Response.json({ result: JSON.parse(text.text) });
  } catch (e) {
    console.error("erg-scan:", e);
    return Response.json({ error: "scan_failed" }, { status: 502 });
  }
}
