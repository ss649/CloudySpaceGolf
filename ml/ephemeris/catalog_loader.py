"""Bright Star Catalog (top navigational and landmark stars)
Coordinates in J2000 Right Ascension (hours) and Declination (degrees), plus visual magnitude Vmag.
"""

from typing import List, Dict, Any

BRIGHT_STARS: List[Dict[str, Any]] = [
    {"name": "Sirius", "constellation": "Canis Major", "ra_hours": 6.7525, "dec_deg": -16.7161, "vmag": -1.46},
    {"name": "Canopus", "constellation": "Carina", "ra_hours": 6.3992, "dec_deg": -52.6957, "vmag": -0.74},
    {"name": "Rigil Kentaurus", "constellation": "Centaurus", "ra_hours": 14.6601, "dec_deg": -60.8340, "vmag": -0.27},
    {"name": "Arcturus", "constellation": "Boötes", "ra_hours": 14.2610, "dec_deg": 19.1822, "vmag": -0.05},
    {"name": "Vega", "constellation": "Lyra", "ra_hours": 18.6156, "dec_deg": 38.7836, "vmag": 0.03},
    {"name": "Capella", "constellation": "Auriga", "ra_hours": 5.2781, "dec_deg": 45.9980, "vmag": 0.08},
    {"name": "Rigel", "constellation": "Orion", "ra_hours": 5.2423, "dec_deg": -8.2016, "vmag": 0.13},
    {"name": "Procyon", "constellation": "Canis Minor", "ra_hours": 7.6551, "dec_deg": 5.2250, "vmag": 0.38},
    {"name": "Betelgeuse", "constellation": "Orion", "ra_hours": 5.9195, "dec_deg": 7.4071, "vmag": 0.50},
    {"name": "Achernar", "constellation": "Eridanus", "ra_hours": 1.6286, "dec_deg": -57.2367, "vmag": 0.46},
    {"name": "Hadar", "constellation": "Centaurus", "ra_hours": 14.0637, "dec_deg": -60.3731, "vmag": 0.61},
    {"name": "Altair", "constellation": "Aquila", "ra_hours": 19.8464, "dec_deg": 8.8683, "vmag": 0.77},
    {"name": "Acrux", "constellation": "Crux", "ra_hours": 12.4433, "dec_deg": -63.0991, "vmag": 0.76},
    {"name": "Aldebaran", "constellation": "Taurus", "ra_hours": 4.5987, "dec_deg": 16.5093, "vmag": 0.86},
    {"name": "Antares", "constellation": "Scorpius", "ra_hours": 16.4901, "dec_deg": -26.4320, "vmag": 0.96},
    {"name": "Spica", "constellation": "Virgo", "ra_hours": 13.4199, "dec_deg": -11.1613, "vmag": 0.98},
    {"name": "Pollux", "constellation": "Gemini", "ra_hours": 7.7553, "dec_deg": 28.0262, "vmag": 1.14},
    {"name": "Fomalhaut", "constellation": "Piscis Austrinus", "ra_hours": 22.9608, "dec_deg": -29.6222, "vmag": 1.16},
    {"name": "Deneb", "constellation": "Cygnus", "ra_hours": 20.6905, "dec_deg": 45.2803, "vmag": 1.25},
    {"name": "Mimosa", "constellation": "Crux", "ra_hours": 12.7954, "dec_deg": -59.6888, "vmag": 1.25},
    {"name": "Regulus", "constellation": "Leo", "ra_hours": 10.1395, "dec_deg": 11.9672, "vmag": 1.36},
    {"name": "Adhara", "constellation": "Canis Major", "ra_hours": 6.9771, "dec_deg": -28.9721, "vmag": 1.50},
    {"name": "Castor", "constellation": "Gemini", "ra_hours": 7.5767, "dec_deg": 31.8883, "vmag": 1.58},
    {"name": "Gacrux", "constellation": "Crux", "ra_hours": 12.5194, "dec_deg": -57.1132, "vmag": 1.63},
    {"name": "Bellatrix", "constellation": "Orion", "ra_hours": 5.4189, "dec_deg": 6.3497, "vmag": 1.64},
    {"name": "Elnath", "constellation": "Taurus", "ra_hours": 5.4382, "dec_deg": 28.6075, "vmag": 1.65},
    {"name": "Miaplacidus", "constellation": "Carina", "ra_hours": 9.2208, "dec_deg": -69.7172, "vmag": 1.68},
    {"name": "Alnilam", "constellation": "Orion", "ra_hours": 5.6036, "dec_deg": -1.2019, "vmag": 1.69},
    {"name": "Alnair", "constellation": "Grus", "ra_hours": 22.1372, "dec_deg": -46.9609, "vmag": 1.74},
    {"name": "Alioth", "constellation": "Ursa Major", "ra_hours": 12.9004, "dec_deg": 55.9598, "vmag": 1.77},
    {"name": "Alkaid", "constellation": "Ursa Major", "ra_hours": 13.7923, "dec_deg": 49.3133, "vmag": 1.86},
    {"name": "Dubhe", "constellation": "Ursa Major", "ra_hours": 11.0622, "dec_deg": 61.7508, "vmag": 1.79},
    {"name": "Mirfak", "constellation": "Perseus", "ra_hours": 3.4054, "dec_deg": 49.8612, "vmag": 1.79},
    {"name": "Wezen", "constellation": "Canis Major", "ra_hours": 7.1398, "dec_deg": -26.3932, "vmag": 1.83},
    {"name": "Kaus Australis", "constellation": "Sagittarius", "ra_hours": 18.4029, "dec_deg": -34.3846, "vmag": 1.85},
    {"name": "Polaris", "constellation": "Ursa Minor", "ra_hours": 2.5303, "dec_deg": 89.2641, "vmag": 1.98},
    {"name": "Alpheratz", "constellation": "Andromeda", "ra_hours": 0.1398, "dec_deg": 29.0904, "vmag": 2.06},
    {"name": "Kochab", "constellation": "Ursa Minor", "ra_hours": 14.8451, "dec_deg": 74.1555, "vmag": 2.08},
    {"name": "Rasalhague", "constellation": "Ophiuchus", "ra_hours": 17.5822, "dec_deg": 12.5600, "vmag": 2.08},
    {"name": "Algol", "constellation": "Perseus", "ra_hours": 3.1361, "dec_deg": 40.9556, "vmag": 2.12},
    {"name": "Denebola", "constellation": "Leo", "ra_hours": 11.8176, "dec_deg": 14.5721, "vmag": 2.14},
    {"name": "Hamal", "constellation": "Aries", "ra_hours": 2.1196, "dec_deg": 23.4624, "vmag": 2.01},
]

def get_bright_stars() -> List[Dict[str, Any]]:
    """Returns copy of the bright star catalog."""
    return [dict(s) for s in BRIGHT_STARS]
