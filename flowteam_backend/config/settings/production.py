from .base import *

DEBUG = False

# Enable Axes lockouts in production.
_axes_mw = "axes.middleware.AxesMiddleware"
if _axes_mw not in MIDDLEWARE:
    try:
        idx = MIDDLEWARE.index("django.contrib.auth.middleware.AuthenticationMiddleware") + 1
        MIDDLEWARE.insert(idx, _axes_mw)
    except ValueError:
        MIDDLEWARE.insert(0, _axes_mw)
