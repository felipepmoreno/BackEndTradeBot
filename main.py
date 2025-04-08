#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Módulo principal para o Backend do Trading Bot da Binance.
Contém a aplicação FastAPI e os endpoints base.
"""

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# Importação dos routers
from app.api.health import router as health_router
from app.api.binance import router as binance_router
from app.api.wallet import router as wallet_router

# Criação da aplicação FastAPI
app = FastAPI(
    title="Trading Bot Binance API",
    description="API para interação com um trading bot para a Binance TestNet",
    version="1.0.0",
)

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir qualquer origem na fase de desenvolvimento
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluindo os routers
app.include_router(health_router, prefix="/api", tags=["Health Check"])
app.include_router(binance_router, prefix="/api/binance", tags=["Binance"])
app.include_router(wallet_router, prefix="/api/wallet", tags=["Wallet"])

@app.get("/", tags=["Root"])
async def root():
    """
    Endpoint raiz da API.
    
    Returns:
        dict: Mensagem de boas-vindas e versão da API
    """
    return {
        "message": "Bem-vindo à API do Trading Bot Binance",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    # Para desenvolvimento - em produção use um servidor ASGI dedicado
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)