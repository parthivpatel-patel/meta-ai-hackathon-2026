from functools import lru_cache
from typing import Literal
from pydantic import Field, HttpUrl, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FORGE_", extra="ignore", hide_input_in_errors=True)
    provider: Literal["mock", "meta"] = "mock"
    meta_endpoint: HttpUrl | None = None
    model_id: str = Field(default="mock-forge-v1", min_length=1, max_length=128)
    timeout_seconds: float = Field(default=10, gt=0, le=60)
    retry_limit: int = Field(default=1, ge=0, le=3)

    @model_validator(mode="after")
    def validate_provider(self):
        if self.provider == "meta":
            if not self.meta_endpoint or self.meta_endpoint.scheme != "https":
                raise ValueError("Meta configuration requires an HTTPS endpoint")
            if self.model_id == "mock-forge-v1":
                raise ValueError("Meta configuration requires an explicit model identifier")
        return self

@lru_cache
def get_settings() -> Settings:
    return Settings()
