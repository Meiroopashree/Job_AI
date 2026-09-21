import re

_JUNK_LOCATIONS = {"", "n/a", "na", "none", "null", "unknown", "location", "-", "--", "unfilled", "search"}

_INDIA_MARKERS = [
    "india",
    "bengaluru",
    "bangalore",
    "mumbai",
    "pune",
    "new delhi",
    "delhi",
    "gurgaon",
    "gurugram",
    "noida",
    "hyderabad",
    "chennai",
    "kolkata",
    "ahmedabad",
    "kochi",
    "indore",
    "jaipur",
    "lucknow",
    "karnataka",
    "maharashtra",
    "tamil nadu",
    "tamilnadu",
    "haryana",
    "telangana",
    "kerala",
    "gujarat",
]

_FOREIGN_COUNTRY_MARKERS = [
    ("us", ["united states", "usa", "u.s.a", "u.s.", "us remote", "remote us", "us-canada", "nyc", "new york", "san francisco", "silicon valley", "seattle", "chicago", "austin", "boston", "atlanta", "texas", "california", "washington", "san diego", "philadelphia", "denver", "miami", "houston", "columbus", "santa clara", "mountain view", "palo alto", "redmond", "sf,"]),
    ("uk", ["united kingdom", "uk", "england", "london", "birmingham", "manchester"]),
    ("ireland", ["ireland", "dublin"]),
    ("canada", ["canada", "toronto", "ontario", "vancouver", "montreal", "calgary", "british columbia"]),
    ("australia", ["australia", "sydney", "melbourne", "brisbane", "perth"]),
    ("singapore", ["singapore"]),
    ("mexico", ["mexico", "mexico city"]),
    ("germany", ["germany", "berlin", "munich", "hamburg"]),
    ("france", ["france", "paris"]),
    ("netherlands", ["netherlands", "amsterdam"]),
    ("spain", ["spain", "madrid", "barcelona"]),
    ("japan", ["japan", "tokyo", "osaka"]),
    ("uae", ["uae", "dubai", "abu dhabi"]),
    ("luxembourg", ["luxembourg"]),
    ("switzerland", ["switzerland", "zurich", "geneva"]),
    ("saudi-arabia", ["saudi arabia", "riyadh"]),
    ("qatar", ["qatar", "doha"]),
    ("kuwait", ["kuwait"]),
    ("hong-kong", ["hong kong"]),
    ("new-zealand", ["new zealand", "auckland"]),
]

_US_TOKEN_RE = re.compile(r"(^|[^a-z0-9])us([^a-z0-9]|$)")


def _norm(location: str) -> str:
    return re.sub(r"[^a-z0-9 ]", " ", (location or "").lower())


def _has_us_token(norm: str) -> bool:
    return bool(_US_TOKEN_RE.search(norm))


def is_junk_location(location) -> bool:
    if not location:
        return True
    norm = _norm(str(location))
    if not norm:
        return True
    if norm.replace(" ", "") in {j.replace(" ", "") for j in _JUNK_LOCATIONS}:
        return True
    return norm.startswith("search")


def detect_country_codes(location) -> set:
    """Return canonical country codes detected in a job/profile location string."""
    if not location:
        return set()
    s = _norm(str(location))
    if not s:
        return set()
    codes = set()
    if "india" in s or any(m in s for m in _INDIA_MARKERS):
        codes.add("in")
    if _has_us_token(s) or any(m in s for m in _FOREIGN_COUNTRY_MARKERS[0][1]):
        codes.add("us")
    for code, markers in _FOREIGN_COUNTRY_MARKERS[1:]:
        if any(m in s for m in markers):
            codes.add(code)
    return codes


def infer_profile_country(location) -> str | None:
    """Return the single best-guess country for a profile, or None if ambiguous/unknown."""
    codes = detect_country_codes(location)
    if len(codes) == 1:
        return next(iter(codes))
    return None