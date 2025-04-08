"""
API para operações de trading.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from typing import Optional
from datetime import datetime

from app.core.trading_service import trading_service
from app.models.trading import OrderRequest, OrderResponse, OrderList
from app.models.exceptions import BinanceAPIException, NotFoundException

# Criação do router
router = APIRouter()


@router.post("/buy", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_buy_order(order: OrderRequest):
    """
    Executa uma ordem de compra.
    
    Args:
        order: Detalhes da ordem (símbolo, quantidade, etc)
    
    Returns:
        OrderResponse: Informações da ordem criada
    """
    try:
        result = trading_service.place_buy_order(
            symbol=order.symbol,
            quantity=order.quantity,
            wallet_id=order.wallet_id,
            price=order.price
        )
        return result
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao executar ordem de compra: {str(e)}"
        )


@router.post("/sell", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_sell_order(order: OrderRequest):
    """
    Executa uma ordem de venda.
    
    Args:
        order: Detalhes da ordem (símbolo, quantidade, etc)
    
    Returns:
        OrderResponse: Informações da ordem criada
    """
    try:
        result = trading_service.place_sell_order(
            symbol=order.symbol,
            quantity=order.quantity,
            wallet_id=order.wallet_id,
            price=order.price
        )
        return result
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao executar ordem de venda: {str(e)}"
        )


@router.get("/orders", response_model=OrderList)
async def get_orders(
    wallet_id: str = Query(..., description="ID da carteira"),
    symbol: Optional[str] = Query(None, description="Símbolo de trading (opcional)")
):
    """
    Lista ordens recentes.
    
    Args:
        wallet_id: ID da carteira
        symbol: Símbolo de trading para filtrar (opcional)
    
    Returns:
        OrderList: Lista de ordens
    """
    try:
        orders = trading_service.get_orders(wallet_id=wallet_id, symbol=symbol)
        return OrderList(
            orders=orders,
            count=len(orders),
            timestamp=datetime.utcnow().isoformat()
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar ordens: {str(e)}"
        )


@router.get("/order/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str = Path(..., description="ID da ordem"),
    wallet_id: str = Query(..., description="ID da carteira"),
    symbol: str = Query(..., description="Símbolo de trading")
):
    """
    Obtém detalhes de uma ordem específica.
    
    Args:
        order_id: ID da ordem
        wallet_id: ID da carteira
        symbol: Símbolo de trading
    
    Returns:
        OrderResponse: Detalhes da ordem
    """
    try:
        return trading_service.get_order(
            order_id=order_id,
            wallet_id=wallet_id,
            symbol=symbol
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter ordem: {str(e)}"
        )


@router.delete("/order/{order_id}", response_model=OrderResponse)
async def cancel_order(
    order_id: str = Path(..., description="ID da ordem"),
    wallet_id: str = Query(..., description="ID da carteira"),
    symbol: str = Query(..., description="Símbolo de trading")
):
    """
    Cancela uma ordem específica.
    
    Args:
        order_id: ID da ordem
        wallet_id: ID da carteira
        symbol: Símbolo de trading
    
    Returns:
        OrderResponse: Detalhes da ordem cancelada
    """
    try:
        return trading_service.cancel_order(
            order_id=order_id,
            wallet_id=wallet_id,
            symbol=symbol
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao cancelar ordem: {str(e)}"
        )