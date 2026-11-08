"""Deterministic Celestial Mechanics & Ephemeris Engine.
Calculates topocentric Altitude and Azimuth for planets (Mercury, Venus, Mars,
Jupiter, Saturn), Sun, Moon, and Bright Landmark Stars from GPS coordinates
and UTC timestamp. Based on JPL Keplerian orbital elements and Astronomical Algorithms (Meeus).
"""

import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from .catalog_loader import get_bright_stars


# Keplerian elements for the planets (Standish / JPL valid 1800 - 2050 AD)
# Format: [a0, a_rate, e0, e_rate, I0, I_rate, L0, L_rate, w0, w_rate, N0, N_rate]
# a (AU), e (dimensionless), I (deg), L (mean longitude deg), w (perihelion deg), N (node deg)
# rates are per Julian Century (cy)
PLANET_ELEMENTS = {
    "Mercury": {
        "a": (0.38709927, 0.00000037),
        "e": (0.20563593, 0.00001906),
        "I": (7.00497902, -0.00594749),
        "L": (252.25032350, 149472.67411175),
        "w": (77.45779628, 0.16047689),
        "N": (48.33076593, -0.12534081),
        "v0": -0.42, # standard absolute magnitude
    },
    "Venus": {
        "a": (0.72333566, 0.00000390),
        "e": (0.00677672, -0.00004107),
        "I": (3.39467605, -0.00078890),
        "L": (181.97909950, 58517.81538729),
        "w": (131.60246718, 0.00268329),
        "N": (76.67984255, -0.27769418),
        "v0": -4.40,
    },
    "Earth": { # Earth-Moon Barycenter
        "a": (1.00000261, 0.00000562),
        "e": (0.01671123, -0.00004392),
        "I": (0.00001531, -0.01294668),
        "L": (100.46457166, 35999.37244981),
        "w": (102.93768193, 0.32327364),
        "N": (0.0, 0.0),
        "v0": -3.86,
    },
    "Mars": {
        "a": (1.52371034, 0.00001847),
        "e": (0.09339410, 0.00007882),
        "I": (1.84969142, -0.00813131),
        "L": (-4.55343205, 19140.30268499),
        "w": (-23.94362959, 0.44441088),
        "N": (49.55953891, -0.29257343),
        "v0": -1.52,
    },
    "Jupiter": {
        "a": (5.20288700, -0.00011607),
        "e": (0.04838624, -0.00013253),
        "I": (1.30439695, -0.00183714),
        "L": (34.39644051, 3034.74612775),
        "w": (14.72847983, 0.21252668),
        "N": (100.51797059, 0.21555259),
        "v0": -9.40,
    },
    "Saturn": {
        "a": (9.53667594, -0.00125060),
        "e": (0.05386179, -0.00050991),
        "I": (2.48599187, 0.00193609),
        "L": (49.95424423, 1222.49362201),
        "w": (92.59887831, -0.41897216),
        "N": (113.66242448, -0.28867794),
        "v0": -8.88,
    },
}

def to_julian_date(dt: datetime) -> float:
    """Converts a UTC datetime object to Julian Date."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    
    Y = dt.year
    M = dt.month
    D = dt.day + (dt.hour + dt.minute / 60.0 + (dt.second + dt.microsecond / 1e6) / 3600.0) / 24.0
    
    if M <= 2:
        Y -= 1
        M += 12
        
    A = math.floor(Y / 100)
    B = 2 - A + math.floor(A / 4)
    jd = math.floor(365.25 * (Y + 4716)) + math.floor(30.6001 * (M + 1)) + D + B - 1524.5
    return jd

def greenwich_mean_sidereal_time(jd: float) -> float:
    """Returns GMST in degrees (0 to 360)."""
    T = (jd - 2451545.0) / 36525.0
    # IAU expression for GMST in seconds:
    theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T**3) / 38710000.0
    return theta % 360.0

def local_sidereal_time(jd: float, longitude_deg: float) -> float:
    """Returns Local Sidereal Time in degrees (0 to 360) for a given longitude (+ East)."""
    gmst = greenwich_mean_sidereal_time(jd)
    return (gmst + longitude_deg) % 360.0

def _solve_kepler(M_rad: float, e: float, tol: float = 1e-6) -> float:
    """Solves Kepler's equation M = E - e*sin(E) using Newton-Raphson iteration."""
    E = M_rad + e * math.sin(M_rad)
    for _ in range(15):
        delta = E - e * math.sin(E) - M_rad
        if abs(delta) < tol:
            break
        E = E - delta / (1.0 - e * math.cos(E))
    return E

def _heliocentric_coords(planet_name: str, T: float) -> Tuple[float, float, float]:
    """Returns heliocentric ecliptic cartesian coordinates (x, y, z) in AU."""
    elem = PLANET_ELEMENTS[planet_name]
    a = elem["a"][0] + elem["a"][1] * T
    e = elem["e"][0] + elem["e"][1] * T
    I = math.radians(elem["I"][0] + elem["I"][1] * T)
    L = math.radians((elem["L"][0] + elem["L"][1] * T) % 360.0)
    w = math.radians((elem["w"][0] + elem["w"][1] * T) % 360.0)
    N = math.radians((elem["N"][0] + elem["N"][1] * T) % 360.0)
    
    omega_bar = w # longitude of perihelion
    omega = omega_bar - N # argument of perihelion
    M = (L - omega_bar) % (2.0 * math.pi) # Mean anomaly
    
    E = _solve_kepler(M, e)
    
    # Coordinates in orbital plane
    x_prime = a * (math.cos(E) - e)
    y_prime = a * math.sqrt(max(0.0, 1.0 - e * e)) * math.sin(E)
    
    # Transform to ecliptic plane
    cos_w = math.cos(omega)
    sin_w = math.sin(omega)
    cos_N = math.cos(N)
    sin_N = math.sin(N)
    cos_I = math.cos(I)
    sin_I = math.sin(I)
    
    x = (cos_w * cos_N - sin_w * sin_N * cos_I) * x_prime + (-sin_w * cos_N - cos_w * sin_N * cos_I) * y_prime
    y = (cos_w * sin_N + sin_w * cos_N * cos_I) * x_prime + (-sin_w * sin_N + cos_w * cos_N * cos_I) * y_prime
    z = (sin_w * sin_I) * x_prime + (cos_w * sin_I) * y_prime
    
    return x, y, z

def get_planet_equatorial(planet_name: str, jd: float) -> Tuple[float, float, float, float]:
    """Returns (RA_deg, Dec_deg, Distance_AU, Vmag) for a planet at Julian Date jd."""
    T = (jd - 2451545.0) / 36525.0
    
    x_p, y_p, z_p = _heliocentric_coords(planet_name, T)
    x_e, y_e, z_e = _heliocentric_coords("Earth", T)
    
    # Geocentric ecliptic coordinates
    x_geo = x_p - x_e
    y_geo = y_p - y_e
    z_geo = z_p - z_e
    
    dist_geo = math.sqrt(x_geo*x_geo + y_geo*y_geo + z_geo*z_geo)
    dist_helio = math.sqrt(x_p*x_p + y_p*y_p + z_p*z_p)
    dist_sun_earth = math.sqrt(x_e*x_e + y_e*y_e + z_e*z_e)
    
    # Obliquity of the ecliptic (eps)
    eps = math.radians(23.439291 - 0.0130042 * T)
    
    # Convert Ecliptic to Equatorial (J2000)
    x_eq = x_geo
    y_eq = y_geo * math.cos(eps) - z_geo * math.sin(eps)
    z_eq = y_geo * math.sin(eps) + z_geo * math.cos(eps)
    
    ra_rad = math.atan2(y_eq, x_eq) % (2.0 * math.pi)
    dec_rad = math.atan2(z_eq, math.sqrt(x_eq*x_eq + y_eq*y_eq))
    
    # Phase angle (Sun - Planet - Earth)
    cos_phase = (dist_helio**2 + dist_geo**2 - dist_sun_earth**2) / (2.0 * dist_helio * dist_geo)
    cos_phase = max(-1.0, min(1.0, cos_phase))
    phase_deg = math.degrees(math.acos(cos_phase))
    
    # Approximate apparent visual magnitude
    v0 = PLANET_ELEMENTS[planet_name]["v0"]
    vmag = v0 + 5.0 * math.log10(dist_helio * dist_geo) + 0.01 * phase_deg
    
    return math.degrees(ra_rad), math.degrees(dec_rad), dist_geo, vmag

def equatorial_to_horizontal(ra_deg: float, dec_deg: float, latitude_deg: float, longitude_deg: float, jd: float) -> Tuple[float, float]:
    """Converts (RA, Dec) in degrees to topocentric (Altitude, Azimuth) in degrees.
    Azimuth is measured North (0 deg) through East (90 deg).
    Altitude is measured above horizon (-90 to +90 deg).
    """
    lst_deg = local_sidereal_time(jd, longitude_deg)
    ha_deg = (lst_deg - ra_deg) % 360.0 # Hour angle
    
    ha_rad = math.radians(ha_deg)
    dec_rad = math.radians(dec_deg)
    lat_rad = math.radians(latitude_deg)
    
    # Altitude formula
    sin_alt = math.sin(lat_rad) * math.sin(dec_rad) + math.cos(lat_rad) * math.cos(dec_rad) * math.cos(ha_rad)
    sin_alt = max(-1.0, min(1.0, sin_alt))
    alt_rad = math.asin(sin_alt)
    
    # Azimuth formula
    cos_alt = math.cos(alt_rad)
    if cos_alt < 1e-6:
        az_deg = 0.0
    else:
        sin_az = -math.cos(dec_rad) * math.sin(ha_rad) / cos_alt
        cos_az = (math.sin(dec_rad) - math.sin(lat_rad) * sin_alt) / (math.cos(lat_rad) * cos_alt)
        az_rad = math.atan2(sin_az, cos_az) % (2.0 * math.pi)
        az_deg = math.degrees(az_rad)
        
    return math.degrees(alt_rad), az_deg

def get_visible_celestial_bodies(latitude_deg: float, longitude_deg: float, dt_utc: datetime, min_alt_deg: float = -5.0) -> List[Dict[str, Any]]:
    """Returns list of visible planets and bright stars sorted by brightness (Vmag ascending)."""
    jd = to_julian_date(dt_utc)
    results = []
    
    # 1. Compute Planets
    planets = ["Venus", "Mars", "Jupiter", "Saturn", "Mercury"]
    for p in planets:
        ra, dec, dist, vmag = get_planet_equatorial(p, jd)
        alt, az = equatorial_to_horizontal(ra, dec, latitude_deg, longitude_deg, jd)
        if alt >= min_alt_deg:
            results.append({
                "name": p,
                "type": "planet",
                "alt_deg": round(alt, 2),
                "az_deg": round(az, 2),
                "ra_deg": round(ra, 2),
                "dec_deg": round(dec, 2),
                "vmag": round(vmag, 2),
                "dist_au": round(dist, 3)
            })
            
    # 2. Compute Bright Stars
    stars = get_bright_stars()
    for s in stars:
        ra_deg = s["ra_hours"] * 15.0
        dec_deg = s["dec_deg"]
        alt, az = equatorial_to_horizontal(ra_deg, dec_deg, latitude_deg, longitude_deg, jd)
        if alt >= min_alt_deg:
            results.append({
                "name": s["name"],
                "constellation": s.get("constellation", ""),
                "type": "star",
                "alt_deg": round(alt, 2),
                "az_deg": round(az, 2),
                "ra_deg": round(ra_deg, 2),
                "dec_deg": round(dec_deg, 2),
                "vmag": s["vmag"]
            })
            
    # Sort by brightness (lowest Vmag is brightest)
    results.sort(key=lambda x: x["vmag"])
    return results
