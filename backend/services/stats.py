from collections import defaultdict
from datetime import date, timedelta

from ..models import Subscription, Category, ExchangeRate, PeriodUnit
from .helpers import normalize_to_period, currency_symbol
from .subscription import is_trial_active


def _convert_amount(user, amount: float, currency: str, target_currency: str) -> float:
    source = currency.upper()
    target = target_currency.upper()
    if source == target:
        return amount
    rate_row = ExchangeRate.query.filter_by(user_id=user.id, base=source, target=target).first()
    if rate_row:
        return amount * rate_row.rate
    return amount


def _days_in_period(period: str) -> float:
    """Return the number of days in a given period."""
    period_lc = (period or "month").lower()
    if period_lc == "week":
        return 7.0
    elif period_lc == "month":
        return 30.4375
    elif period_lc == "quarter":
        return 91.3125
    elif period_lc == "year":
        return 365.25
    return 30.4375


def _subscription_cycle_days(sub: Subscription) -> float:
    """Calculate the number of days in one subscription cycle."""
    freq = max(1, int(sub.frequency or 1))
    unit_lc = (sub.cycle or PeriodUnit.MONTH.value).lower()

    if unit_lc == PeriodUnit.DAY.value:
        return float(freq)
    elif unit_lc == PeriodUnit.WEEK.value:
        return 7.0 * freq
    elif unit_lc == PeriodUnit.MONTH.value:
        return 30.4375 * freq
    elif unit_lc == PeriodUnit.QUARTER.value:
        return 91.3125 * freq
    elif unit_lc == PeriodUnit.YEAR.value:
        return 365.25 * freq
    return 30.4375 * freq


def _calculate_weighted_price(sub: Subscription, period: str, today: date | None = None) -> float:
    """
    Calculate the subscription price for a given period, accounting for trial periods
    and billing cycles.

    The billing happens at discrete intervals (monthly, quarterly, etc), not daily.

    Example: Trial $0/month from Sep 1 to Oct 31, then $2/month starting Nov 1.
    For yearly calculation from Oct 15, 2025:
    - Count billing cycles in trial period: Oct (1 month at $0)
    - Count billing cycles in regular period: Nov-Oct next year (11 months at $2)
    - Total for year: 1 * $0 + 11 * $2 = $22
    """
    today = today or date.today()

    # If trial is not enabled or trial price is not set, use regular price
    if not sub.trial_enabled or sub.trial_price is None:
        return normalize_to_period(sub.price, sub.frequency, sub.cycle, period)

    # If trial has already ended, use regular price
    if sub.trial_end_date and sub.trial_end_date < today:
        return normalize_to_period(sub.price, sub.frequency, sub.cycle, period)

    # If trial is active but has no end date, use trial price for entire period
    if not sub.trial_end_date:
        return normalize_to_period(sub.trial_price, sub.frequency, sub.cycle, period)

    # Trial is active and has an end date
    # We need to count how many billing cycles occur during trial vs after trial

    period_days = _days_in_period(period)
    period_start = today
    period_end = today + timedelta(days=period_days)
    cycle_days = _subscription_cycle_days(sub)

    # If trial ends before the period starts, no trial cycles
    if sub.trial_end_date < period_start:
        return normalize_to_period(sub.price, sub.frequency, sub.cycle, period)

    # If trial ends after the period ends, all trial cycles
    if sub.trial_end_date >= period_end:
        return normalize_to_period(sub.trial_price, sub.frequency, sub.cycle, period)

    # Trial ends during the period - count billing cycles at each price
    # Start from the subscription start date (or today if subscription started earlier)
    billing_anchor = sub.start_date if sub.start_date else today

    # Adjust billing anchor to be within our calculation period
    if billing_anchor < period_start:
        # Find the first billing date on or after period_start
        days_diff = (period_start - billing_anchor).days
        cycles_passed = int(days_diff / cycle_days)
        billing_anchor = billing_anchor + timedelta(days=cycles_passed * cycle_days)
        if billing_anchor < period_start:
            billing_anchor = billing_anchor + timedelta(days=cycle_days)

    total_cost = 0.0
    current_billing_date = billing_anchor

    # Iterate through each billing cycle in the period
    while current_billing_date < period_end:
        # Determine which price applies to this billing cycle
        if current_billing_date <= sub.trial_end_date:
            # This billing cycle is during the trial period
            price = sub.trial_price
        else:
            # This billing cycle is after the trial period
            price = sub.price

        # Add the full price for this billing cycle
        total_cost += price

        # Move to next billing date
        current_billing_date = current_billing_date + timedelta(days=cycle_days)

    return total_cost


def build_summary(user, period: str, category_id: str | None):
    subs_q = Subscription.query.filter_by(user_id=user.id, disabled=False)
    if category_id and category_id != "all":
        subs_q = subs_q.filter_by(category_id=int(category_id))
    subs = subs_q.all()

    target_currency = user.default_currency
    total = 0.0
    breakdown = []
    for sub in subs:
        # Calculate weighted price for the period (accounting for trial)
        normalized = _calculate_weighted_price(sub, period)
        # Convert to target currency
        normalized = _convert_amount(user, normalized, sub.currency, target_currency)
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
        # Calculate weighted price for the period (accounting for trial)
        normalized = _calculate_weighted_price(sub, period)
        # Convert to target currency
        normalized = _convert_amount(user, normalized, sub.currency, target_currency)
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
