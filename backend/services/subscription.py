from datetime import date
from typing import Iterable

from flask import abort

from ..db import db
from ..models import Subscription, PeriodUnit
from .helpers import (
    currency_symbol,
    period_label,
    to_bool,
    to_int,
    to_float,
)


def is_trial_active(sub: Subscription, today: date | None = None) -> bool:
    if not sub.trial_enabled:
        return False
    if sub.trial_price is None:
        return False
    today = today or date.today()
    if sub.trial_end_date and sub.trial_end_date < today:
        return False
    return True


def current_subscription_price(sub: Subscription, today: date | None = None) -> float:
    return sub.trial_price if is_trial_active(sub, today) else sub.price


def subscription_to_dict(sub: Subscription, detail: bool = False) -> dict:
    trial_active = is_trial_active(sub)
    data = {
        "id": sub.id,
        "name": sub.name,
        "icon": sub.icon,
        "logo_url": sub.logo_url,
        "color": sub.color,
        "price": sub.price,
        "currency": sub.currency,
        "currency_symbol": currency_symbol(sub.currency),
        "frequency": sub.frequency,
        "cycle": sub.cycle,
        "period_label": period_label(sub.frequency, sub.cycle),
        "category_id": sub.category_id,
        "disabled": bool(sub.disabled),
        "display_price": current_subscription_price(sub),
        "trial_active": trial_active,
    }
    if detail:
        data.update({
            "start_date": sub.start_date.isoformat() if sub.start_date else None,
            "trial_enabled": sub.trial_enabled,
            "trial_price": sub.trial_price,
            "trial_use_main_cycle": sub.trial_use_main_cycle,
            "trial_frequency": sub.trial_frequency,
            "trial_cycle": sub.trial_cycle,
            "trial_end_date": sub.trial_end_date.isoformat() if sub.trial_end_date else None,
            "notify_enabled": sub.notify_enabled,
            "remind_value": sub.remind_value,
            "remind_unit": sub.remind_unit,
        })
    return data


def _normalize_category_id(category_id):
    if category_id in (None, "", "all"):
        return None
    return to_int(category_id, None)


def apply_subscription_data(sub: Subscription, data: dict, *, default_currency: str, partial: bool = False) -> None:
    default_currency = (default_currency or "USD").upper()

    def should(field: str) -> bool:
        return not partial or field in data

    if should("name"):
        sub.name = data.get("name", sub.name or "Unnamed")

    if should("icon"):
        sub.icon = data.get("icon", sub.icon or "💡")

    if should("logo_url"):
        raw_logo = data.get("logo_url")
        if isinstance(raw_logo, str):
            cleaned = raw_logo.strip()
            sub.logo_url = cleaned or None
        elif raw_logo:
            sub.logo_url = str(raw_logo)

    if should("color"):
        sub.color = data.get("color", sub.color or "#6b7280")

    if should("category_id"):
        sub.category_id = _normalize_category_id(data.get("category_id"))

    if should("price"):
        sub.price = to_float(data.get("price"), sub.price if partial else 0.0) or 0.0

    if should("currency"):
        currency_value = data.get("currency") or sub.currency or default_currency
        sub.currency = (currency_value or default_currency).upper()

    if should("frequency"):
        sub.frequency = to_int(data.get("frequency"), sub.frequency if partial else 1) or 1

    if should("cycle"):
        sub.cycle = (data.get("cycle") or sub.cycle or PeriodUnit.MONTH.value).lower()

    if should("start_date"):
        raw = data.get("start_date")
        if raw:
            try:
                sub.start_date = date.fromisoformat(raw)
            except (TypeError, ValueError):
                pass
        elif not partial:
            sub.start_date = date.today()

    if should("trial_enabled"):
        sub.trial_enabled = to_bool(data.get("trial_enabled"), sub.trial_enabled if partial else False)

    if should("trial_price"):
        sub.trial_price = to_float(data.get("trial_price"), None)

    if should("trial_use_main_cycle"):
        sub.trial_use_main_cycle = to_bool(data.get("trial_use_main_cycle"), sub.trial_use_main_cycle if partial else True)

    if should("trial_frequency"):
        sub.trial_frequency = to_int(data.get("trial_frequency"), sub.trial_frequency)

    if should("trial_cycle"):
        sub.trial_cycle = data.get("trial_cycle") or (None if not partial else sub.trial_cycle)

    if should("trial_end_date"):
        raw = data.get("trial_end_date")
        if raw:
            try:
                sub.trial_end_date = date.fromisoformat(raw)
            except (TypeError, ValueError):
                sub.trial_end_date = None
        else:
            sub.trial_end_date = None

    if should("notify_enabled"):
        sub.notify_enabled = to_bool(data.get("notify_enabled"), sub.notify_enabled if partial else False)

    if should("remind_value"):
        sub.remind_value = to_int(data.get("remind_value"), sub.remind_value if partial else 1)

    if should("remind_unit"):
        unit = data.get("remind_unit")
        sub.remind_unit = unit if unit else (sub.remind_unit if partial else "days")

    if should("disabled"):
        sub.disabled = to_bool(data.get("disabled"), sub.disabled if partial else False)

    if not sub.trial_enabled:
        sub.trial_price = None
        sub.trial_frequency = None
        sub.trial_cycle = None
        sub.trial_end_date = None
    elif sub.trial_use_main_cycle:
        sub.trial_frequency = None
        sub.trial_cycle = None

    if not sub.notify_enabled:
        sub.remind_value = None
        sub.remind_unit = None
    else:
        if sub.remind_value is None:
            sub.remind_value = 1
        if not sub.remind_unit:
            sub.remind_unit = "days"


def list_subscriptions(user, category_id=None) -> Iterable[Subscription]:
    q = Subscription.query.filter_by(user_id=user.id)
    if category_id and category_id != "all":
        q = q.filter_by(category_id=_normalize_category_id(category_id))
    return q.order_by(Subscription.created_at.desc()).all()


def create_subscription(user, data: dict) -> Subscription:
    sub = Subscription(user_id=user.id)
    apply_subscription_data(sub, data, default_currency=user.default_currency, partial=False)
    db.session.add(sub)
    db.session.commit()
    return sub


def get_subscription(user, sid: int) -> Subscription:
    sub = Subscription.query.filter_by(id=sid, user_id=user.id).first()
    if not sub:
        abort(404)
    return sub


def update_subscription(user, sid: int, data: dict, partial: bool = False) -> Subscription:
    sub = get_subscription(user, sid)
    apply_subscription_data(sub, data, default_currency=user.default_currency, partial=partial)
    db.session.commit()
    return sub


def delete_subscription(user, sid: int) -> None:
    sub = get_subscription(user, sid)
    db.session.delete(sub)
    db.session.commit()
