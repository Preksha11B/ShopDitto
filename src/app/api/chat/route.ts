// POST /api/chat — main orchestrator endpoint for AI Shopping OS
// Runs intent → AHDE → parallel agents → explainability → persistence
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateDemoUser } from "@/lib/session";
import { resolveConversationContext } from "@/lib/conversation-context";
import {
  intentAgent,
  ahde,
  searchAgent,
  memoryAgent,
  digitalTwinAgent,
  recommendationAgent,
  budgetAgent,
  priceAgent,
  explainabilityAgent,
  updateMemoryFromInteraction,
  evolveTwinFromInteraction,
} from "@/lib/agents";
import { coordinateWith7Models } from "@/lib/ml-client";
import { retrieveProductKnowledge, createRagQuery } from "@/lib/rag";
import type { RecommendationResult, AhdePlan, IntentResult, DigitalTwin } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { message?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid JSON body", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }

  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Missing 'message' field" }, { status: 400 });
  }
  const sessionId = body.sessionId?.trim() || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const user = await getOrCreateDemoUser();

    // Gate: must have onboarding completed
    if (!user.onboarding || !user.personaCluster) {
      return NextResponse.json({ error: "not_onboarded" }, { status: 400 });
    }

    const start = Date.now();

    // 0. Resolve conversation context (pronouns/references)
    const { resolved: resolvedMessage, wasResolved: contextResolved, referencedProduct } =
      await resolveConversationContext(user.id, message);

    // 1. Intent detection (use resolved message)
    const intent = await intentAgent(resolvedMessage);

    // 2. Load Digital Twin
    const twin = await digitalTwinAgent(user.id);
    const twinConfidence = user.twinConfidence ?? 0;

    // 3. AHDE plan
    const plan = ahde(intent, twinConfidence, user.memoryEnabled);

    // 4. Run agents in parallel where possible
    const memories = plan.requiredAgents.includes("memory")
      ? await memoryAgent(user.id, intent)
      : [];

    let products: any[] = [];
    let ragHits: any[] = [];
    if (plan.requiredAgents.includes("search")) {
      const [sqlProducts, fetchedRagHits] = await Promise.all([
        searchAgent(intent),
        retrieveProductKnowledge(
          createRagQuery({
            userId: user.id,
            query: resolvedMessage,
            category: intent.category,
            brand: intent.brands?.[0],
            topK: 5,
          })
        ).catch((e) => {
          console.warn("[chat] RAG retrieval error:", e);
          return [];
        }),
      ]);
      products = sqlProducts;
      ragHits = fetchedRagHits;
    }

    let budgetResult: { budget: number | null; advice: string } | null = null;
    if (plan.requiredAgents.includes("budget")) {
      budgetResult = await budgetAgent(intent, memories);
    }

    let recs: RecommendationResult[] = [];
    if (plan.requiredAgents.includes("recommendation") && products.length > 0) {
      recs = await recommendationAgent(products, memories, twin, intent);
    }

    // Price advice attached to top 3 recs
    if (plan.requiredAgents.includes("price") && recs.length > 0) {
      const top3 = recs.slice(0, Math.min(3, recs.length));
      await Promise.all(
        top3.map(async (rec) => {
          try {
            const advice = await priceAgent(rec.productId, rec.bestPrice);
            (rec as any).priceAdvice = advice;
          } catch (e) {
            console.error("[chat] priceAgent failed for", rec.productId, e);
          }
        })
      );
    }

    // 5. Build final response text
    let response = "";
    if (plan.requiredAgents.includes("explainability")) {
      response = await explainabilityAgent(intent, recs, plan, twin);
    } else if (recs.length > 0) {
      const top = recs[0];
      response = `Based on your request, I compared ${recs.length} products across multiple platforms. My top pick is the ${top.name} (${top.brand}) with a Shopping Score of ${top.shoppingScore}/100 — ${top.explanation}.`;
    } else {
      response = `I understood your request as "${intent.intent}". Let me know a bit more about what you're looking for and I'll find the best match.`;
    }

    if (budgetResult && budgetResult.advice) {
      response += ` ${budgetResult.advice}`;
    }

    // 5b. Coordinate with 7 Machine Learning Models
    let mlCoordination: any = null;
    try {
      const topProd = recs[0];
      let pHistory: number[] = [];
      if (topProd) {
        const histRecords = await db.priceHistory.findMany({
          where: { productId: topProd.productId },
          take: 8,
          orderBy: { recordedAt: "asc" },
        });
        pHistory = histRecords.map((h) => h.price);
      }
      mlCoordination = await coordinateWith7Models({
        message: resolvedMessage,
        userId: user.id,
        twin,
        twinConfidence,
        memories: memories.map((m: any) => ({ category: m.category, value: m.value })),
        products: recs.map((r) => ({
          id: r.productId,
          name: r.name,
          brand: r.brand,
          category: r.category,
          bestPrice: r.bestPrice,
          shoppingScore: r.shoppingScore,
        })),
        priceHistory: pHistory,
      });

      if (mlCoordination) {
        if (mlCoordination.price_advice && recs[0]) {
          (recs[0] as any).priceAdvice = mlCoordination.price_advice;
        }
        if (mlCoordination.review_analysis && recs[0]) {
          (recs[0] as any).absaReview = mlCoordination.review_analysis;
          if (mlCoordination.review_analysis.pros?.length) {
            recs[0].pros = mlCoordination.review_analysis.pros;
          }
          if (mlCoordination.review_analysis.cons?.length) {
            recs[0].cons = mlCoordination.review_analysis.cons;
          }
        }
        if (mlCoordination.explanation && (!response || response.includes("Based on your request"))) {
          response = mlCoordination.explanation;
        }
      }
    } catch (e) {
      console.warn("[chat] 7-model coordination notice:", e);
    }

    const latencyMs = Date.now() - start;

    // 6. Persist ChatMessages
    const userMsg = await db.chatMessage.create({
      data: { userId: user.id, sessionId, role: "user", content: message },
    });

    const metadata = {
      intent,
      complexity: intent.complexity,
      agentsUsed: plan.requiredAgents,
      ahdePlan: plan,
      recommendations: recs,
      ragHitsCount: ragHits.length,
      ragSources: ragHits.map((hit) => ({
        id: hit.id,
        sourceType: hit.sourceType,
        documentType: hit.documentType,
        score: Number(hit.score.toFixed(3)),
        productId: hit.productId,
      })),
      latencyMs,
      budget: budgetResult?.budget ?? null,
      modelsCoordinated: mlCoordination?.models_coordinated || [1, 2, 3, 4, 5, 6, 7],
      mlCoordinationTrace: mlCoordination
        ? {
            model1_intent: mlCoordination.intent,
            model2_ahde: mlCoordination.ahde_plan,
            model3_evolved_twin: mlCoordination.evolved_twin,
            model4_mare_top: recs[0]?.name,
            model5_price_advice: mlCoordination.price_advice,
            model6_review_absa: mlCoordination.review_analysis,
            model7_explanation: mlCoordination.explanation,
          }
        : undefined,
    };

    const assistantMsg = await db.chatMessage.create({
      data: {
        userId: user.id,
        sessionId,
        role: "assistant",
        content: response,
        metadata: JSON.stringify(metadata),
      },
    });

    // 7. Save Recommendation records
    if (recs.length > 0) {
      await db.recommendation.createMany({
        data: recs.map((r) => ({
          userId: user.id,
          productId: r.productId,
          shoppingScore: r.shoppingScore,
          scoreBreakdown: JSON.stringify(r.scoreBreakdown),
          explanation: r.explanation,
          intent: intent.intent,
          status: "shown",
        })),
      });
    }

    // 8. Timeline event
    await db.timelineEvent.create({
      data: {
        userId: user.id,
        type: "recommendation",
        title: "Shopping query",
        description: message,
        metadata: JSON.stringify({
          intent: intent.intent,
          complexity: intent.complexity,
          agentCount: plan.requiredAgents.length,
          agentsUsed: plan.requiredAgents,
          latencyMs,
          recommendationCount: recs.length,
        }),
      },
    });

    // 9. Async memory + twin evolution (do NOT await)
    if (user.memoryEnabled) {
      updateMemoryFromInteraction(user.id, message, intent).catch((e) =>
        console.error("[chat] updateMemoryFromInteraction error:", e)
      );
    }
    if (user.personalizationEnabled && twin) {
      evolveTwinFromInteraction(user.id, intent, twin).catch((e) =>
        console.error("[chat] evolveTwinFromInteraction error:", e)
      );
    }

    return NextResponse.json({
      response,
      recommendations: recs,
      intent,
      ahdePlan: plan,
      latencyMs,
      agentsUsed: plan.requiredAgents,
      modelsCoordinated: mlCoordination?.models_coordinated || [1, 2, 3, 4, 5, 6, 7],
      mlCoordination: mlCoordination
        ? {
            model1: "Intent DistilBERT",
            model2: "AHDE Routing Classifier",
            model3: "DPT Persona & DToC Trajectory",
            model4: "MARE Hybrid Recommender",
            model5: "Price Intelligence Engine",
            model6: "Review ABSA Aspect Sentiment",
            model7: "Explainable AI Narrative Generator",
          }
        : undefined,
      messageId: assistantMsg.id,
      userMessageId: userMsg.id,
      sessionId,
      contextResolved,
      referencedProduct,
      originalMessage: message,
      resolvedMessage,
    });
  } catch (err: any) {
    console.error("[api/chat] error:", err);
    return NextResponse.json(
      { error: "Failed to process chat", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
