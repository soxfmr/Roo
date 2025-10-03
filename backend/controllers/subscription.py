from flask import request

from ..services.subscription import (
    list_subscriptions,
    create_subscription,
    get_subscription,
    update_subscription,
    delete_subscription,
    subscription_to_dict,
)
from ..services.user import get_or_create_demo_user
from . import api_bp


@api_bp.get("/subscriptions")
def get_subscriptions():
    user = get_or_create_demo_user()
    category_id = request.args.get("category_id")
    subs = list_subscriptions(user, category_id)
    return [subscription_to_dict(s) for s in subs]


@api_bp.post("/subscriptions")
def post_subscription():
    user = get_or_create_demo_user()
    data = request.json or {}
    sub = create_subscription(user, data)
    return subscription_to_dict(sub, detail=True), 201


@api_bp.get("/subscriptions/<int:sid>")
def read_subscription(sid: int):
    user = get_or_create_demo_user()
    sub = get_subscription(user, sid)
    return subscription_to_dict(sub, detail=True)


@api_bp.put("/subscriptions/<int:sid>")
def put_subscription(sid: int):
    user = get_or_create_demo_user()
    data = request.json or {}
    sub = update_subscription(user, sid, data, partial=False)
    return subscription_to_dict(sub, detail=True)


@api_bp.patch("/subscriptions/<int:sid>")
def patch_subscription(sid: int):
    user = get_or_create_demo_user()
    data = request.json or {}
    sub = update_subscription(user, sid, data, partial=True)
    return subscription_to_dict(sub, detail=True)


@api_bp.delete("/subscriptions/<int:sid>")
def remove_subscription(sid: int):
    user = get_or_create_demo_user()
    delete_subscription(user, sid)
    return {"status": "deleted"}
