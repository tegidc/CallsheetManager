// Supabase Edge Function: ai-scan
// Thin proxy to the Anthropic Messages API. Holds ANTHROPIC_API_KEY as a
// server-side secret (Deno.env) — the key never reaches the client. The
// frontend sends the full chat history + compact crew/location summaries;
// this function builds the system prompt, calls Anthropic with tool
// definitions enabled, and returns the raw response content back untouched.
//
// Deploy: supabase functions deploy ai-scan
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (never commit this)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGIN = "https://tegidc.github.io";
const ANTHROPIC_VERSION = "2023-06-01";
// Sonnet-tier is the right cost/capability balance for this — not Opus (too
// expensive for a proposal-extraction chat), not Haiku (not reliable enough
// at judging when to propose vs. ask a clarifying question).
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 4096;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TOOLS = [
  {
    name: "propose_shoot_date",
    description:
      "Propose adding a new shoot day to the project. Only call this for a specific, CONFIRMED date — never a vague timeframe like 'sometime in September'.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "ISO date, YYYY-MM-DD" },
        label: {
          type: "string",
          description:
            "A short label for what happens this day, e.g. 'Interview shoot at the warehouse'",
        },
        notes: { type: "string", description: "Optional additional notes for this day" },
      },
      required: ["date", "label"],
    },
  },
  {
    name: "propose_location",
    description:
      "Propose a shoot location — either a brand new one, or assigning one already in the location database (via match_id). Only call this for a specific, named place.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Location name" },
        address_or_notes: {
          type: "string",
          description: "Address, or free-text notes about the location if no clean address is known",
        },
        match_id: {
          type: "string",
          description:
            "The id of a matching existing location from the provided database summary, if reasonably confident. Omit this property entirely if this is a new location.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "propose_crew",
    description:
      "Propose a crew member — either a brand new person, or assigning one already in the crew database (via match_id). Only call this for a specific, named person with a specific role.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        department: {
          type: "string",
          description: "The department this role belongs to",
          enum: [
            "Production", "Client", "Talent", "Cinematography", "Audio", "Grip",
            "Equipment", "Set", "Vanities", "Catering & Travel", "Post Production", "Other",
          ],
        },
        role: { type: "string", description: "Their role/job title, e.g. 'Sound Recordist', '1st AD'" },
        match_id: {
          type: "string",
          description:
            "The id of a matching existing crew member from the provided database summary, if reasonably confident. Omit this property entirely if this is a new person.",
        },
      },
      required: ["name", "department", "role"],
    },
  },
];

function buildSystemPrompt(crewSummary: unknown[], locationSummary: unknown[]): string {
  return `You are helping a film/video production assistant fill in a call sheet project by chatting about it and reading any briefing documents they attach.

Whenever you are CONFIDENT about a specific, concrete element, propose it using the matching tool:
- A confirmed shoot date -> propose_shoot_date
- A specific named location -> propose_location
- A specific named crew member with a role -> propose_crew

Do NOT propose vague or unconfirmed information (e.g. "sometime in September", "we'll need a sound person" with no name attached). If something is unclear or incomplete, ask a short clarifying question in your text reply instead of guessing or forcing a proposal. It is much better to ask than to propose something uncertain.

Only propose locations, crew and shoot dates — nothing else. There is no tool for tasks, equipment, or schedule items right now; if the user mentions something like that, just acknowledge it in your text reply, don't invent a tool call for it.

MATCHING EXISTING RECORDS
You are given the current crew and location databases below (id, name, and role/type only — not full records). When you propose a location or crew member, check whether it likely already exists in these lists: same or a very similar name (allowing minor spelling variance), in a plausible role. If you are reasonably confident it's the same person/place, include their id as match_id. If you are not confident, omit match_id entirely and propose it as new — a human reviews every proposal before anything is added, so err toward "new" when unsure rather than guessing a match.

Existing crew (id, name, role):
${JSON.stringify(crewSummary)}

Existing locations (id, name):
${JSON.stringify(locationSummary)}

Keep your text replies short and conversational.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      { error: "AI Scan isn't configured yet — the server has no Anthropic API key set." },
      500,
    );
  }

  let body: { messages?: unknown[]; crewSummary?: unknown[]; locationSummary?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return jsonResponse({ error: "No messages provided" }, 400);
  }

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(body.crewSummary || [], body.locationSummary || []),
        tools: TOOLS,
        messages,
      }),
    });
  } catch (err) {
    return jsonResponse({ error: "Could not reach the Anthropic API: " + String(err) }, 502);
  }

  const data = await anthropicRes.json();
  if (!anthropicRes.ok) {
    return jsonResponse(
      { error: data?.error?.message || "Anthropic API error", detail: data },
      anthropicRes.status,
    );
  }

  return jsonResponse({ content: data.content, stop_reason: data.stop_reason });
});
