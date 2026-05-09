from django.contrib.auth import get_user_model
import os

User = get_user_model()
email = os.environ.get('E2E_SUPERUSER_EMAIL', 'admin@flowteam.test')
pw = os.environ.get('E2E_SUPERUSER_PASSWORD', 'AdminPass123!')
name = os.environ.get('E2E_SUPERUSER_NAME', 'E2E Super Admin')

u = User.objects.filter(email=email).first()
created = False
if not u:
    u = User.objects.create_superuser(email=email, password=pw, full_name=name)
    created = True
else:
    u.is_staff = True
    u.is_superuser = True
    u.set_password(pw)
    u.full_name = name
    u.save()

print('E2E superuser ready:', email, 'created' if created else 'updated')
