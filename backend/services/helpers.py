from datetime import date
from typing import Optional

from ..models import PeriodUnit


def currency_symbol(code: str) -> str:
    mapping = {
        "USD": "$",
        "EUR": "€",
        "JPY": "¥",
        "GBP": "£",
        "CNY": "¥",
        "AUD": "A$",
        "CAD": "C$",
        "INR": "₹",
    }
    code = (code or "").upper()
    return mapping.get(code, code)


def normalize_to_period(amount: float, freq: int, unit: str, target: str) -> float:
    # Convert a subscription amount to a target period (week, month, quarter, year)
    per_day = 0.0
    unit_lc = (unit or PeriodUnit.MONTH.value).lower()
    freq = max(1, int(freq or 1))
    if unit_lc == PeriodUnit.DAY.value:
        per_day = amount / freq
    elif unit_lc == PeriodUnit.WEEK.value:
        per_day = amount / (7 * freq)
    elif unit_lc == PeriodUnit.MONTH.value:
        per_day = amount / (30.4375 * freq)
    elif unit_lc == PeriodUnit.QUARTER.value:
        per_day = amount / (91.3125 * freq)
    elif unit_lc == PeriodUnit.YEAR.value:
        per_day = amount / (365.25 * freq)
    else:
        per_day = amount / freq if freq else amount

    target_lc = (target or PeriodUnit.MONTH.value).lower()
    if target_lc == "week":
        return per_day * 7
    if target_lc == "month":
        return per_day * 30.4375
    if target_lc == "quarter":
        return per_day * 91.3125
    if target_lc == "year":
        return per_day * 365.25
    return amount


def period_label(freq: int, unit: str) -> str:
    freq = int(freq or 0)
    unit_lc = (unit or "").lower()
    if freq == 1:
        mapping = {
            "day": "1 DAY",
            "week": "1 WEEK",
            "month": "1 MONTH",
            "quarter": "1 QUARTER",
            "year": "1 YEAR",
        }
        return mapping.get(unit_lc, f"1 {unit_lc.upper()}")

    mapping = {
        "day": "DAYS",
        "week": "WEEKS",
        "month": "MONTHS",
        "quarter": "QUARTERS",
        "year": "YEARS",
    }
    suffix = mapping.get(unit_lc, f"{unit_lc.upper()}S")
    return f"{freq} {suffix}"


def to_bool(value, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def to_int(value, default: Optional[int] = None) -> Optional[int]:
    if value in (None, "", "null"):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def to_float(value, default: Optional[float] = None) -> Optional[float]:
    if value in (None, "", "null"):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def coerce_date(raw, fallback: Optional[date] = None) -> Optional[date]:
    if not raw:
        return fallback
    try:
        return date.fromisoformat(raw)
    except (TypeError, ValueError):
        return fallback
