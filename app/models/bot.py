"""
Modelos relacionados ao bot de trading.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from enum import Enum
from datetime import datetime


class BotStatus(str, Enum):
    """Status do bot de trading."""
    
    STOPPED = "stopped"
    RUNNING = "running"
    ERROR = "error"


class BotStrategy(str, Enum):
    """Estratégias suportadas pelo bot."""
    
    SIMPLE = "simple"  # Estratégia simples de compra e venda
    GRID = "grid"      # Estratégia de grid trading


class BotConfig(BaseModel):
    """Configuração para o bot de trading."""
    
    symbol: str = Field(..., description="Par de trading (ex: BTCUSDT)")
    interval_seconds: int = Field(60, description="Intervalo entre operações (segundos)")
    max_amount: float = Field(..., description="Valor máximo para operações")
    wallet_id: str = Field(..., description="ID da carteira a ser usada")
    strategy: BotStrategy = Field(BotStrategy.SIMPLE, description="Estratégia de trading")
    
    # Parâmetros específicos para estratégias
    buy_threshold: Optional[float] = Field(None, description="Limiar percentual para compra")
    sell_threshold: Optional[float] = Field(None, description="Limiar percentual para venda")
    
    @validator('symbol')
    def symbol_must_be_uppercase(cls, v):
        return v.upper()
    
    @validator('interval_seconds')
    def interval_must_be_positive(cls, v):
        if v < 5:
            raise ValueError("O intervalo deve ser de pelo menos 5 segundos")
        return v
    
    @validator('max_amount')
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("O valor máximo deve ser maior que zero")
        return v


class BotStatusResponse(BaseModel):
    """Resposta com o status atual do bot."""
    
    status: BotStatus = Field(..., description="Status atual do bot")
    symbol: Optional[str] = Field(None, description="Par de trading")
    wallet_id: Optional[str] = Field(None, description="ID da carteira")
    start_time: Optional[str] = Field(None, description="Horário de início")
    last_operation: Optional[str] = Field(None, description="Última operação realizada")
    error_message: Optional[str] = Field(None, description="Mensagem de erro (se houver)")
    config: Optional[BotConfig] = Field(None, description="Configuração atual do bot")
    timestamp: str = Field(..., description="Timestamp da consulta")