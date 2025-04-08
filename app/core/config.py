"""
Configurações da aplicação.
"""

import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

class Settings(BaseSettings):
    """Configurações da aplicação."""
    
    # Configurações do servidor
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Trading Bot Binance API"
    
    # Configurações da Binance
    BINANCE_API_KEY: str = os.getenv("BINANCE_API_KEY", "")
    BINANCE_API_SECRET: str = os.getenv("BINANCE_API_SECRET", "")
    BINANCE_TESTNET: bool = os.getenv("BINANCE_TESTNET", "True").lower() in ("true", "1", "t")
    
    class Config:
        case_sensitive = True


# Instância das configurações
settings = Settings()