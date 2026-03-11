from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 60 * 24 * 7  # 7 days (fine for your solo app)
    INTERNAL_JOB_TOKEN: str     # for cron -> API calls

    RESEND_API_KEY: str
    EMAIL_FROM: str
    # optional: force all emails to your address in dev
    EMAIL_TO_OVERRIDE: str | None = None

    REDIS_URL: str
    CACHE_USER_TTL: int = 600
    CACHE_LIST_TTL: int = 60
    CACHE_ANALYTICS_TTL: int = 120
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost,http://127.0.0.1"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
