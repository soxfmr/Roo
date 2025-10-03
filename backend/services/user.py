from ..db import db
from ..models import User


def get_or_create_demo_user() -> User:
    user = User.query.get(1)
    if not user:
        user = User(username="demo")
        user.set_password("demo")
        db.session.add(user)
        db.session.commit()
    return user
