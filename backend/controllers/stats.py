from flask import request

from ..services.stats import build_summary, stats_by_category
from ..services.user import get_or_create_demo_user
from . import api_bp


@api_bp.get("/stats/summary")
def summary():
    user = get_or_create_demo_user()
    period = request.args.get("period", "month").lower()
    category_id = request.args.get("category_id")
    return build_summary(user, period, category_id)


@api_bp.get("/stats/by-category")
def by_category():
    user = get_or_create_demo_user()
    period = request.args.get("period", "month").lower()
    return stats_by_category(user, period)
