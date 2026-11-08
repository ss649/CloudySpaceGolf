"""AstroSensorNet: Multimodal Physics-Guided Neural Network for Celestial Body Identification.
Combines night sky imagery with smartphone IMU / astronomical ephemeris priors.
"""

from typing import Dict, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F

from .visual_backbone import LightweightSkyBackbone
from .physics_prior_mlp import PhysicsPriorEncoder

TARGET_CLASSES = [
    "Jupiter",
    "Mars",
    "Saturn",
    "Venus",
    "Sirius",
    "Vega",
    "Betelgeuse",
    "Rigel",
    "Capella",
    "Arcturus",
    "Background_Noise"
]

class CrossAttentionFusion(nn.Module):
    """Cross-attention mechanism matching physical celestial priors with visual patch tokens."""
    def __init__(self, embed_dim: int = 128, num_heads: int = 4):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        
        self.q_proj = nn.Linear(embed_dim, embed_dim)
        self.k_proj = nn.Linear(embed_dim, embed_dim)
        self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.out_proj = nn.Linear(embed_dim, embed_dim)
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, prior_embed: torch.Tensor, visual_spatial: torch.Tensor) -> torch.Tensor:
        """
        prior_embed: (B, embed_dim) - Query (physical prior)
        visual_spatial: (B, embed_dim, H, W) - Keys and Values (visual patches)
        """
        B, C, H, W = visual_spatial.shape
        # Flatten spatial dimensions into visual tokens: (B, H*W, C)
        visual_tokens = visual_spatial.flatten(2).transpose(1, 2)
        
        # Query: (B, 1, C)
        q = self.q_proj(prior_embed).unsqueeze(1)
        k = self.k_proj(visual_tokens)
        v = self.v_proj(visual_tokens)
        
        # Reshape for multi-head attention: (B, num_heads, seq_len, head_dim)
        q = q.view(B, 1, self.num_heads, self.head_dim).transpose(1, 2)
        k = k.view(B, H*W, self.num_heads, self.head_dim).transpose(1, 2)
        v = v.view(B, H*W, self.num_heads, self.head_dim).transpose(1, 2)
        
        # Scaled dot-product attention
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        attn_weights = F.softmax(scores, dim=-1)
        
        context = torch.matmul(attn_weights, v) # (B, num_heads, 1, head_dim)
        context = context.transpose(1, 2).contiguous().view(B, 1, C).squeeze(1)
        
        fused = self.norm(prior_embed + self.out_proj(context))
        return fused

class AstroSensorNet(nn.Module):
    """End-to-End Multimodal Network for Celestial Body Identification and Telemetry Verification."""
    def __init__(self, num_classes: int = len(TARGET_CLASSES), embed_dim: int = 128):
        super().__init__()
        self.num_classes = num_classes
        self.embed_dim = embed_dim
        
        # Sub-networks
        self.visual_backbone = LightweightSkyBackbone(in_channels=3, feature_dim=embed_dim)
        self.prior_encoder = PhysicsPriorEncoder(in_features=7, feature_dim=embed_dim)
        self.fusion = CrossAttentionFusion(embed_dim=embed_dim, num_heads=4)
        
        # Multi-task heads
        # 1. Celestial Body Classification Head
        self.class_head = nn.Sequential(
            nn.Linear(embed_dim * 2, 96),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Linear(96, num_classes)
        )
        
        # 2. Sub-pixel Optical Centroid Offset Head: predicts (delta_u, delta_v) relative to sensor expectation
        self.offset_head = nn.Sequential(
            nn.Linear(embed_dim * 2, 64),
            nn.GELU(),
            nn.Linear(64, 2)
        )
        
        # 3. Cloud Coverage Ratio Head: scalar in [0, 1]
        self.cloud_head = nn.Sequential(
            nn.Linear(embed_dim * 2, 48),
            nn.GELU(),
            nn.Linear(48, 1),
            nn.Sigmoid()
        )

    def forward(self, image: torch.Tensor, prior_vec: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        image: (B, 3, 256, 256) normalized float tensor
        prior_vec: (B, 7) float tensor
        """
        spatial_features, global_vis = self.visual_backbone(image)
        prior_embed = self.prior_encoder(prior_vec)
        
        # Cross-attention matching physical prior with visual point sources
        attended_prior = self.fusion(prior_embed, spatial_features)
        
        # Concatenate global visual embedding with attended prior
        combined = torch.cat([global_vis, attended_prior], dim=1) # (B, 256)
        
        logits = self.class_head(combined)
        offset = self.offset_head(combined)
        cloud_pct = self.cloud_head(combined)
        
        return {
            "logits": logits,
            "pred_offset_uv": offset,
            "pred_cloud_ratio": cloud_pct.squeeze(-1)
        }
