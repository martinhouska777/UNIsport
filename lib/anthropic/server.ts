/*
  Server-side Anthropic client (NEVER import this into a client component).
  Reads ANTHROPIC_API_KEY from the server environment. `hasAnthropicKey()`
  lets routes fail soft with a clear message when the key isn't configured.
*/
import Anthropic from "@anthropic-ai/sdk";

export const hasAnthropicKey = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic(); // picks up ANTHROPIC_API_KEY
  return client;
}
