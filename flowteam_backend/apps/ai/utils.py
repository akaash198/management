import re

def scrub_sensitive_data(text: str | None) -> str:
    """
    Scrubs sensitive data (emails, passwords, API keys/secrets) from text
    before it is sent to external LLM APIs.
    """
    if not text:
        return ""

    # 1. Scrub email addresses
    # Matches common email patterns: user@domain.com
    scrubbed = re.sub(
        r"[\w\.-]+@[\w\.-]+\.\w+",
        "[EMAIL]",
        text
    )

    # 2. Scrub passwords/tokens/keys
    # Matches assignments like: api_key = "xyz", password: '123'
    # Looks for key, token, secret, password followed by optional spaces, colon/equals, optional quotes, and a secret sequence
    scrubbed = re.sub(
        r"(?:key|token|password|secret|auth)\s*[:=]\s*[\"']?[a-zA-Z0-9_\-\.\/]{16,}[\"']?",
        r"[REDACTED_SECRET]",
        scrubbed,
        flags=re.IGNORECASE
    )

    return scrubbed
