from flask import request

from ..services.profile import serialize_profile, update_profile
from ..services.user import get_or_create_demo_user
from . import api_bp


@api_bp.get("/profile")
def get_profile():
    user = get_or_create_demo_user()
    return serialize_profile(user)


@api_bp.put("/profile")
def put_profile():
    user = get_or_create_demo_user()
    data = request.json or {}
    body, status = update_profile(user, data)
    return body, status
