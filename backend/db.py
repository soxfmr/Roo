from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import inspect, text

db = SQLAlchemy()
migrate = Migrate()


def init_db(app):
    db.init_app(app)
    migrate.init_app(app, db)
    # Dev convenience: auto create tables if not present
    with app.app_context():
        # Import models before create_all so metadata is populated
        from . import models  # noqa: F401

        try:
            db.create_all()
        except Exception:
            pass

        try:
            inspector = inspect(db.engine)
            columns = {col['name'] for col in inspector.get_columns('subscriptions')}
        except Exception:
            columns = set()

        if 'disabled' not in columns:
            try:
                db.session.execute(text('ALTER TABLE subscriptions ADD COLUMN disabled BOOLEAN DEFAULT 0'))
                db.session.execute(text('UPDATE subscriptions SET disabled = 0 WHERE disabled IS NULL'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if 'logo_url' not in columns:
            try:
                db.session.execute(text('ALTER TABLE subscriptions ADD COLUMN logo_url TEXT'))
                db.session.commit()
            except Exception:
                db.session.rollback()
