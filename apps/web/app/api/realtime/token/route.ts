import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return NextResponse.json({ error: "cross_site_denied" }, { status: 403 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      {
        error: "realtime_not_configured",
        message: "Configure OPENAI_API_KEY on the server to enable Realtime voice.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      session: { type: "realtime", model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2.1" },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    return NextResponse.json(
      { error: "realtime_upstream_error" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  const payload = (await response.json()) as { value?: string; expires_at?: number };
  if (!payload.value)
    return NextResponse.json(
      { error: "invalid_realtime_secret" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    { value: payload.value, expires_at: payload.expires_at },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
