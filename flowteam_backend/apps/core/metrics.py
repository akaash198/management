from __future__ import annotations

try:
    from prometheus_client import Counter, Histogram
except Exception:  # pragma: no cover
    class _NoopMetric:
        def labels(self, *args, **kwargs):
            return self

        def inc(self, *args, **kwargs):
            return None

        def observe(self, *args, **kwargs):
            return None

    def Counter(*args, **kwargs):  # type: ignore
        return _NoopMetric()

    def Histogram(*args, **kwargs):  # type: ignore
        return _NoopMetric()


http_requests_total = Counter(
    "flowteam_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

http_request_duration_seconds = Histogram(
    "flowteam_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path"],
)

ws_events_total = Counter(
    "flowteam_ws_events_total",
    "Total WebSocket events received",
    ["consumer", "event_type"],
)

outbox_events_total = Counter(
    "flowteam_outbox_events_total",
    "Outbox events processed",
    ["destination", "result"],
)
