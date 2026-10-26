// POST /api/products/discover — discover REAL products from live Indian platforms
// Uses Serper Shopping / SerpApi live e-commerce search, normalized and cached into DB
// Body: { query: string, category?: string }
// Returns: { products: [normalized product data], source: "live" }

import { NextResponse } from "next/server";
import { searchLiveProducts } from "@/backend/live-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query;
    const category = body?.category;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing 'query' field" }, { status: 400 });
    }

    const liveProducts = await searchLiveProducts(query, { category, limit: 12 });

    if (liveProducts.length === 0) {
      return NextResponse.json({
        products: [],
        source: "live",
        message: "No live products found matching query.",
      });
    }

    const formatted = liveProducts.map((p) => {
      let specs = {};
      try {
        specs = typeof p.specs === "string" ? JSON.parse(p.specs || "{}") : p.specs;
      } catch {
        specs = {};
      }

      let pros = [];
      try {
        pros = typeof p.pros === "string" ? JSON.parse(p.pros || "[]") : (p.pros || []);
      } catch {
        pros = [];
      }

      let cons = [];
      try {
        cons = typeof p.cons === "string" ? JSON.parse(p.cons || "[]") : (p.cons || []);
      } catch {
        cons = [];
      }

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        specs,
        basePrice: p.basePrice,
        rating: p.rating,
        reviewCount: p.reviewCount,
        pros,
        cons,
        imageUrl: (p as any).imageUrl,
        imageColor: (p as any).imageColor || "#059669",
        platformPrices: p.platformPrices || [],
        source: "live",
      };
    });

    return NextResponse.json({
      products: formatted,
      source: "live",
    });
  } catch (err: any) {
    console.error("[api/products/discover] error:", err);
    return NextResponse.json({
      products: [],
      source: "live",
      error: err?.message ?? String(err),
    });
  }
}
