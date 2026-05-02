from __future__ import annotations


PLANS = {
    "free": {
        "max_members": 5,
        "max_projects": 3,
        "ai_enabled": False,
    },
    "pro": {
        "max_members": 50,
        "max_projects": 100,
        "ai_enabled": False,
    },
    "ai": {
        "max_members": 50,
        "max_projects": 100,
        "ai_enabled": True,
    },
}


def get_team_limits(team) -> dict:
    plan = getattr(team, "plan", None) or "free"
    limits = dict(PLANS.get(plan, PLANS["free"]))
    limits["ai_enabled"] = bool(getattr(team, "ai_enabled", False) or limits.get("ai_enabled", False))
    return limits
