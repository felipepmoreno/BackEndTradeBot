"""
Modelos relacionados às operações de trading.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum
from datetime import datetime


class OrderSide(str, Enum):
    """Lado da ordem (compra ou venda)."""
    
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    """Tipo de ordem."""
    
    MARKET = "MARKET"
    LIMIT = "LIMIT"


class OrderStatus(str, Enum):
    """Status da ordem."""
    
    NEW = "NEW"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELED = "CANCELED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class OrderRequest(BaseModel):
    """Requisição para criar uma ordem."""
    
    symbol: str = Field(..., description="Símbolo de trading (ex: BTCUSDT)")
    quantity: float = Field(..., description="Quantidade a ser comprada/vendida")
    price: Optional[float] = Field(None, description="Preço para ordens limit (opcional)")
    wallet_id: str = Field(..., description="ID da carteira a ser usada")
    
    @validator('symbol')
    def symbol_must_be_uppercase(cls, v):
        return v.upper()
    
    @validator('quantity')
    def quantity_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("A quantidade deve ser maior que zero")
        return v
    
    @validator('price')
    def price_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("O preço deve ser maior que zero")
        return v


class OrderResponse(BaseModel):
    """Resposta para uma operação de ordem."""
    
    order_id: str = Field(..., description="ID da ordem")
    symbol: str = Field(..., description="Símbolo de trading")
    side: OrderSide = Field(..., description="Lado da ordem (compra ou venda)")
    type: OrderType = Field(..., description="Tipo da ordem")
    status: OrderStatus = Field(..., description="Status da ordem")
    quantity: float = Field(..., description="Quantidade")
    price: Optional[float] = Field(None, description="Preço (para ordens limit)")
    executed_quantity: float = Field(0, description="Quantidade executada")
    cumulative_quote_quantity: float = Field(0, description="Valor total executado")
    created_at: str = Field(..., description="Data/hora de criação da ordem")
    updated_at: Optional[str] = Field(None, description="Data/hora da última atualização")


class OrderList(BaseModel):
    """Lista de ordens."""
    
    orders: List[OrderResponse] = Field([], description="Lista de ordens")
    count: int = Field(..., description="Número de ordens")
    timestamp: str = Field(..., description="Timestamp da consulta")