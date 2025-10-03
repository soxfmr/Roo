from flask import request

from ..services.seed import seed_defaults
from ..services.user import get_or_create_demo_user
from . import api_bp


@api_bp.route("/seed", methods=["POST", "GET", "OPTIONS"])
def seed():
    # Allow both POST and GET for convenience
    if request.method == "OPTIONS":  # Preflight passthrough
        return {"status": "ok"}

    user = get_or_create_demo_user()
    seed_defaults(user)
    return {"status": "seeded"}
