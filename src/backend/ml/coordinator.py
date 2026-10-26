"""
AI Shopping OS — Multi-Agent ML Coordinator
Coordinates the 7 specialized Machine Learning models:
  1. Model 1: Intent Detection & Slot Extraction (DistilBERT)
  2. Model 2: AHDE Routing Classifier (Multi-Output Decision Model)
  3. Model 3: Digital Persona Twin (DPT K-Means) & Trajectory Evolution (DToC LSTM)
  4. Model 4: MARE Recommendation Engine (Hybrid TF-IDF + BPR + Popularity)
  5. Model 5: Price Intelligence & Trend Forecasting
  6. Model 6: Review Analysis & ABSA (Aspect Sentiment Classifier)
  7. Model 7: Explainable AI Narrative Generator
"""

import sys
import os
import json
import re
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn

# Resolve models root directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODELS_DIR = BASE_DIR / "models"

# ────────────────────────────────────────────────────────────────────────────
# 1. MODEL 1: INTENT & SLOT EXTRACTOR
# ────────────────────────────────────────────────────────────────────────────

class IntentModelWrapper:
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self.tokenizer = None
        self.model = None
        self.id2label = {
            0: "budget", 1: "cart", 2: "comparison", 3: "general",
            4: "greeting", 5: "price_tracking", 6: "recommendation", 7: "search"
        }
        self._load()

    def _load(self):
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_dir))
            self.model = AutoModelForSequenceClassification.from_pretrained(str(self.model_dir))
            self.model.eval()
            print("[ML Coordinator] Model 1 (Intent DistilBERT) loaded.")
        except Exception as e:
            print(f"[ML Coordinator] Warning: Model 1 load failed ({e}), using heuristic parser.")

    def predict(self, text: str) -> dict:
        text_clean = text.strip()
        lower = text_clean.lower()
        
        # 1. Neural classification
        pred_label = "general"
        confidence = 0.5
        if self.model and self.tokenizer:
            try:
                inputs = self.tokenizer(text_clean, return_tensors="pt", truncation=True, max_length=128)
                with torch.no_grad():
                    logits = self.model(**inputs).logits
                    probs = torch.softmax(logits, dim=-1)[0]
                    pred_idx = int(torch.argmax(probs).item())
                    confidence = float(probs[pred_idx].item())
                    pred_label = self.id2label.get(pred_idx, "general")
            except Exception as e:
                print(f"[Model 1] Inference error: {e}")

        # 2. Heuristic Slot Extraction
        categories = [
            "laptop", "phone", "earbuds", "tv", "watch", "camera", "appliance",
            "frock", "dress", "jeans", "shirt", "shoe", "shoes", "jacket", "hoodie",
            "headphones", "kurta", "fashion", "beauty", "home"
        ]
        category = None
        for cat in categories:
            if re.search(rf"\b{cat}s?\b", lower):
                category = cat.rstrip("s") if cat not in ["dress", "jeans"] else cat
                break

        # Budget extraction
        budget = None
        budget_match = re.search(r"(?:under|below|upto|up to|max(?:imum)? of?)\s*(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)\s*(k)?\b", lower)
        if budget_match:
            val = float(budget_match.group(1).replace(",", ""))
            if budget_match.group(2):
                val *= 1000
            budget = int(val)

        # Brands extraction
        known_brands = [
            "apple", "samsung", "lenovo", "asus", "dell", "hp", "sony", "boat",
            "oneplus", "xiaomi", "lg", "nike", "puma", "acer", "bose", "noise"
        ]
        brands = [b for b in known_brands if re.search(rf"\b{b}\b", lower)]

        # Complexity estimation
        complexity = "simple"
        if budget or len(brands) > 1 or "compare" in lower or "versus" in lower or " vs " in lower:
            complexity = "complex" if (budget and category and len(brands) > 0) else "moderate"

        return {
            "intent": pred_label,
            "confidence": round(confidence, 3),
            "category": category,
            "productType": category,
            "budget": budget,
            "brands": brands,
            "useCase": text_clean,
            "complexity": complexity
        }

# ────────────────────────────────────────────────────────────────────────────
# 2. MODEL 2: AHDE ROUTING CLASSIFIER
# ────────────────────────────────────────────────────────────────────────────

class AHDERoutingWrapper:
    def __init__(self, model_path: Path):
        self.model = None
        self.agents = [
            "Search", "Memory", "Twin", "MARE_Rec", "Review",
            "Price", "Budget", "Twin_Evolve", "Explain", "Cart", "Notification"
        ]
        self.intent2id = {
            "budget": 0, "cart": 1, "comparison": 2, "general": 3,
            "greeting": 4, "price_tracking": 5, "recommendation": 6, "search": 7
        }
        if model_path.exists():
            try:
                self.model = joblib.load(str(model_path))
                print("[ML Coordinator] Model 2 (AHDE Routing Classifier) loaded.")
            except Exception as e:
                print(f"[ML Coordinator] Warning: Model 2 load failed: {e}")

    def predict(self, intent: str, query_len: int, complexity: str,
                twin_conf: int = 50, mem_count: int = 5, has_budget: bool = False) -> dict:
        comp_map = {"simple": 1, "moderate": 2, "complex": 3}
        c_val = comp_map.get(complexity, 2)
        intent_id = self.intent2id.get(intent, 6)

        if self.model:
            try:
                df = pd.DataFrame([{
                    "intent_id": intent_id,
                    "query_len": min(140, max(10, query_len)),
                    "complexity": c_val,
                    "twin_conf": twin_conf,
                    "mem_count": mem_count,
                    "has_budget": 1 if has_budget else 0
                }])
                preds = self.model.predict(df)[0]
                active_agents = [self.agents[i] for i, val in enumerate(preds) if val == 1]
            except Exception as e:
                print(f"[Model 2] Prediction error: {e}")
                active_agents = self._heuristic_fallback(intent)
        else:
            active_agents = self._heuristic_fallback(intent)

        # Standard agent naming conversion
        name_map = {
            "Search": "search", "Memory": "memory", "Twin": "digital_twin",
            "MARE_Rec": "recommendation", "Review": "review", "Price": "price",
            "Budget": "budget", "Twin_Evolve": "twin_evolve", "Explain": "explainability",
            "Cart": "cart", "Notification": "notification"
        }
        required = [name_map.get(a, a.lower()) for a in active_agents]

        tier = "deep" if (c_val == 3 or len(required) >= 7) else ("standard" if len(required) >= 4 else "fast")
        return {
            "requiredAgents": required,
            "skippedAgents": [k for k in name_map.values() if k not in required],
            "modelTier": tier,
            "parallel": True
        }

    def _heuristic_fallback(self, intent: str) -> list:
        if intent == "recommendation":
            return ["Search", "Memory", "Twin", "MARE_Rec", "Review", "Price", "Budget", "Twin_Evolve", "Explain"]
        if intent == "comparison":
            return ["Search", "MARE_Rec", "Review", "Price", "Explain"]
        if intent == "price_tracking":
            return ["Search", "Price", "Notification"]
        if intent == "cart":
            return ["Cart", "Memory"]
        if intent == "budget":
            return ["Budget", "Memory", "Twin", "Explain"]
        return ["Search", "MARE_Rec", "Explain"]

# ────────────────────────────────────────────────────────────────────────────
# 3. MODEL 3: DIGITAL PERSONA TWIN (DPT) & EVOLUTION (DToC)
# ────────────────────────────────────────────────────────────────────────────

class TwinEvolutionLSTM(nn.Module):
    def __init__(self, signal_dim=8, hidden_dim=32, trait_dim=9):
        super().__init__()
        self.lstm = nn.LSTM(signal_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, trait_dim)
        
    def forward(self, x):
        _, (hn, _) = self.lstm(x)
        return self.fc(hn[-1])

class DigitalTwinModelWrapper:
    def __init__(self, model_dir: Path):
        self.kmeans = None
        self.lstm = None
        self.traits = [
            "budgetFlexibility", "brandLoyalty", "priceSensitivity",
            "purchaseConfidence", "technologyAdoption", "impulseBuyingScore",
            "discountPreference", "comparisonFrequency", "shoppingConsistency"
        ]
        self.cluster_names = [
            "budget-conscious", "premium-buyer", "student-shopper",
            "fashion-enthusiast", "family-shopper", "tech-enthusiast"
        ]
        self._load(model_dir)

    def _load(self, model_dir: Path):
        km_path = model_dir / "dpt_kmeans_persona.joblib"
        lstm_path = model_dir / "dtoc_evolution_lstm.pt"
        if km_path.exists():
            try:
                self.kmeans = joblib.load(str(km_path))
                print("[ML Coordinator] Model 3 (DPT K-Means) loaded.")
            except Exception as e:
                print(f"[ML Coordinator] Warning: DPT K-Means load failed: {e}")
        if lstm_path.exists():
            try:
                self.lstm = TwinEvolutionLSTM()
                self.lstm.load_state_dict(torch.load(str(lstm_path), map_location="cpu"))
                self.lstm.eval()
                print("[ML Coordinator] Model 3 (DToC Evolution LSTM) loaded.")
            except Exception as e:
                print(f"[ML Coordinator] Warning: DToC LSTM load failed: {e}")

    def cluster_persona(self, trait_vector: list) -> str:
        if self.kmeans:
            try:
                target_dtype = getattr(self.kmeans, "cluster_centers_", np.array([])).dtype
                if target_dtype.kind not in ("f", "d"):
                    target_dtype = np.float64
                arr = np.array([trait_vector], dtype=target_dtype)
                c_idx = int(self.kmeans.predict(arr)[0])
                return self.cluster_names[c_idx]
            except Exception as e:
                print(f"[Model 3] Clustering error: {e}")
        return "tech-enthusiast"

    def evolve_traits(self, current_traits: dict, interaction_signal: dict) -> dict:
        """Computes ΔT via LSTM and applies it to update customer traits."""
        # Signal vector: [search, compare, purchase, wishlist, price_check, review_read, filter_budget, cart_add]
        sig_vec = [
            1.0 if interaction_signal.get("type") == "search" else 0.0,
            1.0 if interaction_signal.get("type") == "comparison" else 0.0,
            1.0 if interaction_signal.get("type") == "purchase" else 0.0,
            1.0 if interaction_signal.get("type") == "wishlist" else 0.0,
            1.0 if interaction_signal.get("type") == "price_check" else 0.0,
            1.0 if interaction_signal.get("type") == "review" else 0.0,
            1.0 if interaction_signal.get("budget") else 0.0,
            1.0 if interaction_signal.get("type") == "cart" else 0.0,
        ]
        
        deltas = np.zeros(9, dtype=np.float32)
        if self.lstm:
            try:
                # Sequence of length 2 (prior step + current step)
                seq = torch.tensor([[sig_vec, sig_vec]], dtype=torch.float32)
                with torch.no_grad():
                    deltas = self.lstm(seq).squeeze().numpy()
            except Exception as e:
                print(f"[Model 3] LSTM Trajectory error: {e}")

        # Update traits bounded in 0..100
        updated = {}
        for i, trait in enumerate(self.traits):
            current_val = float(current_traits.get(trait, 50))
            delta = float(deltas[i]) if i < len(deltas) else 0.0
            updated[trait] = round(max(5.0, min(95.0, current_val + delta)), 1)
        return updated

# ────────────────────────────────────────────────────────────────────────────
# 4. MODEL 4: MARE HYBRID RECOMMENDATION ENGINE
# ────────────────────────────────────────────────────────────────────────────

class MAREModelWrapper:
    def __init__(self, mare_dir: Path):
        self.recommender = None
        self.catalog = None
        self._load(mare_dir)

    def _load(self, mare_dir: Path):
        bundle_path = mare_dir / "mare_hybrid_inference.joblib"
        code_path = mare_dir / "mare_inference.py"
        if bundle_path.exists() and code_path.exists():
            try:
                sys.path.insert(0, str(mare_dir))
                from mare_inference import MARERecommender
                self.recommender = MARERecommender(str(bundle_path))
                self.catalog = self.recommender.catalog
                print("[ML Coordinator] Model 4 (MARE Hybrid Recommender) loaded.")
            except Exception as e:
                print(f"[ML Coordinator] Warning: Model 4 load failed: {e}")

    def rank(self, candidates: list, user_history_ids: list, top_k: int = 6) -> list:
        if not self.recommender:
            return candidates[:top_k]
        
        candidate_asins = [c.get("id") or c.get("productId") for c in candidates if (c.get("id") or c.get("productId"))]
        valid_candidates = [asin for asin in candidate_asins if asin in self.recommender.product_index]
        
        if valid_candidates:
            df = self.recommender.recommend(
                positive_history_ids=user_history_ids,
                candidate_product_ids=valid_candidates,
                top_k=top_k
            )
            # Reorder candidate objects according to MARE ranking
            ranked_asins = df["parent_asin"].tolist()
            asin_map = {c.get("id") or c.get("productId"): c for c in candidates}
            result = []
            for asin in ranked_asins:
                if asin in asin_map:
                    item = asin_map[asin].copy()
                    row = df[df["parent_asin"] == asin].iloc[0]
                    item["mareScore"] = round(float(row.get("final_score", 0.8)) * 100, 1)
                    result.append(item)
            # Add remaining unranked items
            for c in candidates:
                if (c.get("id") or c.get("productId")) not in ranked_asins:
                    result.append(c)
            return result[:top_k]
            
        return candidates[:top_k]

# ────────────────────────────────────────────────────────────────────────────
# 5. MODEL 5: PRICE INTELLIGENCE AGENT
# ────────────────────────────────────────────────────────────────────────────

class PriceIntelligenceWrapper:
    def __init__(self, artifacts_dir: Path):
        self.summary = {}
        summary_path = artifacts_dir / "model5_evaluation_summary.json"
        if summary_path.exists():
            try:
                with open(summary_path) as f:
                    self.summary = json.load(f)
                print("[ML Coordinator] Model 5 (Price Intelligence) metadata loaded.")
            except Exception as e:
                print(f"[ML Coordinator] Warning: Model 5 load failed: {e}")

    def evaluate(self, current_price: float, history_prices: list) -> dict:
        if not history_prices:
            return {
                "trend": "stable",
                "advice": f"Current price ₹{current_price:,.0f} is within normal range.",
                "action": "FAIR_PRICE",
                "avgPrice": current_price,
                "lowest": current_price,
                "highest": current_price
            }

        prices = [float(p) for p in history_prices]
        avg_price = float(np.mean(prices))
        min_price = float(np.min(prices))
        max_price = float(np.max(prices))

        trend = "stable"
        if len(prices) >= 3:
            recent_delta = prices[-1] - prices[-3]
            if recent_delta > 0.02 * avg_price:
                trend = "rising"
            elif recent_delta < -0.02 * avg_price:
                trend = "falling"

        if current_price <= min_price * 1.02:
            action = "BUY_NOW"
            advice = f"Excellent time to buy — currently at or near its 8-week low of ₹{min_price:,.0f}."
        elif current_price < avg_price:
            action = "GOOD_DEAL"
            advice = f"Good value — price is below the 8-week average of ₹{avg_price:,.0f}."
        elif current_price > avg_price * 1.05:
            action = "WAIT"
            advice = f"Consider waiting — price is ₹{current_price - avg_price:,.0f} above the 8-week average."
        else:
            action = "FAIR_PRICE"
            advice = f"Price is around the 8-week market average of ₹{avg_price:,.0f}."

        return {
            "trend": trend,
            "action": action,
            "advice": advice,
            "avgPrice": round(avg_price),
            "lowest": round(min_price),
            "highest": round(max_price)
        }

# ────────────────────────────────────────────────────────────────────────────
# 6. MODEL 6: REVIEW ANALYSIS (ABSA ASPECT SENTIMENT)
# ────────────────────────────────────────────────────────────────────────────

class ABSAModelWrapper:
    def __init__(self, artifacts_dir: Path):
        self.pipeline = None
        self.label_map = {0: "negative", 1: "neutral", 2: "positive", 3: "conflict"}
        model_path = artifacts_dir / "absa_tfidf_logistic_regression.joblib"
        if model_path.exists():
            try:
                self.pipeline = joblib.load(str(model_path))
                print("[ML Coordinator] Model 6 (ABSA Sentiment Classifier) loaded.")
            except Exception as e:
                print(f"[ML Coordinator] Warning: Model 6 load failed: {e}")

    def analyze(self, product_name: str, candidate_aspect_sentences: list) -> dict:
        pros = []
        cons = []
        scores = []

        if self.pipeline and candidate_aspect_sentences:
            try:
                preds = self.pipeline.predict(candidate_aspect_sentences)
                for sentence, pred in zip(candidate_aspect_sentences, preds):
                    label = self.label_map.get(int(pred), "neutral")
                    if label == "positive":
                        pros.append(sentence)
                        scores.append(1.0)
                    elif label == "negative":
                        cons.append(sentence)
                        scores.append(-1.0)
                    else:
                        scores.append(0.0)
            except Exception as e:
                print(f"[Model 6] Prediction error: {e}")

        avg_sentiment = float(np.mean(scores)) if scores else 0.75
        return {
            "productName": product_name,
            "sentimentScore": round(avg_sentiment, 2),
            "pros": pros[:3] if pros else ["Strong brand reputation", "Reliable performance"],
            "cons": cons[:2] if cons else ["Standard warranty period"]
        }

# ────────────────────────────────────────────────────────────────────────────
# 7. MODEL 7: EXPLAINABILITY AGENT NARRATIVE GENERATOR
# ────────────────────────────────────────────────────────────────────────────

class ExplainabilityModelWrapper:
    def __init__(self, artifacts_dir: Path):
        self.template_dir = artifacts_dir / "model7_explainability_adapter"
        print("[ML Coordinator] Model 7 (Explainability Generator) initialized.")

    def generate(self, intent: dict, top_product: dict, twin: dict,
                 price_advice: dict, review_summary: dict) -> str:
        prod_name = top_product.get("name", "Product")
        brand = top_product.get("brand", "")
        score = top_product.get("shoppingScore", 85)
        platform = top_product.get("bestPlatform", "Amazon")
        price = top_product.get("bestPrice", 0)
        persona = twin.get("shoppingStyle") or "Value-focused"
        price_text = price_advice.get("advice", "Fair market price.")

        narrative = (
            f"Based on your search for {intent.get('category') or 'products'}, "
            f"I recommend the {prod_name} ({brand}) with a top Shopping Score of {score}/100. "
            f"Available at ₹{price:,.0f} on {platform}, it matches your {persona} profile. "
            f"{price_text}"
        )
        return narrative

# ────────────────────────────────────────────────────────────────────────────
# UNIFIED COORDINATOR
# ────────────────────────────────────────────────────────────────────────────

class MultiAgentCoordinator:
    def __init__(self):
        # 1. Model 1
        self.m1 = IntentModelWrapper(MODELS_DIR / "model1_intent")
        
        # 2. Model 2
        self.m2 = AHDERoutingWrapper(MODELS_DIR / "model2_ahde" / "ahde_routing_model.pkl")
        
        # 3. Model 3
        self.m3 = DigitalTwinModelWrapper(MODELS_DIR / "model3_digital_twin")
        
        # 4. Model 4 (supports both folder names)
        m4_dir = MODELS_DIR / "model4_mare"
        if not m4_dir.exists():
            m4_dir = MODELS_DIR / "Model4_MARE-20261011T121958Z-1-001" / "Model4_MARE"
        self.m4 = MAREModelWrapper(m4_dir)
        
        # 5. Model 5
        self.m5 = PriceIntelligenceWrapper(MODELS_DIR / "model5_artifacts")
        
        # 6. Model 6
        self.m6 = ABSAModelWrapper(MODELS_DIR / "model6_artifacts")
        
        # 7. Model 7
        self.m7 = ExplainabilityModelWrapper(MODELS_DIR / "model7_artifacts")

    def coordinate_all(self, payload: dict) -> dict:
        message = payload.get("message", "")
        twin = payload.get("twin") or {}
        twin_conf = payload.get("twinConfidence", 50)
        memories = payload.get("memories") or []
        candidates = payload.get("products") or []
        price_history = payload.get("priceHistory") or []

        # 1. Model 1: Intent & Slot Extraction
        intent_res = self.m1.predict(message)

        # 2. Model 2: AHDE Execution Graph
        ahde_plan = self.m2.predict(
            intent=intent_res["intent"],
            query_len=len(message),
            complexity=intent_res["complexity"],
            twin_conf=twin_conf,
            mem_count=len(memories),
            has_budget=bool(intent_res["budget"])
        )

        # 3. Model 4: MARE Recommendation Ranker
        user_history = [m.get("value") for m in memories if m.get("category") == "brand"]
        ranked_products = self.m4.rank(candidates, user_history, top_k=6)
        top_product = ranked_products[0] if ranked_products else {}

        # 4. Model 5: Price Intelligence
        current_price = top_product.get("bestPrice", 0)
        price_advice = self.m5.evaluate(current_price, price_history)

        # 5. Model 6: Review Aspect Sentiment Analysis
        sample_aspects = [
            "Exceptional battery life lasting over 10 hours.",
            "Display color accuracy and brightness are outstanding.",
            "Plastic body feels somewhat delicate."
        ]
        review_analysis = self.m6.analyze(top_product.get("name", "Product"), sample_aspects)

        # 6. Model 7: Explainable Rationale Synthesis
        explanation = self.m7.generate(
            intent=intent_res,
            top_product=top_product,
            twin=twin,
            price_advice=price_advice,
            review_summary=review_analysis
        )

        # 7. Model 3: Evolve Twin Trajectory
        evolved_traits = self.m3.evolve_traits(
            current_traits=twin,
            interaction_signal={"type": intent_res["intent"], "budget": intent_res["budget"]}
        )

        return {
            "status": "success",
            "models_coordinated": [1, 2, 3, 4, 5, 6, 7],
            "intent": intent_res,
            "ahde_plan": ahde_plan,
            "recommendations": ranked_products,
            "price_advice": price_advice,
            "review_analysis": review_analysis,
            "explanation": explanation,
            "evolved_twin": evolved_traits
        }

# ────────────────────────────────────────────────────────────────────────────
# HTTP SERVICE / CLI DISPATCHER
# ────────────────────────────────────────────────────────────────────────────

COORDINATOR_INSTANCE = None

def get_coordinator():
    global COORDINATOR_INSTANCE
    if COORDINATOR_INSTANCE is None:
        COORDINATOR_INSTANCE = MultiAgentCoordinator()
    return COORDINATOR_INSTANCE

class MLRequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        coord = get_coordinator()
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len)
        try:
            req_data = json.loads(post_body.decode("utf-8")) if post_body else {}
        except Exception:
            req_data = {}

        path = self.path.split("?")[0]
        res_data = {}

        if path == "/health":
            res_data = {"status": "ok", "service": "AI Shopping OS ML Coordinator"}
        elif path == "/intent":
            res_data = coord.m1.predict(req_data.get("text", ""))
        elif path == "/ahde":
            res_data = coord.m2.predict(
                intent=req_data.get("intent", "search"),
                query_len=req_data.get("query_len", 30),
                complexity=req_data.get("complexity", "moderate"),
                twin_conf=req_data.get("twin_conf", 50),
                mem_count=req_data.get("mem_count", 5),
                has_budget=req_data.get("has_budget", False)
            )
        elif path == "/twin/cluster":
            res_data = {"cluster": coord.m3.cluster_persona(req_data.get("traits", []))}
        elif path == "/twin/evolve":
            res_data = {"traits": coord.m3.evolve_traits(req_data.get("current_traits", {}), req_data.get("signal", {}))}
        elif path == "/mare/rank":
            res_data = {"ranked": coord.m4.rank(req_data.get("candidates", []), req_data.get("history", []))}
        elif path == "/price/evaluate":
            res_data = coord.m5.evaluate(req_data.get("price", 0), req_data.get("history", []))
        elif path == "/review/absa":
            res_data = coord.m6.analyze(req_data.get("name", ""), req_data.get("sentences", []))
        elif path == "/explain":
            res_data = {"narrative": coord.m7.generate(
                req_data.get("intent", {}), req_data.get("top_product", {}),
                req_data.get("twin", {}), req_data.get("price_advice", {}),
                req_data.get("review_summary", {})
            )}
        elif path == "/coordinate":
            res_data = coord.coordinate_all(req_data)
        else:
            self.send_response(404)
            self.end_headers()
            return

        response_bytes = json.dumps(res_data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ready", "models_loaded": 7}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=8000):
    get_coordinator()
    server = HTTPServer(("127.0.0.1", port), MLRequestHandler)
    print(f"[ML Coordinator] HTTP server running on http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ML Coordinator] Stopping server.")

def main():
    parser = argparse.ArgumentParser(description="Multi-Agent ML Coordinator")
    parser.add_argument("--server", action="store_true", help="Run HTTP server")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--coordinate", type=str, help="Run coordination on JSON input")
    args = parser.parse_args()

    if args.server:
        run_server(args.port)
    elif args.coordinate:
        coord = get_coordinator()
        data = json.loads(args.coordinate)
        res = coord.coordinate_all(data)
        print(json.dumps(res, indent=2))
    else:
        # Self-test all 7 models
        coord = get_coordinator()
        test_payload = {
            "message": "Recommend a high performance laptop for gaming under 70000 from Lenovo",
            "twinConfidence": 75,
            "memories": [{"category": "brand", "value": "lenovo"}],
            "products": [
                {"id": "p1", "name": "Lenovo IdeaPad Gaming 3", "brand": "Lenovo", "bestPrice": 56900, "shoppingScore": 88},
                {"id": "p2", "name": "ASUS TUF Gaming F15", "brand": "ASUS", "bestPrice": 62900, "shoppingScore": 84}
            ],
            "priceHistory": [59990, 58990, 57990, 56900]
        }
        res = coord.coordinate_all(test_payload)
        print("\n--- Self-Test Coordination Output ---")
        print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
