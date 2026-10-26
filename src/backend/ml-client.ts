import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Configurable Python executable and service endpoint
const PYTHON_PATH = process.env.PYTHON_ML_PATH || "D:\\Anaconda\\python.exe";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
const COORDINATOR_SCRIPT = path.resolve(process.cwd(), "src", "backend", "ml", "coordinator.py");

export interface MLCoordinationPayload {
  message: string;
  userId?: string;
  twin?: any;
  twinConfidence?: number;
  memories?: any[];
  products?: any[];
  priceHistory?: number[];
}

export interface MLCoordinationResult {
  status: string;
  models_coordinated: number[];
  intent: {
    intent: string;
    confidence: number;
    category?: string | null;
    productType?: string | null;
    budget?: number | null;
    brands?: string[];
    useCase?: string | null;
    complexity: "simple" | "moderate" | "complex";
  };
  ahde_plan: {
    requiredAgents: string[];
    skippedAgents: string[];
    modelTier: "fast" | "standard" | "deep";
    parallel: boolean;
  };
  recommendations: any[];
  price_advice: {
    trend: "rising" | "falling" | "stable";
    action: "BUY_NOW" | "GOOD_DEAL" | "WAIT" | "FAIR_PRICE";
    advice: string;
    avgPrice: number;
    lowest: number;
    highest: number;
  };
  review_analysis: {
    productName: string;
    sentimentScore: number;
    pros: string[];
    cons: string[];
  };
  explanation: string;
  evolved_twin?: Record<string, number>;
}

/**
 * Executes a full multi-agent coordinated pass through all 7 ML models.
 * Attempts fast HTTP connection first; falls back to direct Python invocation.
 */
export async function coordinateWith7Models(
  payload: MLCoordinationPayload
): Promise<MLCoordinationResult | null> {
  // 1. Try HTTP microservice if active
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${ML_SERVICE_URL}/coordinate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as MLCoordinationResult;
      return data;
    }
  } catch {
    // Service not running on HTTP, proceed to direct CLI execution
  }

  // 2. Direct Python process invocation
  try {
    const jsonInput = JSON.stringify(payload);
    const { stdout } = await execFileAsync(
      PYTHON_PATH,
      [COORDINATOR_SCRIPT, "--coordinate", jsonInput],
      { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }
    );
    const trimmed = stdout.trim();
    // Parse JSON output from the command
    const jsonStart = trimmed.indexOf("{");
    if (jsonStart !== -1) {
      const parsed = JSON.parse(trimmed.slice(jsonStart)) as MLCoordinationResult;
      return parsed;
    }
  } catch (err) {
    console.warn("[ML Client] Direct Python execution error:", err);
  }

  return null;
}

/**
 * Query Model 1 (Intent DistilBERT) directly
 */
export async function callModel1Intent(text: string) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return null;
}

/**
 * Query Model 2 (AHDE Routing Classifier) directly
 */
export async function callModel2Ahde(params: {
  intent: string;
  query_len: number;
  complexity: string;
  twin_conf: number;
  mem_count: number;
  has_budget: boolean;
}) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/ahde`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return null;
}

/**
 * Query Model 3 (DToC Dynamic Trajectory Evolution)
 */
export async function callModel3EvolveTwin(currentTraits: any, signal: any) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/twin/evolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_traits: currentTraits, signal }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.traits;
    }
  } catch {
    // fallback
  }
  return null;
}
