from flask import request

from ..services.category import list_categories, create_category, delete_category, serialize_category
from ..services.user import get_or_create_demo_user
from . import api_bp


@api_bp.get("/categories")
def get_categories():
    user = get_or_create_demo_user()
    cats = list_categories(user)
    return [serialize_category(c) for c in cats]


@api_bp.post("/categories")
def post_category():
    user = get_or_create_demo_user()
    data = request.json or {}
    category = create_category(user, data)
    return serialize_category(category), 201


@api_bp.delete("/categories/<int:cid>")
def remove_category(cid: int):
    user = get_or_create_demo_user()
    delete_category(user, cid)
    return {"status": "deleted"}
