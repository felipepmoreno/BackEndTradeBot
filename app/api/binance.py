"""
API para interação com a Binance.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Dict, Any
from datetime import datetime

from app.core.binance_client import get_binance_client, BinanceClientWrapper
from app.models.binance import BinanceConfig, PriceResponse
from app.models.exceptions import BinanceAPIException

# Criação do router
router = APIRouter()


@router.post("/test-connection", status_code=status.HTTP_200_OK)
async def test_connection(config: BinanceConfig):
    """
    Testa a conexão com a Binance usando as credenciais fornecidas.
    
    Args:
        config: Configuração da Binance (API Key, Secret)
    
    Returns:
        dict: Status da conexão e timestamp
    """
    try:
        client = get_binance_client(config.api_key, config.api_secret, config.use_testnet)
        is_connected = client.test_connection()
        return {
            "is_connected": is_connected,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao testar conexão: {str(e)}"
        )


@router.get("/status")
async def get_status(
    api_key: str = Query(None, description="API Key da Binance"),
    api_secret: str = Query(None, description="API Secret da Binance"),
    use_testnet: bool = Query(True, description="Usar TestNet da Binance")
):
    """
    Verifica o status atual da conexão com a Binance.
    
    Returns:
        dict: Status da conexão e informações do servidor
    """
    try:
        client = get_binance_client(api_key, api_secret, use_testnet)
        is_connected = client.test_connection()
        server_time = client.get_server_time() if is_connected else None
        
        return {
            "is_connected": is_connected,
            "server_time": server_time,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar status: {str(e)}"
        )


@router.get("/price/{symbol}", response_model=PriceResponse)
async def get_price(
    symbol: str,
    api_key: str = Query(..., description="API Key da Binance"),
    api_secret: str = Query(..., description="API Secret da Binance"),
    use_testnet: bool = Query(True, description="Usar TestNet da Binance")
):
    """
    Obtém o preço atual de um par de trading.
    
    Args:
        symbol: Par de trading (ex: BTCUSDT)
        api_key: API Key da Binance
        api_secret: API Secret da Binance
        use_testnet: Se deve usar o TestNet da Binance
    
    Returns:
        PriceResponse: Preço atual e informações do par
    """
    try:
        client = get_binance_client(api_key, api_secret, use_testnet)
        price = client.get_price(symbol)
        
        return PriceResponse(
            symbol=symbol,
            price=price,
            timestamp=datetime.utcnow().isoformat()
        )
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter preço: {str(e)}"
        )


@router.get("/symbols", response_model=Dict[str, Any])
async def get_symbols(
    api_key: str = Query(..., description="API Key da Binance"),
    api_secret: str = Query(..., description="API Secret da Binance"),
    use_testnet: bool = Query(True, description="Usar TestNet da Binance")
):
    """
    Obtém a lista de símbolos disponíveis para trading.
    
    Args:
        api_key: API Key da Binance
        api_secret: API Secret da Binance
        use_testnet: Se deve usar o TestNet da Binance
    
    Returns:
        dict: Lista de símbolos e metadados
    """
    try:
        client = get_binance_client(api_key, api_secret, use_testnet)
        symbols = client.get_available_symbols()
        
        return {
            "symbols": symbols,
            "count": len(symbols),
            "timestamp": datetime.utcnow().isoformat()
        }
    except BinanceAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter símbolos: {str(e)}"
        )