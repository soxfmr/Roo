import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from .db import init_db
from .controllers import register_controllers


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
FRONTEND_DIST_DIR = os.path.join(FRONTEND_DIR, 'dist')


def _resolve_database_url():
    """Resolve SQLAlchemy database URL with sensible defaults and local path mapping.

    Priority:
    1) Use DATABASE_URL if provided.
       - If it's a SQLite relative path (sqlite:///relative/path.db), map it under DB_LOCAL_DIR or
         project data dir, producing an absolute path URL.
    2) If no DATABASE_URL, default to:
       - sqlite:////data/app.db when running in a container
       - sqlite:///<project>/data/app.db for local dev
    """
    db_url = os.getenv("DATABASE_URL")
    base_dir = BASE_DIR  # repo root
    data_dir_default = os.path.join(base_dir, "data")
    in_container = os.path.exists("/.dockerenv")

    if not db_url:
        if in_container:
            return "sqlite:////data/app.db"
        # local dev default inside repo data dir
        return f"sqlite:///{os.path.join(data_dir_default, 'app.db')}"

    # Map relative SQLite paths to a concrete directory
    if db_url.startswith("sqlite:///") and not db_url.startswith("sqlite:////"):
        rel_path = db_url[len("sqlite:///"):]
        # If it's already absolute, keep as-is; otherwise, join with DB_LOCAL_DIR (or repo data)
        if not rel_path.startswith("/"):
            base = os.getenv("DB_LOCAL_DIR", data_dir_default)
            abs_path = os.path.join(base, rel_path)
            return f"sqlite:///{abs_path}"
    return db_url


def create_app():
    # Use dist directory if it exists (production), otherwise fallback to source
    static_folder = FRONTEND_DIST_DIR if os.path.exists(FRONTEND_DIST_DIR) else FRONTEND_DIR
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=_resolve_database_url(),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY=os.getenv("SECRET_KEY", "change-me"),
    )

    # Initialize DB and CORS
    init_db(app)
    CORS(app)

    # Register API routes via controller layer
    register_controllers(app)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    # Serve frontend
    @app.route('/')
    def index():
        frontend_dir = FRONTEND_DIST_DIR if os.path.exists(FRONTEND_DIST_DIR) else FRONTEND_DIR
        return send_from_directory(frontend_dir, 'index.html')

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
