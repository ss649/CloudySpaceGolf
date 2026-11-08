"""Dataset Generator Orchestrator.
Generates synthetic paired training data (Night Sky Image + Sensor Telemetry JSON).
"""

import os
import json
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import numpy as np
from PIL import Image

from ..ephemeris.celestial_engine import get_visible_celestial_bodies
from ..ephemeris.coordinate_transforms import project_celestial_to_camera
from .render_starfield import render_starfield
from .cloud_overlay import apply_cloud_cover
from .sensor_noise import inject_telemetry_noise, apply_camera_cmos_noise

TARGET_BODIES = ["Jupiter", "Mars", "Saturn", "Venus", "Sirius", "Vega", "Betelgeuse", "Rigel", "Capella", "Arcturus"]

def generate_single_sample(
    sample_id: int,
    output_dir: str,
    img_size: int = 256,
    hfov_deg: float = 68.0
) -> Dict[str, Any]:
    """Generates one paired (image.png, telemetry.json) sample."""
    # 1. Random location & time
    lat = random.uniform(25.0, 55.0) # Mid-latitudes
    lon = random.uniform(-125.0, 30.0)
    base_time = datetime(2026, 11, 8, 2, 0, 0, tzinfo=timezone.utc)
    dt = base_time + timedelta(days=random.randint(0, 180), hours=random.uniform(-4, 4))
    
    # 2. Get celestial bodies
    visible = get_visible_celestial_bodies(lat, lon, dt, min_alt_deg=12.0)
    if not visible:
        return {}
        
    # Choose candidate target
    eligible = [b for b in visible if b["name"] in TARGET_BODIES]
    if not eligible:
        eligible = visible[:3]
    target = random.choice(eligible)
    
    # 3. Simulate player aiming:
    # Player aims close to target with crosshair (within 0 to 4 deg)
    aim_offset_az = random.uniform(-3.5, 3.5)
    aim_offset_alt = random.uniform(-3.5, 3.5)
    cam_true_heading = (target["az_deg"] + aim_offset_az) % 360.0
    cam_true_tilt = max(5.0, min(85.0, target["alt_deg"] + aim_offset_alt))
    cam_true_roll = random.uniform(-3.0, 3.0)
    
    # 4. Render clean starfield
    starfield, projected_bodies = render_starfield(
        visible_bodies=visible,
        cam_heading_deg=cam_true_heading,
        cam_tilt_deg=cam_true_tilt,
        cam_roll_deg=cam_true_roll,
        width=img_size,
        height=img_size,
        hfov_deg=hfov_deg,
        skyglow_level=random.uniform(0.04, 0.12)
    )
    
    # Locate target in frame
    target_proj = next((b for b in projected_bodies if b["name"] == target["name"]), None)
    if target_proj is None or not target_proj["in_bounds"]:
        target_u, target_v = img_size / 2.0, img_size / 2.0
    else:
        target_u, target_v = target_proj["u"], target_proj["v"]
        
    # 5. Cloud simulation
    # 80% of samples have a cloud break ("sucker hole"); 20% are fully overcast
    is_overcast = random.random() < 0.20
    cloud_cover_ratio = random.uniform(0.75, 0.95) if is_overcast else random.uniform(0.35, 0.70)
    
    cloudy_img, cloud_mask = apply_cloud_cover(
        starfield_img=starfield,
        target_u=target_u,
        target_v=target_v,
        cloud_cover_ratio=cloud_cover_ratio,
        force_gap_at_target=(not is_overcast),
        gap_radius=random.uniform(25.0, 45.0),
        cloud_glow_intensity=random.uniform(0.15, 0.35)
    )
    
    # 6. Apply realistic camera CMOS noise
    noisy_img = apply_camera_cmos_noise(
        cloudy_img,
        iso_equivalent=random.choice([1600, 3200, 6400]),
        read_noise_std=random.uniform(0.015, 0.03)
    )
    
    # 7. Inject IMU sensor telemetry noise
    telemetry = inject_telemetry_noise(
        true_heading_deg=cam_true_heading,
        true_tilt_deg=cam_true_tilt,
        true_roll_deg=cam_true_roll,
        heading_noise_std_deg=random.uniform(4.0, 9.0),
        tilt_noise_std_deg=random.uniform(1.0, 2.0)
    )
    
    # 8. Compute expected target position from noisy sensor measurements
    expected_proj = project_celestial_to_camera(
        target["alt_deg"], target["az_deg"],
        telemetry["measured_heading_deg"],
        telemetry["measured_tilt_deg"],
        telemetry["measured_roll_deg"],
        img_width=img_size,
        img_height=img_size,
        hfov_deg=hfov_deg
    )
    
    if expected_proj:
        exp_u, exp_v, _ = expected_proj
    else:
        exp_u, exp_v = -999.0, -999.0
        
    # 9. Save image
    img_uint8 = (noisy_img * 255.0).astype(np.uint8)
    img_filename = f"sample_{sample_id:05d}.jpg"
    img_path = os.path.join(output_dir, img_filename)
    Image.fromarray(img_uint8).save(img_path, quality=92)
    
    # 10. Save metadata
    meta = {
        "sample_id": sample_id,
        "image_file": img_filename,
        "timestamp_utc": dt.isoformat(),
        "observer": {"latitude": round(lat, 4), "longitude": round(lon, 4)},
        "target": {
            "name": target["name"],
            "type": target.get("type", "star"),
            "vmag": target["vmag"],
            "true_alt_deg": target["alt_deg"],
            "true_az_deg": target["az_deg"],
            "true_pixel_uv": [round(target_u, 2), round(target_v, 2)],
            "sensor_expected_uv": [round(float(exp_u), 2), round(float(exp_v), 2)]
        },
        "telemetry": telemetry,
        "environment": {
            "is_overcast": is_overcast,
            "cloud_cover_ratio": round(float(cloud_cover_ratio), 2),
            "cloud_mask_mean": round(float(np.mean(cloud_mask)), 3)
        }
    }
    
    json_filename = f"sample_{sample_id:05d}.json"
    json_path = os.path.join(output_dir, json_filename)
    with open(json_path, "w") as f:
        json.dump(meta, f, indent=2)
        
    return meta

def generate_batch(output_dir: str, num_samples: int = 50, img_size: int = 256):
    """Generates a batch of synthetic dataset samples."""
    os.makedirs(output_dir, exist_ok=True)
    generated = 0
    for i in range(num_samples):
        meta = generate_single_sample(sample_id=i+1, output_dir=output_dir, img_size=img_size)
        if meta:
            generated += 1
    print(f"Successfully generated {generated}/{num_samples} samples in {output_dir}")
