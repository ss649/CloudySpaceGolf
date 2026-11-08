"""Atmospheric Cloud Simulation & Alpha Blending.
Simulates realistic night cloud formations, broken cloud gaps ('sucker holes'),
and city light-pollution cloud backscattering.
"""

import math
from typing import Tuple
import numpy as np

def generate_perlin_octaves(width: int, height: int, octaves: int = 4, persistence: float = 0.5) -> np.ndarray:
    """Generates 2D fractal noise grid using vectorized multi-scale interpolation."""
    noise = np.zeros((height, width), dtype=np.float32)
    amplitude = 1.0
    total_amp = 0.0
    
    for oct_idx in range(octaves):
        freq = 2 ** (oct_idx + 1)
        grid_h = max(2, int(height / (freq * 4)))
        grid_w = max(2, int(width / (freq * 4)))
        
        # Small random lattice
        lattice = np.random.uniform(0.0, 1.0, size=(grid_h, grid_w)).astype(np.float32)
        
        # Bilinear upsample to (height, width)
        y_indices = np.linspace(0, grid_h - 1, height)
        x_indices = np.linspace(0, grid_w - 1, width)
        
        y0 = np.floor(y_indices).astype(int)
        y1 = np.minimum(y0 + 1, grid_h - 1)
        x0 = np.floor(x_indices).astype(int)
        x1 = np.minimum(x0 + 1, grid_w - 1)
        
        wy = (y_indices - y0).reshape(-1, 1).astype(np.float32)
        wx = (x_indices - x0).reshape(1, -1).astype(np.float32)
        
        top = (1.0 - wx) * lattice[y0[:, None], x0] + wx * lattice[y0[:, None], x1]
        bottom = (1.0 - wx) * lattice[y1[:, None], x0] + wx * lattice[y1[:, None], x1]
        layer = (1.0 - wy) * top + wy * bottom
        
        noise += amplitude * layer
        total_amp += amplitude
        amplitude *= persistence
        
    noise /= total_amp
    return noise

def apply_cloud_cover(
    starfield_img: np.ndarray,
    target_u: float,
    target_v: float,
    cloud_cover_ratio: float = 0.65,
    force_gap_at_target: bool = True,
    gap_radius: float = 35.0,
    cloud_glow_intensity: float = 0.25
) -> Tuple[np.ndarray, np.ndarray]:
    """Overlays realistic clouds onto starfield image.
    If force_gap_at_target is True, creates a cloud break centered near (target_u, target_v).
    Returns (blended_image, cloud_alpha_mask).
    """
    height, width, _ = starfield_img.shape
    base_noise = generate_perlin_octaves(width, height, octaves=4)
    
    # Threshold noise to form cloud masses:
    # Lower threshold = more clouds, Higher = fewer clouds
    threshold = 1.0 - cloud_cover_ratio
    # Sigmoidal smoothstep for cloud density
    alpha = 1.0 / (1.0 + np.exp(-12.0 * (base_noise - threshold)))
    
    # If partly cloudy / cloud gap mode:
    if force_gap_at_target:
        # Carve a hole near target with slight random displacement
        gap_center_x = target_u + np.random.uniform(-10.0, 10.0)
        gap_center_y = target_v + np.random.uniform(-10.0, 10.0)
        
        yy, xx = np.mgrid[0:height, 0:width]
        dist_from_gap = np.sqrt((xx - gap_center_x)**2 + (yy - gap_center_y)**2)
        
        # Smooth radial clearing
        gap_mask = 1.0 / (1.0 + np.exp(-0.2 * (dist_from_gap - gap_radius)))
        alpha = alpha * gap_mask
        
    alpha = np.clip(alpha, 0.0, 1.0).astype(np.float32)
    
    # Backlit cloud color (urban night sky: clouds reflect streetlights as warm gray/amber haze)
    cloud_color = np.array([0.22, 0.21, 0.24], dtype=np.float32) * cloud_glow_intensity * 3.5
    
    # Optical transmission formula:
    # Transmitted stars: starfield * (1 - alpha)
    # Plus scattered cloud light: cloud_color * alpha
    blended = np.zeros_like(starfield_img)
    for c in range(3):
        blended[:, :, c] = starfield_img[:, :, c] * (1.0 - alpha) + cloud_color[c] * alpha
        
    return np.clip(blended, 0.0, 1.0), alpha
