from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings using Pydantic for configuration management.
    """
    # Application settings
    APP_NAME: str = "MyApp"
    APP_VERSION: str = "1.0.0"
    WS_BASE_URL: str

    class Config:
        env_file = ".env"  # Load environment variables from .env file
        env_file_encoding = 'utf-8'  # Encoding for the .env file
        case_sensitive = True  # Environment variable names are case-sensitive


settings = Settings()