"""ONNX Export and Inference Verification Script for AstroSensorNet.
"""

import os
import torch
from ..models.astro_sensor_net import AstroSensorNet, TARGET_CLASSES

def export_to_onnx(
    checkpoint_path: str = "ml/checkpoints/astro_sensor_net.pt",
    output_onnx_path: str = "ml/export/astro_sensor_net.onnx"
):
    os.makedirs(os.path.dirname(output_onnx_path), exist_ok=True)
    
    device = torch.device("cpu")
    model = AstroSensorNet().to(device)
    
    if os.path.exists(checkpoint_path):
        checkpoint = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
        print(f"Loaded trained checkpoint from {checkpoint_path}")
    else:
        print("Warning: checkpoint not found, exporting with initialized weights.")
        
    model.eval()
    
    # Dummy inputs for tracing: (B, 3, 256, 256) and (B, 7)
    dummy_image = torch.randn(1, 3, 256, 256, dtype=torch.float32)
    dummy_prior = torch.randn(1, 7, dtype=torch.float32)
    
    torch.onnx.export(
        model,
        (dummy_image, dummy_prior),
        output_onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["image", "prior_vec"],
        output_names=["logits", "pred_offset_uv", "pred_cloud_ratio"],
        dynamic_axes={
            "image": {0: "batch_size"},
            "prior_vec": {0: "batch_size"},
            "logits": {0: "batch_size"},
            "pred_offset_uv": {0: "batch_size"},
            "pred_cloud_ratio": {0: "batch_size"},
        }
    )
    
    file_size_mb = os.path.getsize(output_onnx_path) / (1024 * 1024)
    print(f"Successfully exported model to ONNX: {output_onnx_path}")
    print(f"ONNX Model File Size: {file_size_mb:.2f} MB")

if __name__ == "__main__":
    export_to_onnx()
