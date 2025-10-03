from flask import request

from ..services.exchange import list_exchange_rates, upsert_exchange_rate, serialize_exchange_rate
from ..services.user import get_or_create_demo_user
from . import api_bp


@api_bp.get("/exchange")
def get_exchange_rates():
    user = get_or_create_demo_user()
    rows = list_exchange_rates(user)
    return [serialize_exchange_rate(row) for row in rows]


@api_bp.post("/exchange")
def post_exchange_rate():
    user = get_or_create_demo_user()
    data = request.json or {}
    upsert_exchange_rate(user, data)
    return {"status": "ok"}
