// LLM helper supporting Google Gemini API (primary) with z-ai-web-dev-sdk (fallback)
import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: ZAI | null = null;

export async function getLLM() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export interface ChatMessageLLM {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call Google Gemini 2.5 Flash via REST
 */
async function callGemini(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const body: Record<string, any> = {
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
      },
    };

    if (systemPrompt && systemPrompt.trim()) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt.trim() }],
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[Gemini] API error:", res.status, err);
      return "";
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch (err) {
    console.error("[Gemini] Request error:", err);
    return "";
  }
}

/**
 * Call the LLM with a system prompt and user message.
 * Returns the assistant's text response.
 */
export async function llmChat(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; thinking?: boolean }
): Promise<string> {
  // 1. Try Gemini 2.5 Flash if GEMINI_API_KEY is configured
  if (process.env.GEMINI_API_KEY) {
    const geminiText = await callGemini(systemPrompt, userMessage, options);
    if (geminiText) return geminiText;
  }

  // 2. Fallback to z-ai-web-dev-sdk
  try {
    const zai = await getLLM();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      thinking: { type: options?.thinking ? "enabled" : "disabled" },
      temperature: options?.temperature,
    } as any);
    return completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    return "";
  }
}

/**
 * Call the LLM and parse a JSON object from the response.
 * Strips ```json fences and finds the first {...} block.
 */
export async function llmJson<T = any>(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; thinking?: boolean }
): Promise<T | null> {
  const raw = await llmChat(systemPrompt, userMessage, options);
  if (!raw) return null;
  // Strip code fences
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  // Find first { and last }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) {
    // try array
    const fa = cleaned.indexOf("[");
    const la = cleaned.lastIndexOf("]");
    if (fa !== -1 && la !== -1) {
      cleaned = cleaned.slice(fa, la + 1);
    }
  } else {
    cleaned = cleaned.slice(first, last + 1);
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("[LLM] JSON parse error:", err, "\nRaw:", raw);
    return null;
  }
}
