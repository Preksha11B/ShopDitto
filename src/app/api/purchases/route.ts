// POST /api/purchases — Record a verified product purchase for the user
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import type { DigitalTwin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const productId = body?.productId;
    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'productId'" }, { status: 400 });
    }

    const user = await getOrCreateDemoUser();

    // Check product existence
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { platformPrices: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Determine purchase price
    const inStock = product.platformPrices.filter((p) => p.inStock);
    const candidates = inStock.length > 0 ? inStock : product.platformPrices;
    const best = candidates.length > 0
      ? candidates.reduce((min, p) => (p.price < min.price ? p : min), candidates[0])
      : { price: product.basePrice, mrp: product.basePrice * 1.15, platform: "amazon" };

    // 1. Upsert or update recommendation record with status 'purchased'
    const existingRec = await db.recommendation.findFirst({
      where: { userId: user.id, productId: product.id },
      orderBy: { createdAt: "desc" },
    });

    let recId = existingRec?.id;
    if (existingRec) {
      await db.recommendation.update({
        where: { id: existingRec.id },
        data: { status: "purchased" },
      });
    } else {
      const createdRec = await db.recommendation.create({
        data: {
          userId: user.id,
          productId: product.id,
          shoppingScore: 88,
          scoreBreakdown: JSON.stringify({ price: 85, review: 88, preference: 90 }),
          explanation: `Direct purchase recorded for ${product.name}`,
          intent: "recommendation",
          status: "purchased",
        },
      });
      recId = createdRec.id;
    }

    // 2. Log purchase in episodic memory
    const memKey = `purchase_${product.id}`;
    const existingMem = await db.memory.findFirst({
      where: { userId: user.id, key: memKey },
    });

    if (existingMem) {
      await db.memory.update({
        where: { id: existingMem.id },
        data: {
          value: product.name,
          confidence: 95,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.memory.create({
        data: {
          userId: user.id,
          type: "episodic",
          category: "event",
          key: memKey,
          value: product.name,
          confidence: 95,
          source: "purchase",
        },
      });
    }

    // 3. Log purchase timeline event
    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "purchase",
        title: `Purchased ${product.name}`,
        productId: product.id,
        description: `Verified purchase recorded at ₹${best.price.toLocaleString("en-IN")}`,
        metadata: JSON.stringify({
          recommendationId: recId,
          brand: product.brand,
          category: product.category,
          price: best.price,
          platform: best.platform,
        }),
      },
    });

    // 4. Evolve Digital Twin confidence and traits
    if (user.digitalTwin) {
      try {
        const twin = JSON.parse(user.digitalTwin) as DigitalTwin;
        twin.purchaseConfidence = Math.min(100, (twin.purchaseConfidence ?? 50) + 4);
        twin.shoppingConsistency = Math.min(100, (twin.shoppingConsistency ?? 60) + 3);
        if (twin.preferredBrands && !twin.preferredBrands.includes(product.brand)) {
          twin.preferredBrands = [...twin.preferredBrands, product.brand];
        }
        if (twin.preferredCategories && !twin.preferredCategories.includes(product.category)) {
          twin.preferredCategories = [...twin.preferredCategories, product.category];
        }

        await db.user.update({
          where: { id: user.id },
          data: {
            digitalTwin: JSON.stringify(twin),
            twinConfidence: Math.min(100, (user.twinConfidence ?? 60) + 3),
          },
        });
      } catch (e) {
        console.warn("[api/purchases] Failed to evolve twin:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Purchase recorded for ${product.name}`,
      product: {
        id: product.id,
        name: product.name,
        price: best.price,
        platform: best.platform,
      },
    });
  } catch (err: any) {
    if (err?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("[api/purchases POST] error:", err);
    return NextResponse.json(
      { error: "Failed to record purchase", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
