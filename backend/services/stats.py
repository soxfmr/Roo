from collections import defaultdict

from ..models import Subscription, Category, ExchangeRate
from .helpers import normalize_to_period, currency_symbol
from .subscription import current_subscription_price


def _convert_amount(user, amount: float, currency: str, target_currency: str) -> float:
    source = currency.upper()
    target = target_currency.upper()
    if source == target:
        return amount
    rate_row = ExchangeRate.query.filter_by(user_id=user.id, base=source, target=target).first()
    if rate_row:
        return amount * rate_row.rate
    return amount


def build_summary(user, period: str, category_id: str | None):
    subs_q = Subscription.query.filter_by(user_id=user.id, disabled=False)
    if category_id and category_id != "all":
        subs_q = subs_q.filter_by(category_id=int(category_id))
    subs = subs_q.all()

    target_currency = user.default_currency
    total = 0.0
    breakdown = []
    for sub in subs:
        amount = _convert_amount(user, current_subscription_price(sub), sub.currency, target_currency)
        normalized = normalize_to_period(amount, sub.frequency, sub.cycle, period)
        total += normalized
        breakdown.append({
            "id": sub.id,
            "name": sub.name,
            "category_id": sub.category_id,
            "color": sub.color,
            "value": normalized,
        })

    return {
        "currency": target_currency,
        "currency_symbol": currency_symbol(target_currency),
        "period": period,
        "total": round(total, 2),
        "breakdown": breakdown,
    }


def stats_by_category(user, period: str):
    subs = Subscription.query.filter_by(user_id=user.id, disabled=False).all()
    target_currency = user.default_currency

    totals = defaultdict(lambda: {"value": 0.0, "color": None})
    for sub in subs:
        amount = _convert_amount(user, current_subscription_price(sub), sub.currency, target_currency)
        normalized = normalize_to_period(amount, sub.frequency, sub.cycle, period)
        key = sub.category_id or 0
        entry = totals[key]
        entry["value"] += normalized
        if not entry["color"]:
            entry["color"] = sub.color

    categories = {c.id: c for c in Category.query.filter_by(user_id=user.id).all()}
    items = []
    for cid, info in totals.items():
        category = categories.get(cid)
        name = category.name if category else "Uncategorized"
        color = category.color if category else info.get("color") or "#6b7280"
        items.append({
            "category_id": cid,
            "name": name,
            "color": color,
            "value": round(info["value"], 2),
        })

    return {
        "currency": target_currency,
        "currency_symbol": currency_symbol(target_currency),
        "period": period,
        "items": items,
    }
