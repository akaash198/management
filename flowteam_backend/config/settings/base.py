import os
import sys
from datetime import timedelta
from pathlib import Path
import environ
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    USE_SQLITE=(bool, False),
    DISABLE_REDIS=(bool, False),
    REQUIRE_EMAIL_VERIFICATION=(bool, False),
    JSON_LOGS=(bool, False),
    LOG_LEVEL=(str, "INFO"),
    TOTP_ISSUER=(str, "FlowTeam"),
)

# Reading .env file
# Save whether DATABASE_URL was provided explicitly by the environment (e.g. Docker/CI/host shell).
# If it wasn't set yet, `.env` may populate it; we treat that as a fallback, not a hard override of DB_* parts.
_EXPLICIT_DATABASE_URL = os.environ.get("DATABASE_URL")
_DOTENV_PATH = os.path.join(BASE_DIR, ".env")
if os.path.exists(_DOTENV_PATH):
    environ.Env.read_env(_DOTENV_PATH)

# If running `manage.py test` without explicit env, default to SQLite + in-memory services.
_RUNNING_TESTS = any(arg in ("test", "pytest") for arg in sys.argv)
if _RUNNING_TESTS:
    os.environ.setdefault("USE_SQLITE", "True")
    os.environ.setdefault("DISABLE_REDIS", "True")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
REQUIRE_EMAIL_VERIFICATION = env("REQUIRE_EMAIL_VERIFICATION")
JSON_LOGS = env("JSON_LOGS")
LOG_LEVEL = env("LOG_LEVEL")
TOTP_ISSUER = env("TOTP_ISSUER")

# Application definition
INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    
    # Local apps
    "apps.users",
    "apps.companies",
    "apps.teams",
    "apps.projects",
    "apps.messaging",
    "apps.dashboard",
    "apps.audit",
    "apps.analytics",
    "apps.integrations",
    "apps.meetings",
    "apps.billing",
    "apps.ai",
    "apps.reports",
    "channels",
    "guardian",
    "axes",
    "django_filters",
    "django_celery_beat",
    "django_celery_results",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.RequestIDMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",
    "apps.core.middleware.RateLimitMiddleware",
]

ROOT_URLCONF = "config.urls"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

USE_SQLITE = env("USE_SQLITE")
DISABLE_REDIS = env("DISABLE_REDIS")

# Database
if USE_SQLITE:
    DATABASES = {"default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")}
else:
    if _EXPLICIT_DATABASE_URL:
        DATABASES = {"default": env.db("DATABASE_URL")}
    else:
        _db_name = os.environ.get("DB_NAME")
        _db_user = os.environ.get("DB_USER")
        _db_password = os.environ.get("DB_PASSWORD")
        _db_host = os.environ.get("DB_HOST")
        _db_port = os.environ.get("DB_PORT")

        _db_parts_complete = all([_db_name, _db_user, _db_password, _db_host, _db_port])

        # Prefer DB_* parts when they are present (common in Docker), otherwise fall back to DATABASE_URL.
        # This prevents a `.env`-provided DATABASE_URL (often pointing to localhost) from breaking container DBs.
        if _db_parts_complete:
            DATABASES = {
                "default": {
                    "ENGINE": "django.db.backends.postgresql",
                    "NAME": _db_name,
                    "USER": _db_user,
                    "PASSWORD": _db_password,
                    "HOST": _db_host,
                    "PORT": _db_port,
                }
            }
        else:
            DATABASES = {
                "default": env.db(
                    "DATABASE_URL",
                    default=f'postgres://{env("DB_USER")}:{env("DB_PASSWORD")}@{env("DB_HOST")}:{env("DB_PORT")}/{env("DB_NAME")}',
                )
            }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Password reset tokens expire after 1 hour (Django default is 3 days)
PASSWORD_RESET_TIMEOUT = 3600

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
MEDIA_URL = "media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Optional S3/R2 storage (requires `django-storages` + `boto3` in production)
USE_S3_STORAGE = env.bool("USE_S3_STORAGE", default=False)
if USE_S3_STORAGE:
    try:
        import storages  # noqa: F401
    except Exception as e:
        raise ImproperlyConfigured("USE_S3_STORAGE=True requires django-storages to be installed") from e

    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="")
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default="")  # R2/MinIO compatible
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    AWS_S3_SIGNATURE_VERSION = env("AWS_S3_SIGNATURE_VERSION", default="s3v4")
    AWS_S3_ADDRESSING_STYLE = env("AWS_S3_ADDRESSING_STYLE", default="auto")
    AWS_DEFAULT_ACL = None

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom Auth User
AUTH_USER_MODEL = "users.User"

# REST Framework
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "guardian.backends.ObjectPermissionBackend",
    "axes.backends.AxesStandaloneBackend",
]

ANONYMOUS_USER_NAME = None

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.core.jwt_cookie_auth.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "EXCEPTION_HANDLER": "config.utils.custom_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS — always restrict, even in debug
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

# Security headers
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "SAMEORIGIN"

# Channels
if DISABLE_REDIS:
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [env("REDIS_URL", default="redis://localhost:6379")],
                # Tuning knobs for bursty real-time workloads
                "capacity": env.int("CHANNEL_LAYER_CAPACITY", default=1000),
                "expiry": env.int("CHANNEL_LAYER_EXPIRY", default=60),
            },
        }
    }

# Celery
CELERY_BROKER_URL = "memory://" if DISABLE_REDIS else env("REDIS_URL", default="redis://localhost:6379")
CELERY_TASK_ALWAYS_EAGER = _RUNNING_TESTS or DISABLE_REDIS
if DISABLE_REDIS:
    import warnings
    warnings.warn("DISABLE_REDIS=True — Celery tasks will execute synchronously (always eager)", RuntimeWarning, stacklevel=2)
CELERY_RESULT_BACKEND = "django-db"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"

# Redis Cache
if DISABLE_REDIS:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "flowteam"}}
else:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": env("REDIS_URL", default="redis://localhost:6379/1"),
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                # In local/dev it’s common to run without Redis. Avoid hard crashes and treat cache failures as misses.
                "IGNORE_EXCEPTIONS": True,
                "SOCKET_CONNECT_TIMEOUT": 1,
                "SOCKET_TIMEOUT": 1,
                "CONNECTION_POOL_CLASS": "redis.ConnectionPool",
                "CONNECTION_POOL_CLASS_KWARGS": {"max_connections": 50, "retry_on_timeout": True},
            },
            "KEY_PREFIX": "flowteam",
            "TIMEOUT": 300,
        }
    }

# Axes settings
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = timedelta(minutes=15)
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_PARAMETERS = ["ip_address", "username"]

# Upload & request size limits
DATA_UPLOAD_MAX_MEMORY_SIZE = env.int("DATA_UPLOAD_MAX_MEMORY_SIZE", default=10 * 1024 * 1024)  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = env.int("FILE_UPLOAD_MAX_MEMORY_SIZE", default=10 * 1024 * 1024)  # 10MB

# Audit retention
AUDIT_LOG_RETENTION_DAYS = env.int("AUDIT_LOG_RETENTION_DAYS", default=365)

# Email (production via SMTP; dev defaults to console via config.settings.development)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="info@cowrkflow.com")
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:3000")
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=25)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=False)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_PROVIDER = env("EMAIL_PROVIDER", default="django")  # django | resend | sendgrid
RESEND_API_KEY = env("RESEND_API_KEY", default="")
SENDGRID_API_KEY = env("SENDGRID_API_KEY", default="")

# Stripe billing (optional; required for paid upgrades)
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")
STRIPE_PRICE_ID_PRO = env("STRIPE_PRICE_ID_PRO", default="")
STRIPE_PRICE_ID_AI = env("STRIPE_PRICE_ID_AI", default="")
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
OPENAI_TRANSCRIBE_MODEL = env("OPENAI_TRANSCRIBE_MODEL", default="gpt-4o-mini-transcribe")

# Web Push (VAPID)
VAPID_PRIVATE_KEY = env("VAPID_PRIVATE_KEY", default="")
VAPID_PUBLIC_KEY = env("VAPID_PUBLIC_KEY", default="")
VAPID_CLAIMS_SUB = env("VAPID_CLAIMS_SUB", default="mailto:admin@example.com")

# OAuth providers
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET", default="")
GOOGLE_REDIRECT_URI = env("GOOGLE_REDIRECT_URI", default="")
GOOGLE_CALENDAR_REDIRECT_URI = env("GOOGLE_CALENDAR_REDIRECT_URI", default="")

# GitHub Actions runners often reserve `GITHUB_*` env vars. In those environments we
# accept `COWRK_GITHUB_*` aliases as a fallback.
def _env_with_fallback(key: str, fallback_key: str) -> str:
    return env(key, default=env(fallback_key, default=""))


GITHUB_CLIENT_ID = _env_with_fallback("GITHUB_CLIENT_ID", "COWRK_GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = _env_with_fallback("GITHUB_CLIENT_SECRET", "COWRK_GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = _env_with_fallback("GITHUB_REDIRECT_URI", "COWRK_GITHUB_REDIRECT_URI")
GITHUB_WEBHOOK_SECRET = _env_with_fallback("GITHUB_WEBHOOK_SECRET", "COWRK_GITHUB_WEBHOOK_SECRET")

GITLAB_CLIENT_ID = env("GITLAB_CLIENT_ID", default="")
GITLAB_CLIENT_SECRET = env("GITLAB_CLIENT_SECRET", default="")
GITLAB_REDIRECT_URI = env("GITLAB_REDIRECT_URI", default="")
GITLAB_WEBHOOK_SECRET = env("GITLAB_WEBHOOK_SECRET", default="")

BITBUCKET_CLIENT_ID = env("BITBUCKET_CLIENT_ID", default="")
BITBUCKET_CLIENT_SECRET = env("BITBUCKET_CLIENT_SECRET", default="")
BITBUCKET_REDIRECT_URI = env("BITBUCKET_REDIRECT_URI", default="")
BITBUCKET_WEBHOOK_SECRET = env("BITBUCKET_WEBHOOK_SECRET", default="")

MICROSOFT_CLIENT_ID = env("MICROSOFT_CLIENT_ID", default="")
MICROSOFT_CLIENT_SECRET = env("MICROSOFT_CLIENT_SECRET", default="")
MICROSOFT_REDIRECT_URI = env("MICROSOFT_REDIRECT_URI", default="")
MICROSOFT_CALENDAR_REDIRECT_URI = env("MICROSOFT_CALENDAR_REDIRECT_URI", default="")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "apps.core.request_id.RequestIdLogFilter"},
    },
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "fmt": "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
        },
        "console": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s [%(request_id)s]"},
    },
    "handlers": {
        "default": {
            "class": "logging.StreamHandler",
            "formatter": "json" if JSON_LOGS else "console",
            "filters": ["request_id"],
        }
    },
    "root": {"handlers": ["default"], "level": LOG_LEVEL},
}
