"""Sensor Drift and CMOS Camera Noise Simulation.
Applies realistic physical noise to both telemetry vectors and image pixel data.
"""

import math
from typing import Tuple, Dict, Any
import numpy as np

def inject_telemetry_noise(
    true_heading_deg: float,
    true_tilt_deg: float,
    true_roll_deg: float = 0.0,
    heading_noise_std_deg: float = 6.5,
    tilt_noise_std_deg: float = 1.2,
    roll_noise_std_deg: float = 1.0
) -> Dict[str, float]:
    """Simulates smartphone IMU errors (magnetometer soft/hard iron drift and accel noise).
    Returns dictionary with measured values and the injected errors.
    """
    heading_err = np.random.normal(0.0, heading_noise_std_deg)
    tilt_err = np.random.normal(0.0, tilt_noise_std_deg)
    roll_err = np.random.normal(0.0, roll_noise_std_deg)
    
    measured_heading = (true_heading_deg + heading_err) % 360.0
    measured_tilt = max(0.0, min(90.0, true_tilt_deg + tilt_err))
    measured_roll = true_roll_deg + roll_err
    
    return {
        "true_heading_deg": round(float(true_heading_deg), 2),
        "true_tilt_deg": round(float(true_tilt_deg), 2),
        "true_roll_deg": round(float(true_roll_deg), 2),
        "measured_heading_deg": round(float(measured_heading), 2),
        "measured_tilt_deg": round(float(measured_tilt), 2),
        "measured_roll_deg": round(float(measured_roll), 2),
        "heading_error_deg": round(float(heading_err), 2),
        "tilt_error_deg": round(float(tilt_err), 2),
        "angular_deviation_deg": round(float(math.hypot(heading_err, tilt_err)), 2)
    }

def apply_camera_cmos_noise(
    image: np.ndarray,
    iso_equivalent: int = 3200,
    read_noise_std: float = 0.02
) -> np.ndarray:
    """Simulates mobile CMOS sensor noise in low-light night capture.
    Combines Poisson photon shot noise with Gaussian amplifier readout noise.
    Input image is float32 [0, 1].
    """
    # Scale factor for photon counts (higher ISO = fewer real photons per DN)
    photon_scale = 10000.0 / (iso_equivalent / 400.0)
    
    # Poisson shot noise
    scaled = np.maximum(0.0, image * photon_scale)
    noisy_photons = np.random.poisson(scaled).astype(np.float32)
    shot_noisy = noisy_photons / photon_scale
    
    # Gaussian read noise
    read_noise = np.random.normal(0.0, read_noise_std, size=image.shape).astype(np.float32)
    
    output = shot_noisy + read_noise
    return np.clip(output, 0.0, 1.0)
