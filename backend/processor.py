"""
processor.py
Parses Instagram export files (individual JSONs or a ZIP archive) and
returns the list of accounts the user follows but that do NOT follow back.

Supported JSON structure variants:
  Variant A — wrapper key (common):
    {"relationships_followers": [{"string_list_data": [{"value": "user"}]}]}
  Variant B — bare list (large accounts / newer exports):
    [{"string_list_data": [{"value": "user"}]}]
  Variant C — title field instead of value (2024+ exports):
    [{"title": "user", "string_list_data": [{"href": "..."}]}]
  Variant D — direct value or href on each item (older exports):
    [{"value": "user"}]  or  [{"href": "https://instagram.com/_u/user"}]
"""

import io
import json
import re
import zipfile
from typing import Any


# ── Known top-level wrapper keys, in priority order ───────────────────────────
_KNOWN_KEYS = (
    "relationships_followers",
    "relationships_following",
    "relationships_follow",
    "followers",
    "following",
)

# ── Filename patterns inside the ZIP ─────────────────────────────────────────
# Instagram splits large follower lists as followers_1.json, followers_2.json…
_FOLLOWERS_RE = re.compile(r'^followers(_\d+)?\.json$', re.IGNORECASE)
_FOLLOWING_RE = re.compile(r'^following(_\d+)?\.json$', re.IGNORECASE)

# Standard path fragment used by Instagram in their export ZIPs
_STANDARD_FOLDER = 'followers_and_following'


# ─────────────────────────────────────────────────────────────────────────────
# Low-level JSON helpers
# ─────────────────────────────────────────────────────────────────────────────

def _unwrap_dict(data: dict) -> list:
    """Extract the inner user-entry list from a top-level dict."""
    # 1. Known Instagram keys
    for key in _KNOWN_KEYS:
        if key in data and isinstance(data[key], list):
            return data[key]
    # 2. First non-empty list value
    for v in data.values():
        if isinstance(v, list) and v:
            return v
    # 3. Any list value (even empty)
    for v in data.values():
        if isinstance(v, list):
            return v
    raise ValueError(
        "Could not find a list of users in the JSON. "
        f"Found top-level keys: {list(data.keys())}"
    )


def _username_from_href(href: str) -> str:
    """Extract a username from an Instagram profile URL."""
    href = href.strip().rstrip("/")
    if not href:
        return ""
    if "/_u/" in href:
        return href.split("/_u/")[-1].strip("/")
    return href.split("/")[-1]


def _extract_username_from_item(item: dict) -> str:
    """
    Try every known field where Instagram stores a username in a list entry.
    Priority:
      1. string_list_data[*].value   — older exports
      2. title                       — 2024+ exports
      3. string_list_data[*].href    — derive from profile URL
      4. item.value                  — bare flat list
      5. item.href                   — bare flat list with URL only
    """
    for entry in item.get("string_list_data", []):
        if isinstance(entry, dict):
            val = entry.get("value", "").strip()
            if val:
                return val

    title = item.get("title", "").strip()
    if title:
        return title

    for entry in item.get("string_list_data", []):
        if isinstance(entry, dict):
            u = _username_from_href(entry.get("href", ""))
            if u:
                return u

    val = item.get("value", "").strip()
    if val:
        return val

    return _username_from_href(item.get("href", ""))


def _extract_usernames(data: Any) -> set:
    """Walk parsed JSON and return the set of all usernames found."""
    usernames: set[str] = set()

    if isinstance(data, dict):
        data = _unwrap_dict(data)

    if not isinstance(data, list):
        raise ValueError(
            f"Expected a JSON list or object, got {type(data).__name__}."
        )

    for item in data:
        if not isinstance(item, dict):
            continue
        username = _extract_username_from_item(item)
        if username:
            usernames.add(username)

    return usernames


# ─────────────────────────────────────────────────────────────────────────────
# Public parse helpers (accept file-like objects, bytes, or str)
# ─────────────────────────────────────────────────────────────────────────────

def parse_followers(file: Any) -> set:
    """Return the set of usernames that follow you."""
    data = json.loads(file) if isinstance(file, (str, bytes)) else json.load(file)
    return _extract_usernames(data)


def parse_following(file: Any) -> set:
    """Return the set of usernames you follow."""
    data = json.loads(file) if isinstance(file, (str, bytes)) else json.load(file)
    return _extract_usernames(data)


# ─────────────────────────────────────────────────────────────────────────────
# Set comparison
# ─────────────────────────────────────────────────────────────────────────────

def get_non_followers(followers: set, following: set) -> list:
    """
    Return a sorted list of accounts you follow that don't follow back.
    Deleted accounts (__deleted__*) are excluded automatically.
    """
    diff = following - followers
    active = {u for u in diff if not u.startswith("__deleted__")}
    return sorted(active, key=str.lower)


# ─────────────────────────────────────────────────────────────────────────────
# ZIP processing
# ─────────────────────────────────────────────────────────────────────────────

def _find_instagram_files(zf: zipfile.ZipFile) -> tuple[list[str], list[str]]:
    """
    Scan a ZipFile and return (followers_paths, following_paths).

    Pass 1 — standard Instagram export path:
      Looks for files inside any folder named 'followers_and_following'.
      Instagram exports use: connections/followers_and_following/
      Large accounts may have a top-level prefix folder, e.g.:
        instagram-username-2024-xx-xx-hash/connections/followers_and_following/

    Pass 2 — fallback (non-standard / translated exports):
      If pass 1 finds nothing, scans the entire archive by filename pattern.
      This handles exports where the folder may be named differently.
    """
    followers: list[str] = []
    following: list[str] = []

    def classify(name: str) -> None:
        # Normalise to forward slashes (some tools use backslashes)
        normalized = name.replace("\\", "/")
        basename = normalized.split("/")[-1].lower()

        if _FOLLOWERS_RE.match(basename):
            followers.append(name)
        elif _FOLLOWING_RE.match(basename):
            following.append(name)

    all_names = zf.namelist()

    # Pass 1 — standard path
    for name in all_names:
        if _STANDARD_FOLDER in name.replace("\\", "/"):
            classify(name)

    # Pass 2 — fallback if standard path found nothing
    if not followers and not following:
        for name in all_names:
            classify(name)

    return followers, following


def process_zip(zip_source: Any) -> dict:
    """
    Process an Instagram export ZIP.

    zip_source can be:
      - bytes / bytearray  (from request.files[…].read())
      - a file-like object with .read()
      - a path string

    Strategy for followers:
      Collects ALL files matching followers(_N)?.json found inside the archive
      and unions their username sets. This ensures no follower is missed even
      when Instagram splits the list across followers_1.json, followers_2.json,
      followers_3.json, etc. (Instagram splits at ~5,000 followers per file).

    Strategy for following:
      Collects all following(_N)?.json files and unions them too, for parity.
    """
    if isinstance(zip_source, (bytes, bytearray)):
        zip_source = io.BytesIO(zip_source)

    try:
        zf = zipfile.ZipFile(zip_source)
    except zipfile.BadZipFile:
        raise ValueError("The uploaded file is not a valid ZIP archive.")

    with zf:
        followers_paths, following_paths = _find_instagram_files(zf)

        if not followers_paths:
            raise ValueError(
                "No followers file found in the ZIP. "
                "Expected a file like: connections/followers_and_following/followers_1.json"
            )
        if not following_paths:
            raise ValueError(
                "No following.json found in the ZIP. "
                "Expected: connections/followers_and_following/following.json"
            )

        # ── Accumulate followers across all followers_*.json files ────────────
        followers_set: set[str] = set()
        for path in followers_paths:
            try:
                with zf.open(path) as f:
                    followers_set |= parse_followers(f.read())
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                raise ValueError(f"Could not parse {path}: {e}")

        # ── Accumulate following (usually just one file) ──────────────────────
        following_set: set[str] = set()
        for path in following_paths:
            try:
                with zf.open(path) as f:
                    following_set |= parse_following(f.read())
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                raise ValueError(f"Could not parse {path}: {e}")

    if not followers_set:
        raise ValueError("Followers files were found but contain no usernames.")
    if not following_set:
        raise ValueError("following.json was found but contains no usernames.")

    non_followers = get_non_followers(followers_set, following_set)

    return {
        "followers_count": len(followers_set),
        "following_count": len(following_set),
        "non_followers_count": len(non_followers),
        "non_followers": non_followers,
        # Extra info so the frontend can show how many files were merged
        "followers_files_merged": len(followers_paths),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Original two-file flow (kept for backwards compatibility)
# ─────────────────────────────────────────────────────────────────────────────

def process_files(followers_file: Any, following_file: Any) -> dict:
    """
    High-level function for the original two-file upload flow.
    Accepts file-like objects, bytes, or str for both JSON files.
    """
    try:
        followers = parse_followers(followers_file)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise ValueError(f"followers file is not valid JSON: {e}")

    try:
        following = parse_following(following_file)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise ValueError(f"following file is not valid JSON: {e}")

    if not followers:
        raise ValueError(
            "No followers found. Make sure you uploaded "
            "followers.json or followers_1.json from your Instagram export."
        )
    if not following:
        raise ValueError(
            "No following accounts found. Make sure you uploaded "
            "following.json from your Instagram export."
        )

    non_followers = get_non_followers(followers, following)

    return {
        "followers_count": len(followers),
        "following_count": len(following),
        "non_followers_count": len(non_followers),
        "non_followers": non_followers,
        "followers_files_merged": 1,
    }
