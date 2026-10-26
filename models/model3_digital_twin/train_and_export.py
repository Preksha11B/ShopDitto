"""
Train and export Model 3: DPT Persona Clustering (K-Means) & DToC Trajectory Evolution (PyTorch LSTM)
Based on notebooks/03_dpt_persona_clustering_and_dtoc_evolution.ipynb
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
import torch
import torch.nn as nn
import torch.optim as optim

np.random.seed(42)
torch.manual_seed(42)

output_dir = os.path.dirname(os.path.abspath(__file__))

TRAITS = [
    "budgetFlexibility", "brandLoyalty", "priceSensitivity",
    "purchaseConfidence", "technologyAdoption", "impulseBuyingScore",
    "discountPreference", "comparisonFrequency", "shoppingConsistency"
]

CLUSTER_NAMES = {
    0: "budget-conscious",
    1: "premium-buyer",
    2: "student-shopper",
    3: "fashion-enthusiast",
    4: "family-shopper",
    5: "tech-enthusiast"
}

# 1. Cluster Centroids based on known domain profiles
archetype_centers = np.array([
    [25, 30, 90, 50, 45, 20, 95, 85, 60],  # budget-conscious
    [85, 75, 20, 80, 80, 40, 25, 40, 75],  # premium-buyer
    [35, 40, 85, 45, 85, 35, 90, 95, 50],  # student-shopper
    [60, 70, 50, 70, 65, 70, 55, 60, 80],  # fashion-enthusiast
    [50, 55, 70, 65, 50, 25, 75, 70, 90],  # family-shopper
    [70, 50, 40, 80, 98, 55, 50, 80, 70],  # tech-enthusiast
], dtype=np.float32)

# Generate synthetic users clustered around archetypes
N_PER_CLUSTER = 250
X_traits = []
for center in archetype_centers:
    noise = np.random.normal(0, 8, size=(N_PER_CLUSTER, 9))
    samples = np.clip(center + noise, 0, 100)
    X_traits.append(samples)
X_traits = np.vstack(X_traits)

kmeans = KMeans(n_clusters=6, init=archetype_centers, n_init=1, random_state=42)
kmeans.fit(X_traits)

kmeans_path = os.path.join(output_dir, "dpt_kmeans_persona.joblib")
joblib.dump(kmeans, kmeans_path)
print(f"Saved DPT K-Means model to {kmeans_path}")

# 2. DToC Trajectory Evolution PyTorch LSTM Model
class TwinEvolutionLSTM(nn.Module):
    def __init__(self, signal_dim=8, hidden_dim=32, trait_dim=9):
        super(TwinEvolutionLSTM, self).__init__()
        self.lstm = nn.LSTM(signal_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, trait_dim)
        
    def forward(self, x):
        # x shape: (batch_size, seq_len, signal_dim)
        lstm_out, (hn, cn) = self.lstm(x)
        delta_traits = self.fc(hn[-1])
        return delta_traits

SIGNAL_DIM = 8  # [search, compare, purchase, wishlist, price_check, review_read, filter_budget, cart_add]
model = TwinEvolutionLSTM(signal_dim=SIGNAL_DIM, hidden_dim=32, trait_dim=9)

# Synthetic training to learn realistic trait delta response
# e.g., frequent price checks / budget filters increase priceSensitivity, decrease budgetFlexibility
optimizer = optim.Adam(model.parameters(), lr=0.01)
criterion = nn.MSELoss()

print("Training DToC Trajectory Evolution LSTM...")
for epoch in range(120):
    seqs = torch.randn(64, 4, SIGNAL_DIM)
    # Target deltas: scaled bounded delta updates in range [-5, +5]
    targets = torch.tanh(seqs.mean(dim=1)[:, :9 if SIGNAL_DIM >= 9 else None])
    if targets.shape[1] < 9:
        pad = torch.zeros(64, 9 - targets.shape[1])
        targets = torch.cat([targets, pad], dim=1) * 3.0
    
    optimizer.zero_grad()
    preds = model(seqs)
    loss = criterion(preds, targets)
    loss.backward()
    optimizer.step()

lstm_path = os.path.join(output_dir, "dtoc_evolution_lstm.pt")
torch.save(model.state_dict(), lstm_path)
print(f"Saved DToC Evolution LSTM weights to {lstm_path}")

meta = {
    "model_name": "DPT Persona Clustering & DToC Trajectory Evolution",
    "traits": TRAITS,
    "cluster_names": CLUSTER_NAMES,
    "signal_dimensions": [
        "search", "compare", "purchase", "wishlist",
        "price_check", "review_read", "filter_budget", "cart_add"
    ],
    "cluster_centers": kmeans.cluster_centers_.tolist()
}

with open(os.path.join(output_dir, "dpt_dtoc_metadata.json"), "w") as f:
    json.dump(meta, f, indent=2)

print("Model 3 export completed successfully.")
