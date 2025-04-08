"""
Modelos relacionados à integração com a Binance.
"""

from pydantic import BaseModel, Field


class BinanceConfig(BaseModel):
    """Configuração para conexão com a Binance API."""
    
    api_key: str = Field(..., description="API Key da Binance")
    api_secret: str = Field(..., description="API Secret da Binance")
    use_testnet: bool = Field(True, description="Se deve usar o Testnet da Binance")


class OrderRequest(BaseModel):
    """Modelo para requisições de ordens."""
    
    symbol: str = Field(..., description="Par de trading (ex: BTCUSDT)")
    quantity: float = Field(..., description="Quantidade a ser comprada/vendida")


class PriceResponse(BaseModel):
    """Resposta para consulta de preço."""
    
    symbol: str = Field(..., description="Par de trading")
    price: float = Field(..., description="Preço atual")
    timestamp: str = Field(..., description="Timestamp da consulta")