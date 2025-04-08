#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Módulo para o endpoint de health check da API.
"""

from fastapi import APIRouter, status
from datetime import datetime
import platform
import sys

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Realiza uma verificação básica da saúde da aplicação.
    
    Returns:
        dict: Informações sobre o status atual do serviço
    """
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": {
            "python_version": sys.version,
            "platform": platform.platform(),
        },
        "service": {
            "name": "Trading Bot Binance API",
            "version": "1.0.0"
        }
    }