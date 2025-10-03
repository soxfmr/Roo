import base64
import io
from urllib.parse import urlparse

import requests
from colorthief import ColorThief


class FaviconError(Exception):
    pass


class InvalidURLError(FaviconError):
    pass


class FetchFailedError(FaviconError):
    pass


def _normalize_url(raw: str) -> str:
    if not raw:
        return ""
    raw = raw.strip()
    if not raw:
        return ""
    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    if not parsed.netloc:
        return ""
    scheme = parsed.scheme or "https"
    return f"{scheme}://{parsed.netloc}"


def fetch_favicon_payload(site_url: str, size: int = 128, fallback_color: str | None = None) -> dict:
    normalized = _normalize_url(site_url)
    if not normalized:
        raise InvalidURLError("invalid url")

    domain = urlparse(normalized).netloc
    favicon_url = f"https://www.google.com/s2/favicons?sz={size}&domain={domain}"
    try:
        response = requests.get(favicon_url, timeout=5)
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - network dependent
        raise FetchFailedError("fetch failed") from exc

    content_type = response.headers.get("Content-Type", "image/png")
    buffer = io.BytesIO(response.content)
    dominant_hex = None
    try:
        buffer.seek(0)
        thief = ColorThief(buffer)
        rgb = thief.get_color(quality=1)
        if rgb and len(rgb) == 3:
            dominant_hex = "#%02x%02x%02x" % rgb
    except Exception:  # pragma: no cover - depends on pillow decoding support
        dominant_hex = None
    finally:
        buffer.seek(0)

    b64 = base64.b64encode(buffer.read()).decode("ascii")
    data_url = f"data:{content_type};base64,{b64}"
    return {
        "domain": domain,
        "favicon_url": favicon_url,
        "favicon_data": data_url,
        "color": dominant_hex or fallback_color,
        "normalized_url": normalized,
    }
