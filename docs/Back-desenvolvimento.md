# Prompt para Desenvolvimento do Backend MVP do Trading Bot da Binance

Desenvolva um backend simples e funcional em C# .NET para um trading bot que se conecta à Binance TestNet, seguindo uma abordagem de MVP (Minimum Viable Product). O foco é criar uma API que permita conectar uma carteira e executar operações básicas de compra e venda através de um bot.

## Documentação da Binance

- **Documentação da API Binance (Produção)**: https://binance-docs.github.io/apidocs/spot/en/
- **Documentação da TestNet**: https://testnet.binance.vision/
- **Endpoint da TestNet**: https://testnet.binance.vision/api

## Requisitos Técnicos

- .NET 8
- Estrutura API RESTful simples
- Integração com Binance TestNet API
- Armazenamento seguro de chaves API
- Endpoints básicos para interação com o bot
- Documentação com Swagger

## PBIs para o Backend MVP

### PBI 1: Configuração do Projeto Base
- Crie uma aplicação Web API .NET 8 com estrutura simples
- Configure Swagger para documentação dos endpoints
- Implemente tratamento básico de exceções
- Adicione um endpoint de healthcheck (/health)
- Configure CORS para permitir requisições do frontend
- Resultado: Projeto base funcional com estrutura inicial

### PBI 2: Integração com Binance TestNet
- Adicione o pacote Binance.Net (https://github.com/JKorf/Binance.Net) para integração com a Binance
- Crie um serviço para gerenciar a conexão com a Binance TestNet
- Implemente um modelo seguro para armazenar chaves de API (via configuração segura ou Azure Key Vault)
- Crie um endpoint para verificar a conexão:
  - GET /api/binance/status - Verifica se a conexão com a Binance está funcionando
- Implemente um endpoint para obter preço atual:
  - GET /api/binance/price/{symbol} - Retorna o preço atual de um par (ex: BTCUSDT)
- Resultado: API capaz de se conectar e obter dados básicos da Binance TestNet

HMAC-SHA-256 Key registered for my test user 1709178272009413471
- API Key: bTF6oPaNqWSwQAKuNMWttzU6HhFe5dgfjQbIzo69842OzFoV3SBjIqmmwu1udXe3

- Secret Key: CZEVksXWaojXUMFJLNlZJhXpddoKhfj2ZwQlqhqL8Zk6Ok87nx2XT64nTH0hPd0C

### PBI 3: Gerenciamento de Carteira
- Implemente um serviço simples para gerenciar credenciais de carteira
- Crie endpoints para:
  - POST /api/wallet/connect - Conectar a uma carteira usando chaves de API da Binance
  - GET /api/wallet/balance - Obter saldo atual da carteira
- Utilize criptografia para proteger dados sensíveis em trânsito
- Valide entradas para evitar injeção de dados maliciosos
- Resultado: API capaz de conectar uma carteira e verificar saldos

### PBI 4: Operações Básicas de Trading
- Implemente um serviço para executar ordens no mercado
- Crie endpoints para:
  - POST /api/trading/buy - Executar uma ordem de compra com parâmetros simples (símbolo, quantidade)
  - POST /api/trading/sell - Executar uma ordem de venda com parâmetros simples (símbolo, quantidade)
  - GET /api/trading/orders - Listar ordens recentes
  - DELETE /api/trading/order/{id} - Cancelar uma ordem específica
- Adicione validações básicas (saldo suficiente, par de trading válido)
- Resultado: API capaz de executar operações básicas de compra e venda

### PBI 5: Controle do Bot
- Implemente uma lógica simples para o bot de trading (sem estratégias complexas na V1)
- Crie endpoints para:
  - POST /api/bot/start - Iniciar o bot com configurações básicas (par, intervalo)
  - POST /api/bot/stop - Parar o bot
  - GET /api/bot/status - Verificar o status atual do bot
- Implemente um mecanismo simples para armazenar o estado do bot (em memória para a V1)
- Resultado: API com controle básico do bot de trading

## Estrutura de Classes Sugerida

```csharp
// Modelo para configuração da Binance
public class BinanceConfig
{
    public string ApiKey { get; set; }
    public string ApiSecret { get; set; }
}

// Modelo para parâmetros de ordem
public class OrderRequest
{
    public string Symbol { get; set; }
    public decimal Quantity { get; set; }
}

// Modelo para configuração do bot
public class BotConfig
{
    public string Symbol { get; set; }
    public int IntervalSeconds { get; set; }
    public decimal MaxAmount { get; set; }
}

// Serviço de integração com a Binance
public interface IBinanceService
{
    Task<bool> TestConnection();
    Task<decimal> GetPrice(string symbol);
    Task<Dictionary<string, decimal>> GetBalances();
    Task<string> PlaceMarketBuy(string symbol, decimal quantity);
    Task<string> PlaceMarketSell(string symbol, decimal quantity);
    Task<List<OrderInfo>> GetOrders(string symbol);
    Task<bool> CancelOrder(string symbol, long orderId);
}

// Serviço de controle do bot
public interface IBotService
{
    Task Start(BotConfig config);
    Task Stop();
    BotStatus GetStatus();
}
```

## Exemplo de Resposta do Endpoint

```json
// GET /api/binance/price/BTCUSDT
{
    "symbol": "BTCUSDT",
    "price": 45678.90,
    "timestamp": "2025-04-07T14:30:15Z"
}

// GET /api/wallet/balance
{
    "balances": [
        { "asset": "BTC", "free": 0.01, "locked": 0.0 },
        { "asset": "USDT", "free": 1000.0, "locked": 0.0 }
    ],
    "timestamp": "2025-04-07T14:30:20Z"
}

// POST /api/bot/start
{
    "status": "started",
    "config": {
        "symbol": "BTCUSDT",
        "intervalSeconds": 60,
        "maxAmount": 100
    },
    "startTime": "2025-04-07T14:31:00Z"
}
```

## Implementação Recomendada

1. Use o padrão Repository para acesso a dados (mesmo que apenas em memória para a V1)
2. Implemente injeção de dependência para todos os serviços
3. Use o padrão Options para configurações da aplicação
4. Implemente logs básicos para operações críticas
5. Use DTOs para separar modelos de domínio das respostas da API
6. Adicione validação de entradas com FluentValidation

## Segurança

1. Nunca armazene chaves de API em texto plano
2. Utilize HTTPS para todas as comunicações
3. Implemente rate limiting básico para prevenir abuso
4. Valide todas as entradas de usuário
5. Implemente autenticação básica para a API (pode ser uma API key simples para a V1)

## Testes

1. Crie testes unitários para a lógica de negócios
2. Implemente testes de integração para os endpoints principais
3. Crie um ambiente de teste que não se conecte à TestNet real (mock de respostas)

Esta implementação é deliberadamente simples para atender apenas aos requisitos mínimos de uma V1 funcional, seguindo a abordagem MVP. O foco está em estabelecer a conexão com a Binance TestNet, permitir operações básicas de trading e controlar o bot de forma simples.
