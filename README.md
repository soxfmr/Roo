# Subscriptions Tracker (Flask + Vue + Tailwind)

Mobile‑first subscriptions tracker with Flask backend and Vue 3 + Tailwind frontend.

## Features

- Main page: category picker, add button, list of subscriptions, fixed footer with total. Header/footer slide away on scroll down.
- Period cycling: weekly, monthly, quarterly, yearly, computed with reasonable day-based averages.
- Statistics: slide-up view with segmented tabs (All, by Categories), info card, period tabs, SVG Donut and Column charts.
- New Subscription: iOS-like inputs, logo picker (emoji), color swatches + color picker, trial options, notify/remind options.
- Settings: iOS-style list with Default Currency modal, Exchange rate management. Totals use the selected default currency.

## Backend

- Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-CORS
- SQLite DB by default (`app.db`)
- Seed endpoint creates demo data

### Setup

1. Create a virtualenv and install deps:

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Run the app:

```
python -m backend.app
```

3. Open http://localhost:5000 in your mobile browser or device emulator.

The frontend is served by Flask from `frontend/`.

### Notes

- Seed data loads automatically on first frontend load. You can also call `POST /api/seed` manually. For convenience during development, `GET /api/seed` also works and is idempotent.
- Exchange rates are user-managed; totals convert subscription currency → default currency using saved rates.
- Period math uses 7 days per week, 30.4375 days per month, 91.3125 per quarter, 365.25 per year.
- Period labels use “1 QUARTER” and “2 QUARTERS”, which are the correct forms when written as counts.

### Docker

- Build and run with docker compose:

```
docker compose -f build/docker-compose.yml up --build
```

- Environment variables:
  - For Docker Compose, variables are loaded from `build/.env` (Compose reads `.env` next to `docker-compose.yml`).
  - For local dev, the app reads from process env; set variables in your shell or export them via a local `.env` loader if you prefer.
  - `SECRET_KEY` – Flask secret key
  - `DATABASE_URL` – SQLAlchemy URL
    - Default inside the container: `sqlite:////data/app.db`
    - Default for local dev: `sqlite:///<repo>/data/app.db` (under the repo `data/` dir)
    - Relative SQLite URLs (e.g. `sqlite:///my.db` or `sqlite:///db/app.db`) are automatically mapped to an absolute path using `DB_LOCAL_DIR` (or `./data` if not set).
  - `DB_LOCAL_DIR` – host directory to bind-mount at `/data` in the API container (default `../data`) and used for local path mapping when `DATABASE_URL` is a relative SQLite URL.

- Examples:
  - Use a custom local directory for SQLite:
    - In `build/.env` (for Docker Compose):
      - `DB_LOCAL_DIR=/absolute/path/to/dbdir`
      - `DATABASE_URL=sqlite:////data/custom.db`
  - Use the default mapping but custom filename:
    - In `build/.env` (for Docker Compose):
      - `DATABASE_URL=sqlite:////data/mydb.sqlite`
  - Use a relative SQLite URL and map it locally (no Docker):
    - In your shell: `export DATABASE_URL=sqlite:///my_local.db` and optionally `export DB_LOCAL_DIR=/path/to/devdbdir`
    - The app will resolve to an absolute path under `DB_LOCAL_DIR` (or `./data`).

## Frontend

- Vue 3 + Vue Router via CDN, Tailwind via CDN
- No external charting lib; charts are simple SVGs

### Structure

- `frontend/index.html` – Root HTML and Tailwind config
- `frontend/app.js` – Vue app, routes, components

## API Overview

- `GET /api/profile` – current user profile
- `PUT /api/profile` – update profile settings (username, password, default_currency, notifications_enabled)
- `GET /api/categories` – list categories
- `POST /api/categories` – create category
- `GET /api/subscriptions` – list subscriptions (optional `category_id` or `all`)
- `POST /api/subscriptions` – create subscription
- `DELETE /api/subscriptions/:id` – delete subscription
- `GET /api/exchange` – list exchange rates
- `POST /api/exchange` – upsert an exchange rate
- `GET /api/stats/summary` – totals + per-sub breakdown (params: `period`, `category_id`)
- `GET /api/stats/by-category` – totals grouped by category (param: `period`)

## Development Tips

- To adjust colors/icons, see `frontend/app.js` (swatches and emoji list).
- If you prefer npm-based Tailwind/Vite, you can migrate the CDN setup.
- Authentication is stubbed (single demo user). Add real auth as needed.
