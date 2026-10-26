// POST /api/web-search — search the web for real-time product info, reviews, news
// Body: { query: string, num?: number, recency_days?: number }
// Returns: { results: [{ url, name, snippet, host_name, rank, date, favicon }] }

import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let zaiInstance: ZAI | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

/** Safely extract hostname from a URL string without throwing */
function safeHostname(url: string): string {
  try {
    return url ? new URL(url).hostname : "";
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query;
    const num = body?.num ?? 5;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing 'query' field" }, { status: 400 });
    }

    // 1. Try Serper Google Search if configured
    const serperKey = process.env.SERPER_API_KEY;
    if (serperKey) {
      try {
        const serperRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query, gl: "in", hl: "en", num }),
        });

        if (serperRes.ok) {
          const serperData = await serperRes.json();
          const organic = Array.isArray(serperData.organic) ? serperData.organic : [];
          const clean = organic.slice(0, num).map((r: any, i: number) => ({
            url: r.link ?? "",
            name: r.title ?? "Untitled",
            snippet: r.snippet ?? "",
            host_name: safeHostname(r.link ?? ""),
            rank: r.position ?? i + 1,
            date: r.date ?? "",
            favicon: `https://www.google.com/s2/favicons?domain=${safeHostname(r.link ?? "")}`,
          }));
          return NextResponse.json({ results: clean, query });
        }
      } catch (serperErr) {
        console.warn("[api/web-search] Serper search error:", serperErr);
      }
    }

    // 2. Fallback to z-ai-web-dev-sdk
    try {
      const zai = await getZai();
      const results: any = await (zai as any).functions.invoke("web_search", { query, num });
      let arr: any[] = [];
      if (Array.isArray(results)) arr = results;
      else if (results && Array.isArray(results.results)) arr = results.results;
      else if (results && Array.isArray((results as any).data)) arr = (results as any).data;

      const clean = arr.slice(0, num).map((r: any, i: number) => ({
        url: r.url ?? r.link ?? "",
        name: r.name ?? r.title ?? "Untitled",
        snippet: r.snippet ?? r.description ?? "",
        host_name: r.host_name ?? safeHostname(r.url ?? r.link ?? ""),
        rank: r.rank ?? i + 1,
        date: r.date ?? "",
        favicon: r.favicon ?? "",
      }));

      return NextResponse.json({ results: clean, query });
    } catch (invokeErr: any) {
      return NextResponse.json({ results: [], query });
    }
  } catch (err: any) {
    console.error("[api/web-search] error:", err);
    return NextResponse.json({ results: [], error: err?.message ?? String(err) });
  }
}
