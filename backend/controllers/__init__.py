from flask import Blueprint

api_bp = Blueprint("api", __name__, url_prefix="/api")


def register_controllers(app):
    # Import controllers so that route handlers are registered on the shared blueprint
    from . import seed  # noqa: F401
    from . import favicon  # noqa: F401
    from . import profile  # noqa: F401
    from . import category  # noqa: F401
    from . import subscription  # noqa: F401
    from . import exchange  # noqa: F401
    from . import stats  # noqa: F401

    app.register_blueprint(api_bp)
