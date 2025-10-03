from datetime import datetime, date
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from .db import db


class PeriodUnit(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    default_currency = db.Column(db.String(3), default="USD", nullable=False)
    notifications_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    categories = db.relationship("Category", backref="user", lazy=True)
    subscriptions = db.relationship("Subscription", backref="user", lazy=True)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    color = db.Column(db.String(7), default="#6b7280")  # hex color
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    subscriptions = db.relationship("Subscription", backref="category", lazy=True)


class Subscription(db.Model):
    __tablename__ = "subscriptions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)

    name = db.Column(db.String(120), nullable=False)
    icon = db.Column(db.Text, default="💡")  # emoji, data URL, or token
    logo_url = db.Column(db.String(512), nullable=True)
    color = db.Column(db.String(7), default="#6b7280")

    price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default="USD")
    frequency = db.Column(db.Integer, default=1)  # e.g., 1 or 2
    cycle = db.Column(db.String(10), default=PeriodUnit.MONTH.value)  # day/week/month/quarter/year
    start_date = db.Column(db.Date, default=date.today)

    trial_enabled = db.Column(db.Boolean, default=False)
    trial_price = db.Column(db.Float, nullable=True)
    trial_use_main_cycle = db.Column(db.Boolean, default=True)
    trial_frequency = db.Column(db.Integer, nullable=True)
    trial_cycle = db.Column(db.String(10), nullable=True)
    trial_end_date = db.Column(db.Date, nullable=True)

    notify_enabled = db.Column(db.Boolean, default=False)
    remind_value = db.Column(db.Integer, default=1)  # e.g., 1..6
    remind_unit = db.Column(db.String(5), default="days")  # days/weeks
    disabled = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ExchangeRate(db.Model):
    __tablename__ = "exchange_rates"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    base = db.Column(db.String(3), nullable=False)
    target = db.Column(db.String(3), nullable=False)
    rate = db.Column(db.Float, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
