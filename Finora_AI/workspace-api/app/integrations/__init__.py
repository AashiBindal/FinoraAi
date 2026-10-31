"""External API clients. Add one module per third-party service."""

from app.integrations.base import ExternalAPIClient, IntegrationError

__all__ = ["ExternalAPIClient", "IntegrationError"]
