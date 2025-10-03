from flask import abort

from ..db import db
from ..models import Category, Subscription


def list_categories(user):
    return Category.query.filter_by(user_id=user.id).order_by(Category.name.asc()).all()


def create_category(user, data: dict) -> Category:
    category = Category(
        user_id=user.id,
        name=data.get("name", "Unnamed"),
        color=data.get("color", "#6b7280"),
    )
    db.session.add(category)
    db.session.commit()
    return category


def delete_category(user, cid: int) -> None:
    category = Category.query.filter_by(id=cid, user_id=user.id).first()
    if not category:
        abort(404)
    try:
        Subscription.query.filter_by(user_id=user.id, category_id=cid).delete(synchronize_session=False)
        db.session.delete(category)
        db.session.commit()
    except Exception:
        db.session.rollback()
        abort(500)


def serialize_category(cat: Category) -> dict:
    return {"id": cat.id, "name": cat.name, "color": cat.color}
