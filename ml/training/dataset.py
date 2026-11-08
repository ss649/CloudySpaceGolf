"""PyTorch Dataset Loader for Synthetic Night Sky + Telemetry Paired Data.
"""

import os
import json
import math
from typing import Dict, Any, List, Tuple
import torch
from torch.utils.data import Dataset
from PIL import Image
import numpy as np

from ..models.astro_sensor_net import TARGET_CLASSES

class SkyCloudDataset(Dataset):
    """Loads paired (sample_XXXXX.jpg, sample_XXXXX.json) data."""
    def __init__(self, data_dir: str, img_size: int = 256):
        self.data_dir = data_dir
        self.img_size = img_size
        
        self.samples = []
        if os.path.exists(data_dir):
            all_files = sorted(os.listdir(data_dir))
            json_files = [f for f in all_files if f.endswith(".json")]
            for jf in json_files:
                base = jf.replace(".json", "")
                img_name = f"{base}.jpg"
                if img_name in all_files:
                    self.samples.append((os.path.join(data_dir, img_name), os.path.join(data_dir, jf)))
                    
        self.class_to_idx = {name: i for i, name in enumerate(TARGET_CLASSES)}

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        img_path, json_path = self.samples[idx]
        
        # Load image
        img = Image.open(img_path).convert("RGB")
        if img.size != (self.img_size, self.img_size):
            img = img.resize((self.img_size, self.img_size), Image.BILINEAR)
            
        img_arr = np.array(img, dtype=np.float32) / 255.0
        # Normalization (mean 0.1, std 0.15 for dark sky images)
        img_tensor = torch.from_numpy(img_arr).permute(2, 0, 1) # (3, H, W)
        img_tensor = (img_tensor - 0.10) / 0.15
        
        # Load metadata
        with open(json_path) as f:
            meta = json.load(f)
            
        target_name = meta["target"]["name"]
        is_overcast = meta["environment"]["is_overcast"]
        
        # Target class: if overcast and obscured, could be background/cloud
        if is_overcast and meta["environment"]["cloud_cover_ratio"] > 0.85:
            class_idx = self.class_to_idx["Background_Noise"]
        else:
            class_idx = self.class_to_idx.get(target_name, self.class_to_idx["Background_Noise"])
            
        # Prior vector: 7 features
        # [exp_u_norm, exp_v_norm, target_vmag_norm, sensor_alt_norm, sensor_az_sin, sensor_az_cos, is_overcast]
        sensor_uv = meta["target"]["sensor_expected_uv"]
        exp_u_norm = (sensor_uv[0] / self.img_size) - 0.5
        exp_v_norm = (sensor_uv[1] / self.img_size) - 0.5
        vmag_norm = meta["target"]["vmag"] / 3.0
        alt_norm = meta["telemetry"]["measured_tilt_deg"] / 90.0
        az_rad = math.radians(meta["telemetry"]["measured_heading_deg"])
        az_sin = math.sin(az_rad)
        az_cos = math.cos(az_rad)
        overcast_val = 1.0 if is_overcast else 0.0
        
        prior_vec = torch.tensor([
            exp_u_norm, exp_v_norm, vmag_norm, alt_norm, az_sin, az_cos, overcast_val
        ], dtype=torch.float32)
        
        # True offset target (delta_u, delta_v) from sensor expectation to true optical center
        true_uv = meta["target"]["true_pixel_uv"]
        delta_u = (true_uv[0] - sensor_uv[0]) / self.img_size # normalized offset
        delta_v = (true_uv[1] - sensor_uv[1]) / self.img_size
        offset_target = torch.tensor([delta_u, delta_v], dtype=torch.float32)
        
        cloud_target = torch.tensor(meta["environment"]["cloud_cover_ratio"], dtype=torch.float32)
        
        return {
            "image": img_tensor,
            "prior_vec": prior_vec,
            "target_class": torch.tensor(class_idx, dtype=torch.long),
            "offset_target": offset_target,
            "cloud_target": cloud_target
        }
