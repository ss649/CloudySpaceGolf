"""Lightweight Visual Backbone for Night Sky Point Source & Cloud Feature Extraction.
MobileNet-style inverted bottleneck architecture optimized for edge devices.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class InvertedResidual(nn.Module):
    """MobileNet-style Inverted Residual Block with depthwise separable convolutions."""
    def __init__(self, in_channels: int, out_channels: int, stride: int, expand_ratio: int = 4):
        super().__init__()
        self.stride = stride
        self.use_res_connect = self.stride == 1 and in_channels == out_channels
        hidden_dim = int(in_channels * expand_ratio)

        layers = []
        if expand_ratio != 1:
            # 1x1 Expansion
            layers.extend([
                nn.Conv2d(in_channels, hidden_dim, kernel_size=1, bias=False),
                nn.BatchNorm2d(hidden_dim),
                nn.SiLU(inplace=True),
            ])
            
        # 3x3 Depthwise Conv
        layers.extend([
            nn.Conv2d(hidden_dim, hidden_dim, kernel_size=3, stride=stride, padding=1, groups=hidden_dim, bias=False),
            nn.BatchNorm2d(hidden_dim),
            nn.SiLU(inplace=True),
            # 1x1 Pointwise Projection
            nn.Conv2d(hidden_dim, out_channels, kernel_size=1, bias=False),
            nn.BatchNorm2d(out_channels),
        ])
        self.conv = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.use_res_connect:
            return x + self.conv(x)
        return self.conv(x)

class LightweightSkyBackbone(nn.Module):
    """Extracts spatial and global visual features from night-sky images.
    Input: (B, 3, 256, 256)
    Output:
      spatial_features: (B, 128, 8, 8)
      global_embedding: (B, 128)
    """
    def __init__(self, in_channels: int = 3, feature_dim: int = 128):
        super().__init__()
        
        # Initial Conv: 256x256 -> 128x128
        self.stem = nn.Sequential(
            nn.Conv2d(in_channels, 24, kernel_size=3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(24),
            nn.SiLU(inplace=True),
        )
        
        # Inverted residual stages
        self.stage1 = nn.Sequential(
            InvertedResidual(24, 32, stride=2, expand_ratio=2),  # 64x64
            InvertedResidual(32, 32, stride=1, expand_ratio=2),
        )
        self.stage2 = nn.Sequential(
            InvertedResidual(32, 64, stride=2, expand_ratio=3),  # 32x32
            InvertedResidual(64, 64, stride=1, expand_ratio=3),
        )
        self.stage3 = nn.Sequential(
            InvertedResidual(64, 96, stride=2, expand_ratio=4),  # 16x16
            InvertedResidual(96, 96, stride=1, expand_ratio=4),
        )
        self.stage4 = nn.Sequential(
            InvertedResidual(96, feature_dim, stride=2, expand_ratio=4), # 8x8
            InvertedResidual(feature_dim, feature_dim, stride=1, expand_ratio=4),
        )
        
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        self.norm = nn.LayerNorm(feature_dim)

    def forward(self, x: torch.Tensor):
        x = self.stem(x)
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        spatial = self.stage4(x) # (B, 128, 8, 8)
        
        pooled = self.global_pool(spatial).flatten(1) # (B, 128)
        global_embed = self.norm(pooled)
        return spatial, global_embed
