"""Synthetic Starfield and Planetary Disc Renderer.
Draws realistic Point Spread Function (PSF) discs and faint background stars
given camera intrinsics, orientation, and celestial body positions.
"""

import math
from typing import List, Dict, Any, Tuple
import numpy as np
from PIL import Image
from ..ephemeris.coordinate_transforms import project_celestial_to_camera

def render_starfield(
    visible_bodies: List[Dict[str, Any]],
    cam_heading_deg: float,
    cam_tilt_deg: float,
    cam_roll_deg: float = 0.0,
    width: int = 256,
    height: int = 256,
    hfov_deg: float = 68.0,
    skyglow_level: float = 0.05
) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
    """Renders a 3-channel RGB float32 [0, 1] sky image.
    Returns (image_array, projected_targets_in_frame).
    """
    # Background night sky glow (light pollution gradient)
    # Sky is slightly brighter near the horizon (lower tilt)
    horizon_factor = max(0.0, 1.0 - cam_tilt_deg / 90.0)
    bg_r = skyglow_level * (0.04 + 0.06 * horizon_factor)
    bg_g = skyglow_level * (0.05 + 0.07 * horizon_factor)
    bg_b = skyglow_level * (0.08 + 0.10 * horizon_factor)
    
    img = np.zeros((height, width, 3), dtype=np.float32)
    img[:, :, 0] = bg_r
    img[:, :, 1] = bg_g
    img[:, :, 2] = bg_b
    
    # Add subtle background faint star dust (hundreds of sub-pixel stars)
    num_faint_stars = int(width * height * 0.003)
    rand_x = np.random.randint(0, width, size=num_faint_stars)
    rand_y = np.random.randint(0, height, size=num_faint_stars)
    faint_intensity = np.random.uniform(0.03, 0.18, size=num_faint_stars).astype(np.float32)
    img[rand_y, rand_x, 0] += faint_intensity * 0.9
    img[rand_y, rand_x, 1] += faint_intensity * 0.95
    img[rand_y, rand_x, 2] += faint_intensity * 1.0
    
    projected_in_frame = []
    
    for body in visible_bodies:
        proj = project_celestial_to_camera(
            body["alt_deg"], body["az_deg"],
            cam_heading_deg, cam_tilt_deg, cam_roll_deg,
            img_width=width, img_height=height, hfov_deg=hfov_deg
        )
        if proj is None:
            continue
            
        u, v, ang_dist = proj
        
        # Check bounds with a small margin
        margin = 16
        if -margin <= u < width + margin and -margin <= v < height + margin:
            vmag = body["vmag"]
            is_planet = body.get("type") == "planet"
            
            # Map visual magnitude to intensity & radius:
            # Vmag: -2 (Jupiter/Venus) -> very bright, radius ~ 4-5px
            # Vmag: +2 (faint star) -> faint, radius ~ 1.5px
            norm_mag = max(-3.0, min(3.0, vmag))
            brightness = 10.0 ** (-0.4 * (norm_mag - 1.0)) # flux ratio
            brightness = max(0.2, min(4.0, brightness))
            
            sigma = 0.8 + 0.5 * max(0.0, 1.5 - norm_mag * 0.5)
            if is_planet:
                sigma += 0.4
                
            radius = int(math.ceil(3.0 * sigma))
            u_int, v_int = int(round(u)), int(round(v))
            
            # Color tint:
            if body["name"] == "Mars":
                color = np.array([1.2, 0.6, 0.4], dtype=np.float32) # Orange-red
            elif body["name"] in ("Jupiter", "Venus", "Saturn"):
                color = np.array([1.1, 1.05, 0.85], dtype=np.float32) # Warm cream
            else:
                color = np.array([0.95, 0.98, 1.1], dtype=np.float32) # Blue-white star
                
            # Draw 2D Gaussian PSF
            y_min = max(0, v_int - radius)
            y_max = min(height, v_int + radius + 1)
            x_min = max(0, u_int - radius)
            x_max = min(width, u_int + radius + 1)
            
            for y_i in range(y_min, y_max):
                for x_i in range(x_min, x_max):
                    dist_sq = (x_i - u)**2 + (y_i - v)**2
                    psf = brightness * math.exp(-dist_sq / (2.0 * sigma * sigma))
                    for c in range(3):
                        img[y_i, x_i, c] = min(1.0, img[y_i, x_i, c] + psf * color[c])
                        
            projected_in_frame.append({
                "name": body["name"],
                "type": body.get("type", "star"),
                "vmag": vmag,
                "u": round(float(u), 2),
                "v": round(float(v), 2),
                "in_bounds": (0 <= u < width and 0 <= v < height)
            })
            
    return np.clip(img, 0.0, 1.0), projected_in_frame
