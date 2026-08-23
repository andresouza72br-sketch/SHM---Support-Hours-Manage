import environ

from .base import *  # noqa: F403
from .base import BASE_DIR

env = environ.Env()

DEBUG = True

ALLOWED_HOSTS = ["*"]

DATABASES = {
    "default": env.db(
        "DATABASE_URL", default="sqlite:///" + str(BASE_DIR / "db.sqlite3")
    )
}

# Em desenvolvimento, sqlite funciona direto sem dependência de postgres levantado
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
