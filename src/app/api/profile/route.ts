import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { clusterPersona, buildInitialTwin } from "@/lib/persona";
import type { OnboardingData, DigitalTwin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUDGET_MAP: Record<string, number> = {
  low: 5000,
  mid: 15000,
  high: 50000,
  premium: 80000,
  "under-5000": 2500,
  "5000-15000": 10000,
  "15000-30000": 22500,
  "30000-50000": 40000,
  "50000-80000": 65000,
  "80000-plus": 100000,
};

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    let preferences: OnboardingData | null = null;
    if (user.onboarding) {
      try {
        preferences = JSON.parse(user.onboarding) as OnboardingData;
      } catch {
        preferences = null;
      }
    }

    let twin: DigitalTwin | null = null;
    if (user.digitalTwin) {
      try {
        twin = JSON.parse(user.digitalTwin) as DigitalTwin;
      } catch {
        twin = null;
      }
    }

    const [memoriesCount, wishlistCount, connectedCount] = await Promise.all([
      db.memory.count({ where: { userId: user.id } }),
      db.wishlistItem.count({ where: { userId: user.id } }),
      db.connectedAccount.count({ where: { userId: user.id, connected: true } }),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        personaCluster: user.personaCluster,
        twinConfidence: user.twinConfidence,
        memoryEnabled: user.memoryEnabled,
        personalizationEnabled: user.personalizationEnabled,
        hasOnboarded: user.onboardingCompleted,
        createdAt: user.createdAt,
      },
      preferences: {
        categories: preferences?.categories || [],
        brands: preferences?.brands || [],
        budgetRange: preferences?.budgetRange || "30000-50000",
        budgetRangeLabel: preferences?.budgetRangeLabel || "₹30,000 – ₹50,000",
        budgetStyle: preferences?.budgetStyle || "Value-focused",
        platforms: preferences?.platforms || ["amazon", "flipkart"],
        shoppingFrequency: preferences?.shoppingFrequency || "monthly",
        shoppingStyle: preferences?.shoppingStyle || "The Balanced Shopper",
        purchasePriorities: preferences?.purchasePriorities || ["price", "reviews", "performance", "discount", "brand"],
        discountImportance: preferences?.discountImportance ?? 3,
        deliverySpeed: preferences?.deliverySpeed ?? 3,
        techFamiliarity: preferences?.techFamiliarity ?? 3,
        lifestyle: preferences?.lifestyle || "",
      },
      digitalTwin: twin,
      stats: {
        memoriesCount,
        wishlistCount,
        connectedCount,
      },
    });
  } catch (err: any) {
    if (err?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("[api/profile GET] error:", err);
    return NextResponse.json(
      { error: "Failed to load user profile", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getOrCreateDemoUser();
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Name validation
    const name = typeof body.name === "string" && body.name.trim().length >= 2 ? body.name.trim() : user.name;

    // Email validation & uniqueness
    let email = user.email;
    if (typeof body.email === "string" && body.email.trim().length > 0) {
      const trimmedEmail = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      if (trimmedEmail !== user.email) {
        const existing = await db.user.findFirst({
          where: { email: trimmedEmail, NOT: { id: user.id } },
        });
        if (existing) {
          return NextResponse.json({ error: "This email address is already in use." }, { status: 400 });
        }
        email = trimmedEmail;
      }
    }

    // Merge preferences
    let prevOnboarding: Partial<OnboardingData> = {};
    if (user.onboarding) {
      try {
        prevOnboarding = JSON.parse(user.onboarding);
      } catch {
        prevOnboarding = {};
      }
    }

    const categories = Array.isArray(body.categories) ? body.categories.map((c: any) => String(c).trim()).filter(Boolean) : (prevOnboarding.categories || []);
    const brands = Array.isArray(body.brands) ? body.brands.map((b: any) => String(b).trim()).filter(Boolean) : (prevOnboarding.brands || []);
    const budgetRange = typeof body.budgetRange === "string" && body.budgetRange ? body.budgetRange : (prevOnboarding.budgetRange || "30000-50000");
    const budgetRangeLabel = typeof body.budgetRangeLabel === "string" && body.budgetRangeLabel ? body.budgetRangeLabel : (prevOnboarding.budgetRangeLabel || "₹30,000 – ₹50,000");
    const budgetStyle = typeof body.budgetStyle === "string" ? body.budgetStyle : (prevOnboarding.budgetStyle || "Value-focused");
    const platforms = Array.isArray(body.platforms) ? body.platforms : (prevOnboarding.platforms || ["amazon", "flipkart"]);
    const shoppingFrequency = typeof body.shoppingFrequency === "string" ? body.shoppingFrequency : (prevOnboarding.shoppingFrequency || "monthly");
    const shoppingStyle = typeof body.shoppingStyle === "string" ? body.shoppingStyle : (prevOnboarding.shoppingStyle || "The Balanced Shopper");
    const purchasePriorities = Array.isArray(body.purchasePriorities) ? body.purchasePriorities : (prevOnboarding.purchasePriorities || ["price", "reviews", "performance", "discount", "brand"]);
    const discountImportance = typeof body.discountImportance === "number" ? Math.max(1, Math.min(5, body.discountImportance)) : (prevOnboarding.discountImportance ?? 3);
    const deliverySpeed = typeof body.deliverySpeed === "number" ? Math.max(1, Math.min(5, body.deliverySpeed)) : (prevOnboarding.deliverySpeed ?? 3);
    const lifestyle = typeof body.lifestyle === "string" ? body.lifestyle : (prevOnboarding.lifestyle || "");

    const updatedPreferences: OnboardingData = {
      ...prevOnboarding,
      categories,
      brands,
      budgetRange,
      budgetRangeLabel,
      budgetStyle,
      platforms,
      shoppingFrequency,
      shoppingStyle,
      purchasePriorities,
      discountImportance,
      deliverySpeed,
      techFamiliarity: typeof body.techFamiliarity === "number" ? body.techFamiliarity : (prevOnboarding.techFamiliarity ?? 3),
      lifestyle,
    };

    // Recalculate persona & digital twin
    const cluster = clusterPersona(updatedPreferences);
    const freshTwin = buildInitialTwin(cluster, updatedPreferences);

    let currentTwin: Partial<DigitalTwin> = {};
    if (user.digitalTwin) {
      try {
        currentTwin = JSON.parse(user.digitalTwin);
      } catch {
        currentTwin = {};
      }
    }

    const mergedTwin: DigitalTwin = {
      ...freshTwin,
      ...currentTwin,
      preferredBrands: brands,
      preferredCategories: categories,
      preferredPlatforms: platforms,
      shoppingStyle,
      budgetRange: budgetRangeLabel || budgetRange,
      discountPreference: discountImportance * 20,
    };

    const budgetValue = BUDGET_MAP[budgetRangeLabel] ?? BUDGET_MAP[budgetRange] ?? 50000;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        personaCluster: cluster,
        digitalTwin: JSON.stringify(mergedTwin),
        twinConfidence: Math.max(user.twinConfidence || 20, 35),
        onboarding: JSON.stringify(updatedPreferences),
        onboardingCompleted: true,
      },
    });

    // Synchronize long_term memories
    const profileMemories = [
      {
        type: "long_term",
        category: "brand",
        key: "preferred_brands",
        value: JSON.stringify(brands),
        confidence: 90,
        source: "explicit",
      },
      {
        type: "long_term",
        category: "category",
        key: "preferred_categories",
        value: JSON.stringify(categories),
        confidence: 90,
        source: "explicit",
      },
      {
        type: "long_term",
        category: "platform",
        key: "preferred_platforms",
        value: JSON.stringify(platforms),
        confidence: 85,
        source: "explicit",
      },
      {
        type: "long_term",
        category: "budget",
        key: "budget_range",
        value: String(budgetValue),
        confidence: 90,
        source: "explicit",
      },
      {
        type: "long_term",
        category: "habit",
        key: "shopping_style",
        value: shoppingStyle,
        confidence: 85,
        source: "explicit",
      },
      {
        type: "long_term",
        category: "preference",
        key: "purchase_priorities",
        value: JSON.stringify(purchasePriorities),
        confidence: 85,
        source: "explicit",
      },
    ];

    for (const mem of profileMemories) {
      const existing = await db.memory.findFirst({
        where: { userId: user.id, key: mem.key, category: mem.category },
      });
      if (existing) {
        await db.memory.update({
          where: { id: existing.id },
          data: { value: mem.value, confidence: mem.confidence, source: mem.source, updatedAt: new Date() },
        });
      } else {
        await db.memory.create({
          data: {
            userId: user.id,
            type: mem.type,
            category: mem.category,
            key: mem.key,
            value: mem.value,
            confidence: mem.confidence,
            source: mem.source,
          },
        });
      }
    }

    // Audit timeline entry
    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "twin_update",
        title: "Profile & Preferences Updated",
        description: `Updated profile details: Budget (${budgetRangeLabel || budgetRange}), ${brands.length} favorite brand(s), ${categories.length} category(ies).`,
      },
    });

    // Notify user
    await db.notification.create({
      data: {
        userId: user.id,
        type: "profile_updated",
        title: "Profile Preferences Updated",
        message: `Your shopping budget (${budgetRangeLabel || budgetRange}) and favorite brands (${brands.slice(0, 3).join(", ") || "custom"}) have been saved.`,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        personaCluster: updatedUser.personaCluster,
        twinConfidence: updatedUser.twinConfidence,
        memoryEnabled: updatedUser.memoryEnabled,
        personalizationEnabled: updatedUser.personalizationEnabled,
        hasOnboarded: updatedUser.onboardingCompleted,
      },
      preferences: updatedPreferences,
      digitalTwin: mergedTwin,
    });
  } catch (err: any) {
    if (err?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("[api/profile PUT] error:", err);
    return NextResponse.json(
      { error: "Failed to update profile", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;
