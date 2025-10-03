from ..db import db
from ..models import Category, Subscription, PeriodUnit


def seed_defaults(user):
    if Category.query.filter_by(user_id=user.id).count() > 0:
        return

    entertainment = Category(user_id=user.id, name="Entertainment", color="#ef4444")
    productivity = Category(user_id=user.id, name="Productivity", color="#22c55e")
    education = Category(user_id=user.id, name="Education", color="#3b82f6")
    db.session.add_all([entertainment, productivity, education])
    db.session.flush()

    default_currency = user.default_currency
    subscriptions = [
        Subscription(
            user_id=user.id,
            category_id=entertainment.id,
            name="Netflix",
            icon="🎬",
            color=entertainment.color,
            price=15.99,
            currency=default_currency,
            frequency=1,
            cycle=PeriodUnit.MONTH.value,
        ),
        Subscription(
            user_id=user.id,
            category_id=productivity.id,
            name="Notion",
            icon="🗒️",
            color=productivity.color,
            price=8,
            currency=default_currency,
            frequency=1,
            cycle=PeriodUnit.MONTH.value,
        ),
        Subscription(
            user_id=user.id,
            category_id=education.id,
            name="Coursera",
            icon="📚",
            color=education.color,
            price=49,
            currency=default_currency,
            frequency=1,
            cycle=PeriodUnit.MONTH.value,
        ),
    ]
    db.session.add_all(subscriptions)
    db.session.commit()
