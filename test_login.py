import requests
import json

url = "http://localhost:8000/api/auth/login/"
payload = {
    "email": "sarah@nova-agency.com",
    "password": "Demo@123"
}
headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, data=json.dumps(payload), headers=headers)
print(f"Status: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
print(f"Cookies: {response.cookies.get_dict()}")
