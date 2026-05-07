from __future__ import annotations

import base64
import hashlib
import hmac
import secrets


_PBKDF2_ITERATIONS = 480_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        _PBKDF2_ITERATIONS,
    )
    salt_text = base64.urlsafe_b64encode(salt).decode("ascii").rstrip("=")
    digest_text = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return "$".join(["pbkdf2_sha256", str(_PBKDF2_ITERATIONS), salt_text, digest_text])


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    try:
        iterations = int(iterations_text)
    except ValueError:
        return False

    salt = base64.urlsafe_b64decode(_pad_base64(salt_text))
    expected_digest = base64.urlsafe_b64decode(_pad_base64(digest_text))
    actual_digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual_digest, expected_digest)


def issue_token() -> str:
    return secrets.token_urlsafe(32)


def _pad_base64(value: str) -> str:
    return value + ("=" * (-len(value) % 4))
