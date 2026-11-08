"""Physics & Sensor Prior Encoder.
Encodes deterministic astronomical and telemetry priors into continuous embeddings.
"""

import torch
import torch.nn as nn

class PhysicsPriorEncoder(nn.Module):
    """Encodes astronomical & sensor telemetry prior into feature vectors.
    Input features (7-dim):
      [exp_u_norm, exp_v_norm, target_vmag_norm, sensor_alt_norm, sensor_az_sin, sensor_az_cos, is_overcast]
    Output:
      prior_embedding: (B, feature_dim)
    """
    def __init__(self, in_features: int = 7, feature_dim: int = 128):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(in_features, 64),
            nn.LayerNorm(64),
            nn.GELU(),
            nn.Linear(64, 96),
            nn.LayerNorm(96),
            nn.GELU(),
            nn.Linear(96, feature_dim),
            nn.LayerNorm(feature_dim),
        )

    def forward(self, prior_vec: torch.Tensor) -> torch.Tensor:
        return self.mlp(prior_vec)
