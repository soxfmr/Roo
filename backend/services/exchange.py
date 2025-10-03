from ..db import db
from ..models import ExchangeRate


def list_exchange_rates(user):
    return ExchangeRate.query.filter_by(user_id=user.id).all()


def upsert_exchange_rate(user, data: dict) -> None:
    base = (data.get("base") or user.default_currency).upper()
    target = (data.get("target") or user.default_currency).upper()
    rate = float(data.get("rate", 1))

    row = ExchangeRate.query.filter_by(user_id=user.id, base=base, target=target).first()
    if not row:
        row = ExchangeRate(user_id=user.id, base=base, target=target, rate=rate)
        db.session.add(row)
    else:
        row.rate = rate
    db.session.commit()


def serialize_exchange_rate(rate: ExchangeRate) -> dict:
    return {"id": rate.id, "base": rate.base, "target": rate.target, "rate": rate.rate}
