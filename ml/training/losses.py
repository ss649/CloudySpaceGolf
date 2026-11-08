"""Multi-Task Loss for AstroSensorNet.
"""

from typing import Dict
import torch
import torch.nn as nn
import torch.nn.functional as F

class AstroSensorLoss(nn.Module):
    """Combines Classification, Centroid Offset Regression, and Cloud Estimation losses."""
    def __init__(self, lambda_offset: float = 2.0, lambda_cloud: float = 1.0):
        super().__init__()
        self.lambda_offset = lambda_offset
        self.lambda_cloud = lambda_cloud
        self.ce_loss = nn.CrossEntropyLoss(label_smoothing=0.05)
        self.offset_loss = nn.SmoothL1Loss(beta=0.02)
        self.cloud_loss = nn.MSELoss()

    def forward(
        self,
        predictions: Dict[str, torch.Tensor],
        targets: Dict[str, torch.Tensor]
    ) -> Dict[str, torch.Tensor]:
        l_cls = self.ce_loss(predictions["logits"], targets["target_class"])
        l_offset = self.offset_loss(predictions["pred_offset_uv"], targets["offset_target"])
        l_cloud = self.cloud_loss(predictions["pred_cloud_ratio"], targets["cloud_target"])
        
        total_loss = l_cls + self.lambda_offset * l_offset + self.lambda_cloud * l_cloud
        
        return {
            "total_loss": total_loss,
            "loss_cls": l_cls,
            "loss_offset": l_offset,
            "loss_cloud": l_cloud
        }
