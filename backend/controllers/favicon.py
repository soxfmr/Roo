from flask import request

from ..services.favicon import fetch_favicon_payload, InvalidURLError, FetchFailedError
from . import api_bp


@api_bp.post("/favicon")
def generate_favicon():
    data = request.json or {}
    site_url = data.get("url")
    if not site_url:
        return {"error": "url_required"}, 400
    try:
        payload = fetch_favicon_payload(site_url, fallback_color=data.get("fallback_color"))
    except InvalidURLError:
        return {"error": "invalid_url"}, 400
    except FetchFailedError:
        return {"error": "fetch_failed"}, 502
    return payload
