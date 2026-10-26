// POST /api/image-search — analyze uploaded product image via VLM, find similar products
// Body: { image: "<base64 data URL>" }
// Returns: { analysis: {category, brand, type, color, features}, products: [matched products] }

import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { z } from "zod";
import { getOrCreateDemoUser } from "@/lib/session";
import { memoryAgent, digitalTwinAgent, recommendationAgent, searchAgent } from "@/lib/agents";
import type { IntentResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let zaiInstance: ZAI | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

interface AnalyzedProduct {
  category: string;
  brand?: string;
  type?: string;
  color?: string;
  features: string[];
  description: string;
}

const analysisSchema = z.object({
  category: z.string().min(1),
  brand: z.string().optional().default("unknown"),
  type: z.string().optional().default("product"),
  color: z.string().optional().default(""),
  features: z.array(z.string()).optional().default([]),
  description: z.string().optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageDataUrl = body?.image;
    if (!imageDataUrl || typeof imageDataUrl !== "string" || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(imageDataUrl)) {
      return NextResponse.json({ error: "Missing 'image' field (base64 data URL)" }, { status: 400 });
    }

    // Use VLM to analyze the product image
    const systemPrompt = `You are a product analysis agent for AI Shopping OS. Analyze this product image and extract shopping-relevant attributes.

Return STRICT JSON:
{
  "category": "<specific visible product type such as frock, dress, jeans, shirt, shoes, laptop, phone, or unknown>",
  "brand": "<detected brand name, or 'unknown'>",
  "type": "<specific product type, or 'product'>",
  "color": "<primary visible color, or '' if unclear>",
  "features": ["<visible features, e.g. 'mechanical keyboard', 'USB-C port', 'leather strap'>"],
  "description": "<1-2 sentence description of what you see>"
}

Rules:
- Be specific about the category
- If the image is not clearly a product, set category to "unknown" and type to "product"
- Do not invent brand, color, material, gender, size, or occasion
- Focus on shopping-relevant attributes
Return ONLY the JSON.`;

    let rawAnalysis = "";

    // 1. Try Gemini 2.5 Flash Vision
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const match = imageDataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiKey.trim(),
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: systemPrompt },
                      {
                        inlineData: {
                          mimeType,
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
              }),
            }
          );
          if (gRes.ok) {
            const gData = await gRes.json();
            rawAnalysis = gData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          }
        }
      } catch (geminiErr) {
        console.warn("[api/image-search] Gemini vision error:", geminiErr);
      }
    }

    // 2. Fallback to z-ai-web-dev-sdk if needed
    if (!rawAnalysis.trim()) {
      try {
        const zai = await getZai();
        const visionResponse = await (zai as any).chat.completions.createVision({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          thinking: { type: "disabled" },
        });
        rawAnalysis = visionResponse?.choices?.[0]?.message?.content ?? "";
      } catch (visionErr: any) {
        const msg = visionErr?.message ?? String(visionErr);
        const isRateLimit = msg.includes("429") || msg.includes("Too many requests");
        console.error("[api/image-search] vision error:", msg);
      }
    }

    if (!rawAnalysis.trim()) {
      return NextResponse.json({
        analysis: { category: "unknown", brand: "unknown", type: "product", color: "", features: [], description: "The vision model returned no product analysis." },
        products: [],
        error: "empty_vision_response",
      }, { status: 422 });
    }

    // Parse and validate the structured vision result.
    let analysis: AnalyzedProduct;
    try {
      let cleaned = rawAnalysis.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      if (first === -1 || last === -1) throw new Error("Vision response did not contain JSON");
      analysis = analysisSchema.parse(JSON.parse(cleaned));
    } catch {
      return NextResponse.json({
        analysis: { category: "unknown", brand: "unknown", type: "product", color: "", features: [], description: rawAnalysis.slice(0, 200) },
        products: [],
        error: "invalid_vision_output",
      }, { status: 422 });
    }

    if (analysis.category === "unknown") {
      return NextResponse.json({ analysis, products: [], error: "no_product_identified" }, { status: 422 });
    }

    const user = await getOrCreateDemoUser();
    const intent: IntentResult = {
      intent: "product_search",
      category: analysis.category.toLowerCase(),
      productType: (analysis.type || analysis.category).toLowerCase(),
      attributes: analysis.color ? { color: analysis.color.toLowerCase() } : {},
      useCase: [analysis.type, ...analysis.features].filter(Boolean).join(" "),
      brands: analysis.brand && analysis.brand !== "unknown" ? [analysis.brand.toLowerCase()] : [],
      missing: [],
      complexity: "simple",
    };
    const catalogProducts = await searchAgent(intent, 12);
    const memories = user.memoryEnabled ? await memoryAgent(user.id, intent) : [];
    const twin = user.personalizationEnabled ? await digitalTwinAgent(user.id) : null;
    const recommendations = await recommendationAgent(catalogProducts, memories, twin, intent, 6);
    const products = recommendations.map((product) => ({
      ...product,
      id: product.productId,
      matchReason: "MARE match",
    }));

    return NextResponse.json({ analysis, intent, products, noMatches: products.length === 0 });
  } catch (err: any) {
    console.error("[api/image-search] error:", err);
    // Return graceful fallback instead of 500
    return NextResponse.json({
      analysis: { category: "unknown", brand: "unknown", type: "product", color: "", features: [], description: "Analysis failed — please try again." },
      products: [],
      error: err?.message ?? String(err),
    }, { status: 500 });
  }
}
