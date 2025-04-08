"""
Modelos relacionados à carteira.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class WalletCredentials(BaseModel):
    """Credenciais para conexão com a carteira."""
    
    api_key: str = Field(..., description="API Key da Binance")
    api_secret: str = Field(..., description="API Secret da Binance")
    use_testnet: bool = Field(True, description="Se deve usar o Testnet da Binance")


class AssetBalance(BaseModel):
    """Saldo de um ativo na carteira."""
    
    asset: str = Field(..., description="Símbolo do ativo (ex: BTC)")
    free: float = Field(..., description="Saldo disponível")
    locked: float = Field(..., description="Saldo bloqueado (em ordens)")


class WalletBalance(BaseModel):
    """Saldo da carteira."""
    
    balances: List[AssetBalance] = Field(..., description="Lista de saldos por ativo")
    timestamp: str = Field(..., description="Timestamp da consulta")


class WalletConnectionStatus(BaseModel):
    """Status da conexão com a carteira."""
    
    is_connected: bool = Field(..., description="Se a carteira está conectada")
    wallet_name: Optional[str] = Field(None, description="Nome da carteira (se disponível)")
    timestamp: str = Field(..., description="Timestamp da conexão")