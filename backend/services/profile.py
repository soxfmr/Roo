from typing import Tuple

from sqlalchemy.exc import IntegrityError

from ..db import db
from ..models import User


def serialize_profile(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "default_currency": user.default_currency,
        "notifications_enabled": user.notifications_enabled,
    }


def update_profile(user: User, data: dict) -> Tuple[dict, int]:
    errors: dict[str, str] = {}

    if "username" in data:
        new_username = (data.get("username") or "").strip()
        if not new_username:
            errors["username"] = "Username is required."
        else:
            user.username = new_username

    new_password = data.get("password") or ""
    if new_password:
        current = data.get("current_password") or ""
        confirm = data.get("password_confirm") or ""
        if not current or not user.check_password(current):
            errors["current_password"] = "Current password is incorrect."
        if len(new_password) < 8:
            errors["password"] = "Password must be at least 8 characters."
        if confirm and new_password != confirm:
            errors["password_confirm"] = "Passwords do not match."
        if not confirm:
            errors.setdefault("password_confirm", "Please confirm the new password.")
        if "current_password" not in errors and "password" not in errors and "password_confirm" not in errors:
            user.set_password(new_password)

    if "default_currency" in data:
        currency_value = data.get("default_currency") or user.default_currency
        user.default_currency = currency_value.upper()

    if "notifications_enabled" in data:
        user.notifications_enabled = bool(data["notifications_enabled"])

    if errors:
        db.session.rollback()
        return {"errors": errors}, 400

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return {"errors": {"username": "Username already taken."}}, 400

    return {"status": "ok"}, 200
