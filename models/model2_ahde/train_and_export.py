"""
Train and export Model 2: AHDE (Adaptive Hybrid Decision Engine) Routing Classifier
Based on notebooks/02_ahde_routing_classifier.ipynb
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.multioutput import MultiOutputClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

np.random.seed(42)
N_SAMPLES = 3000

AGENTS = [
    "Search", "Memory", "Twin", "MARE_Rec", "Review",
    "Price", "Budget", "Twin_Evolve", "Explain", "Cart", "Notification"
]

INTENT_MAP = {
    0: "budget",
    1: "cart",
    2: "comparison",
    3: "general",
    4: "greeting",
    5: "price_tracking",
    6: "recommendation",
    7: "search"
}

# Input Features:
# 0: intent_id (0..7)
# 1: query_len (10..120)
# 2: complexity (1=simple, 2=moderate, 3=complex)
# 3: twin_conf (0..100)
# 4: mem_count (0..50)
# 5: has_budget (0 or 1)

intent_ids = np.random.randint(0, 8, N_SAMPLES)
query_lens = np.random.randint(10, 140, N_SAMPLES)
complexities = np.random.choice([1, 2, 3], N_SAMPLES, p=[0.4, 0.4, 0.2])
twin_confs = np.random.randint(10, 100, N_SAMPLES)
mem_counts = np.random.randint(0, 50, N_SAMPLES)
has_budgets = np.random.choice([0, 1], N_SAMPLES)

X = pd.DataFrame({
    'intent_id': intent_ids,
    'query_len': query_lens,
    'complexity': complexities,
    'twin_conf': twin_confs,
    'mem_count': mem_counts,
    'has_budget': has_budgets
})

Y_list = []
for idx, row in X.iterrows():
    intent = row['intent_id']
    comp = row['complexity']
    has_mem = 1 if row['mem_count'] > 0 else 0
    twin_active = 1 if row['twin_conf'] > 30 else 0
    budget_active = 1 if row['has_budget'] else 0
    
    # [Search, Memory, Twin, MARE_Rec, Review, Price, Budget, Twin_Evolve, Explain, Cart, Notification]
    if intent == 6:  # recommendation
        activations = [1, has_mem, twin_active, 1, 1 if comp >= 2 else 0, 1, budget_active, 1, 1, 0, 0]
    elif intent == 2:  # comparison
        activations = [1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0]
    elif intent == 5:  # price_tracking
        activations = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    elif intent == 7:  # search
        activations = [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
    elif intent == 0:  # budget
        activations = [0, 1, twin_active, 0, 0, 0, 1, 0, 1, 0, 0]
    elif intent == 1:  # cart
        activations = [0, has_mem, 0, 0, 0, 0, 0, 0, 0, 1, 0]
    elif intent == 4:  # greeting
        activations = [0, has_mem, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    else:  # general
        activations = [1, has_mem, 0, 1, 0, 0, 0, 0, 1, 0, 0]
        
    Y_list.append(activations)

Y = pd.DataFrame(Y_list, columns=AGENTS)

X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.15, random_state=42)

print(f"Training AHDE Multi-Output Routing Classifier on {len(X_train)} samples...")
base_clf = RandomForestClassifier(n_estimators=80, max_depth=7, random_state=42)
multi_model = MultiOutputClassifier(base_clf)
multi_model.fit(X_train, Y_train)

score = multi_model.score(X_test, Y_test)
print(f"AHDE Exact Subset Match Accuracy: {score * 100:.2f}%")

output_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(output_dir, "ahde_routing_model.pkl")
joblib.dump(multi_model, model_path)

meta = {
    "model_name": "AHDE Multi-Output Routing Classifier",
    "features": list(X.columns),
    "target_agents": AGENTS,
    "intent_map": INTENT_MAP,
    "exact_match_accuracy": float(score),
    "n_samples": N_SAMPLES
}

with open(os.path.join(output_dir, "ahde_metadata.json"), "w") as f:
    json.dump(meta, f, indent=2)

print(f"Model 2 successfully saved to {model_path}")
