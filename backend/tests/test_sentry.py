"""Tests for Sentry error monitoring integration and privacy filtering (PRD §9)."""
from backend.main import _sentry_before_send


def test_sentry_before_send_privacy_filter():
    """Privacy filter must redact Authorization headers and cookies before sending to Sentry (PRD §9)."""
    mock_event = {
        "request": {
            "headers": {
                "authorization": "Bearer secret_token_abc_123",
                "cookie": "session=xyz_secret",
                "content-type": "application/json",
            }
        }
    }
    filtered_event = _sentry_before_send(mock_event, hint={})
    headers = filtered_event["request"]["headers"]

    assert headers["authorization"] == "[FILTERED]"
    assert headers["cookie"] == "[FILTERED]"
    assert headers["content-type"] == "application/json"


def test_sentry_before_send_no_headers():
    """Events without request or headers pass through unmodified."""
    mock_event = {"message": "Server started"}
    filtered = _sentry_before_send(mock_event, hint={})
    assert filtered == mock_event
