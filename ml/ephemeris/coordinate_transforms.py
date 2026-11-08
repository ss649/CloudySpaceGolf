"""Coordinate Transformations between Sky Horizontal Frame (Alt, Az)
and Smartphone Camera 2D Image Space (u, v).
"""

import math
from typing import Tuple, Optional, Dict, Any
import numpy as np

def horizontal_to_unit_vector(alt_deg: float, az_deg: float) -> np.ndarray:
    """Converts (Alt, Az) to East-North-Up (ENU) 3D unit vector.
    Azimuth: 0 deg = North, 90 deg = East, 180 deg = South, 270 deg = West.
    Altitude: 0 deg = Horizon, 90 deg = Zenith.
    """
    alt = math.radians(alt_deg)
    az = math.radians(az_deg)
    
    east = math.cos(alt) * math.sin(az)
    north = math.cos(alt) * math.cos(az)
    up = math.sin(alt)
    return np.array([east, north, up], dtype=np.float64)

def camera_rotation_matrix(heading_deg: float, tilt_deg: float, roll_deg: float = 0.0) -> np.ndarray:
    """Builds rotation matrix from ENU world frame to Camera optical frame.
    Camera frame:
      +Z points out through the camera lens (boresight line of sight).
      +X points to camera right.
      +Y points to camera down (image sensor convention: top-left is 0,0).
    """
    heading = math.radians(heading_deg) # Yaw
    tilt = math.radians(tilt_deg)       # Pitch above horizon
    roll = math.radians(roll_deg)       # Roll around camera lens axis
    
    # 1. Heading rotation around UP axis:
    # North rotates towards East
    R_yaw = np.array([
        [math.cos(heading), -math.sin(heading), 0],
        [math.sin(heading),  math.cos(heading), 0],
        [0, 0, 1]
    ], dtype=np.float64)
    
    # 2. Tilt rotation around camera horizontal axis:
    R_pitch = np.array([
        [1, 0, 0],
        [0, math.cos(tilt), -math.sin(tilt)],
        [0, math.sin(tilt),  math.cos(tilt)]
    ], dtype=np.float64)
    
    # 3. Roll rotation around optical axis:
    R_roll = np.array([
        [math.cos(roll), -math.sin(roll), 0],
        [math.sin(roll),  math.cos(roll), 0],
        [0, 0, 1]
    ], dtype=np.float64)
    
    # Camera boresight looking at (heading, tilt):
    # In ENU:
    look_enu = np.array([
        math.cos(tilt) * math.sin(heading),
        math.cos(tilt) * math.cos(heading),
        math.sin(tilt)
    ])
    
    # Right vector in horizontal plane:
    right_enu = np.array([
        math.cos(heading),
        -math.sin(heading),
        0.0
    ])
    # Down vector = right x look (in right-handed system):
    down_enu = np.cross(look_enu, right_enu)
    
    # Apply roll to (right, down):
    right_rolled = math.cos(roll) * right_enu - math.sin(roll) * down_enu
    down_rolled = math.sin(roll) * right_enu + math.cos(roll) * down_enu
    
    # World (ENU) to Camera matrix:
    R_w2c = np.vstack([right_rolled, down_rolled, look_enu])
    return R_w2c

def project_celestial_to_camera(
    alt_deg: float,
    az_deg: float,
    cam_heading_deg: float,
    cam_tilt_deg: float,
    cam_roll_deg: float = 0.0,
    img_width: int = 1920,
    img_height: int = 1080,
    hfov_deg: float = 68.0
) -> Optional[Tuple[float, float, float]]:
    """Projects celestial (Alt, Az) to camera pixel coordinates (u, v).
    Returns (u, v, angular_distance_deg) if in front of camera, or None if behind.
    """
    v_world = horizontal_to_unit_vector(alt_deg, az_deg)
    R_w2c = camera_rotation_matrix(cam_heading_deg, cam_tilt_deg, cam_roll_deg)
    v_cam = R_w2c @ v_world
    
    # Must be in front of the lens (positive Z)
    if v_cam[2] <= 0.02:
        return None
        
    # Pinhole projection parameters
    cx = img_width / 2.0
    cy = img_height / 2.0
    fx = (img_width / 2.0) / math.tan(math.radians(hfov_deg / 2.0))
    fy = fx # Square pixels
    
    u = cx + fx * (v_cam[0] / v_cam[2])
    v = cy + fy * (v_cam[1] / v_cam[2])
    
    # Angular separation from camera optical center:
    ang_dist_rad = math.atan2(math.hypot(v_cam[0], v_cam[1]), v_cam[2])
    ang_dist_deg = math.degrees(ang_dist_rad)
    
    return u, v, ang_dist_deg

def camera_pixel_to_horizontal(
    u: float,
    v: float,
    cam_heading_deg: float,
    cam_tilt_deg: float,
    cam_roll_deg: float = 0.0,
    img_width: int = 1920,
    img_height: int = 1080,
    hfov_deg: float = 68.0
) -> Tuple[float, float]:
    """Inverse projection: Given a pixel (u, v) and camera orientation,
    computes the corresponding celestial (Alt, Az) in degrees.
    """
    cx = img_width / 2.0
    cy = img_height / 2.0
    fx = (img_width / 2.0) / math.tan(math.radians(hfov_deg / 2.0))
    fy = fx
    
    # Ray in camera frame
    ray_cam = np.array([(u - cx) / fx, (v - cy) / fy, 1.0])
    ray_cam = ray_cam / np.linalg.norm(ray_cam)
    
    # Transform to world (ENU) frame
    R_w2c = camera_rotation_matrix(cam_heading_deg, cam_tilt_deg, cam_roll_deg)
    ray_world = R_w2c.T @ ray_cam
    
    east, north, up = ray_world
    alt_rad = math.asin(max(-1.0, min(1.0, up)))
    az_rad = math.atan2(east, north) % (2.0 * math.pi)
    
    return math.degrees(alt_rad), math.degrees(az_rad)
