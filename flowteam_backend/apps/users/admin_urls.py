from rest_framework.routers import DefaultRouter

from .admin_views import SuperAdminUserViewSet

router = DefaultRouter()
router.register(r"users", SuperAdminUserViewSet, basename="super-admin-users")

urlpatterns = router.urls

