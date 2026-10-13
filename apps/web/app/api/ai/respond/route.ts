import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { openAiToolDefinitions } from "@motormind/ai-tools";

export const runtime = "nodejs";
const requestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  state: z.object({
    rpm: z.number().min(0).max(8000),
    selectedPartId: z.string().nullable(),
    activeFaultIds: z.array(z.string()).max(20),
    removedPartIds: z.array(z.string()).max(100),
  }),
});

export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return NextResponse.json({ error: "cross_site_denied" }, { status: 403 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "ai_not_configured", message: "The deterministic local copilot remains available." },
      { status: 503 },
    );
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.issues },
      { status: 400 },
    );
  const safetyIdentifier = createHash("sha256")
    .update(request.headers.get("x-session-id") ?? "anonymous-demo")
    .digest("hex");
  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_RESPONSES_MODEL ?? "gpt-6-astra",
      safety_identifier: safetyIdentifier,
      instructions:
        "You are MotorMind XR. Only request listed tools. Never invent measurements, torque, tolerances, or commercial-engine specifications. Explain model fidelity.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${parsed.data.message}\nScene state: ${JSON.stringify(parsed.data.state)}`,
            },
          ],
        },
      ],
      tools: openAiToolDefinitions,
      parallel_tool_calls: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!upstream.ok)
    return NextResponse.json(
      { error: "openai_upstream_error", requestId: upstream.headers.get("x-request-id") },
      { status: 502 },
    );
  const payload = await upstream.json();
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
