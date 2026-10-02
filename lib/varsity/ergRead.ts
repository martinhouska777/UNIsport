/*
  ERG READ (server only) — the vision call behind POST /api/varsity/erg-scan:
  one photo of an erg monitor in, the workout summary out as structured JSON.
  It lives apart from the route so scripts/erg-scan-test.mjs can run the exact
  same prompt on a real photo without a signed-in browser. No "@/" imports
  here: the test script loads this file straight into Node.

  WHERE THE SCREEN FACTS IN THE PROMPT COME FROM (so the next person can tell
  which are documented and which were only seen):
    • Documented by Concept2 (concept2.com PM5 how-to pages and the Concept2
      forum): the title notation "N x work / rest r"; interval workouts have no
      splits, only one row per rep; the Units button switches the pace column
      between /500m, watts and calories; the BikeErg paces per 1000 m and counts
      rpm; during rest the PM5 records only the metres rowed.
    • Seen on real PM5 photos (the HUBC squad's, 2026-10-01), not documented:
      which of time / meter is a running total on each kind of split screen,
      that the summary row of an interval workout is work only while "Total
      Time:" in the header includes the rests, and that "r550" under the rows is
      the rest metres.
    • Needed by the app, not by the monitor: per-row metres and time must be the
      row's OWN (teamBoard.intervalHeadings adds the rows' metres up to name the
      columns; deriveSplitSec/deriveTotalSec assume minutes, metres and split
      describe the same stretch of rowing), and any monitor other than "C2" is
      kept off the rowers' ranking (teamBoard isOtherMachine).
*/
import type Anthropic from "@anthropic-ai/sdk";

export const ERG_MODEL = "claude-sonnet-5-5";

// Claude Sonnet 5.5 list prices, US cents per token ($2 in, $10 out per
// million; cache writes cost 1.25x and cache reads 0.1x the input rate). Only
// used to put the cost of each scan in the server log.
const CENTS_IN = 2 / 10_000;
const CENTS_OUT = 10 / 10_000;

const SYSTEM = `You read photos of indoor rowing-machine monitors and extract the workout summary. Most photos are the Concept2 PM5's "View Detail" screen (Menu > Previous Workouts), so its layout is described first. RP3 and other monitors follow the same general rules.

General rules:
- Read ONLY what is shown on the screen. If a value isn't visible or is unreadable, return null for it. Never guess, and never work out a number the screen doesn't show.
- "meters" / "distance" -> metres as an integer.
- "s/m" or "spm" -> stroke rate, an integer.
- Set "confident" to false if the photo is blurry, cropped, glared over, or you are unsure of the main numbers.

The PM5 View Detail screen, top to bottom:
1. The workout title: one piece ("5000m", "2000m", "30:00") or intervals written "reps x work / rest r" ("15x1:00/1:00r", "5x1500m/3:00r", "3x20:00/3:00r"). Interval screens also show "Total Time:" on the right of the date line.
2. The date.
3. Column headings. The first two are "time" and "meter". The third is the pace column and can read "/500m" (a split), "watt" or "cal/hr", because the rower switches it with the Units button. The fourth is "s/m". A heart column after it is usually empty.
4. A boxed row straight under the headings: the SUMMARY of the whole workout. It gives the top-level result.
5. Below it, one row per split or interval, top to bottom. The list shows only as many rows as fit on the screen, so a "15x" workout may show only 8. Return the rows you can see and never the ones you can't.
6. On interval screens a line like "r550" under the last row is the metres rowed during rest. It is not a row and not part of any total. Ignore it.

Which numbers go where:
- "totalMinutes" is the SUMMARY row's time as a decimal number of minutes with three decimals, so no second is lost (16:19.3 -> 16.322, 6:03.5 -> 6.058, 1:00:00.0 -> 60). On an interval workout the summary row counts the WORK only, and so do its metres and split, whereas "Total Time:" in the header also counts the rests. Never use "Total Time:". Time, metres and split must describe the same stretch of rowing.
- "splitPer500" only when the pace column is headed "/500m" (average split as "m:ss.t"). Headed "watt": put the summary figure in "avgWatts" and return null for the split. Headed "cal/hr": null for both, because calories per hour is not watts.
- "avgWatts" only when a watts figure is shown.
- "strokeRate" is the "s/m" figure of the summary row.

Interval rows ("intervals"):
- One entry per visible row under the summary, top to bottom, never the summary row itself.
- A row's "metres" and "time" are THAT ROW'S OWN distance and time, because the app adds the rows up. How the screen shows them depends on the title:
  - Intervals (like 8x500m/1:00r): time and meter are already the rep's own. Copy them.
  - One distance piece cut into splits (title "5000m"): "time" is the split's own time, but "meter" counts UP (1000, 2000, 3000...). Return the difference to the row above (1000 each), never the running total.
  - One timed piece cut into splits (title "30:00"): "meter" is the split's own distance, but "time" counts UP (6:00.0, 12:00.0, 18:00.0...). Return the difference to the row above (6:00.0 each).
  - If the row above is cut off or unreadable you can't take a difference: return null for that value.
- "time" is "m:ss.t" (or "h:mm:ss.t" over an hour). "splitPer500" and "strokeRate" are as displayed, under the same pace-column rule as above.
- "label" is null: the PM5 doesn't name its rows. Fill it only if a row visibly carries its own name or number.
- Return an EMPTY ARRAY when the screen shows no rows. Never invent rows, and never split a total into equal pieces yourself.

Machines:
- "C2" is a Concept2 RowErg or SkiErg monitor, "RP3" is an RP3, and "other" is anything else.
- Concept2 BikeErg: the pace column is headed "/1000m" and the rate column "rpm" (pedal cadence). Neither is a rowing split or a stroke rate. Set monitor to "other", return null for "splitPer500" and "strokeRate" (summary and every row), and still read time, metres and watts.`;

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
    intervals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { anyOf: [{ type: "string" }, { type: "null" }] },
          metres: { anyOf: [{ type: "integer" }, { type: "null" }] },
          time: { anyOf: [{ type: "string" }, { type: "null" }] },
          splitPer500: { anyOf: [{ type: "string" }, { type: "null" }] },
          strokeRate: { anyOf: [{ type: "integer" }, { type: "null" }] },
        },
        required: ["label", "metres", "time", "splitPer500", "strokeRate"],
      },
    },
  },
  required: [
    "monitor",
    "totalMinutes",
    "totalMetres",
    "splitPer500",
    "strokeRate",
    "avgWatts",
    "confident",
    "intervals",
  ],
} as const;

export type ErgMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type ErgReadCost = { inputTokens: number; outputTokens: number; cents: number };

export type ErgRead =
  | { result: unknown; cost: ErgReadCost }
  // The model declined or produced no answer text — nothing to parse.
  | { error: "no_output"; stopReason: string | null; cost: ErgReadCost };

// Throws on an API failure or an unparseable answer; the caller decides what
// the user sees.
export async function readErgPhoto(
  client: Anthropic,
  media: ErgMediaType,
  data: string,
): Promise<ErgRead> {
  const resp = await client.messages.create(
    {
      model: ERG_MODEL,
      max_tokens: 4096, // an interval screen can be a dozen rows
      // Reading numbers off a screen is extraction work, so effort stays low —
      // at low the model skips thinking on most simple photos. (Sonnet 5.5
      // rejects thinking "disabled"; adaptive + low effort is the cheap path.)
      thinking: { type: "adaptive" },
      // Caches once the prompt passes the model's minimum (512 tokens on Sonnet
      // 5.5). Scans cluster on test days, so back-to-back ones read it cheaply.
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
      output_config: { effort: "low", format: { type: "json_schema", schema } },
    },
    // One photo, one answer: a hung upstream call should fail the scan, not
    // hold a serverless function open, and a retry would only double the bill.
    { timeout: 45_000, maxRetries: 1 },
  );

  const u = resp.usage;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cost: ErgReadCost = {
    inputTokens: u.input_tokens + cacheWrite + cacheRead,
    outputTokens: u.output_tokens,
    cents:
      Math.round(
        (u.input_tokens * CENTS_IN +
          cacheWrite * CENTS_IN * 1.25 +
          cacheRead * CENTS_IN * 0.1 +
          u.output_tokens * CENTS_OUT) *
          100,
      ) / 100,
  };

  const text = resp.content.find((b) => b.type === "text");
  if (resp.stop_reason === "refusal" || !text || text.type !== "text") {
    return { error: "no_output", stopReason: resp.stop_reason, cost };
  }
  return { result: JSON.parse(text.text), cost };
}
