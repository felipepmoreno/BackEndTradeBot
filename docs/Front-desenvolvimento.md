# Prompt para Desenvolvimento do Frontend MVP do Trading Bot da Binance

Desenvolva um frontend simples e funcional em React para um trading bot que se conecta a um backend .NET que interage com a Binance TestNet. O foco deve ser em criar uma única página (Single Page Application) que permita ao usuário conectar sua carteira e controlar o bot de trading de forma básica.

## Requisitos Técnicos

- React com TypeScript
- Interface simples e intuitiva
- Comunicação com a API backend
- Formulário para inserção de chaves de API
- Controles para iniciar/parar o bot
- Visualização básica de saldo e status

## PBIs para o Frontend MVP

### PBI 1: Configuração do Projeto Base
- Configure um projeto React com TypeScript usando Vite
- Implemente uma estrutura de diretórios simples
- Configure um cliente HTTP (Axios) para comunicação com o backend
- Adicione estilização básica com Tailwind CSS
- Resultado: Projeto base funcional que pode se comunicar com a API

### PBI 2: Interface de Conexão de Carteira
- Crie um formulário simples para inserção de chaves de API da Binance:
  - Campo para API Key (com máscara de segurança)
  - Campo para API Secret (com máscara de segurança)
  - Botão para conectar
- Implemente validação básica dos campos
- Adicione feedback visual para o processo de conexão (loading, sucesso, erro)
- Mostre uma mensagem de erro clara se a conexão falhar
- Resultado: Interface para conectar uma carteira Binance via API keys

### PBI 3: Visualização de Saldo
- Crie um componente para exibir o saldo atual da carteira
- Mostre os saldos dos principais pares (BTC, USDT, etc.)
- Adicione um botão para atualizar saldos manualmente
- Implemente atualização automática a cada minuto
- Resultado: Interface que mostra o saldo atual da carteira do usuário

### PBI 4: Controle do Bot
- Crie um formulário simples para configurar o bot:
  - Seletor para par de trading (ex: BTCUSDT, ETHUSDT)
  - Campo para valor máximo por operação
  - Campo para intervalo entre operações (em segundos)
- Implemente botões grandes e claros para:
  - Iniciar o bot
  - Parar o bot
- Mostre o status atual do bot (parado, rodando, erro)
- Resultado: Interface para controlar o bot de trading

### PBI 5: Visualização de Operações
- Crie uma tabela simples para mostrar as últimas operações
- Exiba informações básicas: tipo (compra/venda), valor, horário
- Adicione indicadores visuais para operações bem-sucedidas ou com erro
- Implemente paginação básica se houver muitas operações
- Resultado: Interface que mostra o histórico básico de operações

## Estrutura de Componentes Sugerida

```tsx
// Componente de Conexão de Carteira
const WalletConnect: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleConnect = async () => {
    // Lógica para conectar carteira via API
  };
  
  return (
    <div className="card">
      <h2>Conectar Carteira</h2>
      <form onSubmit={handleConnect}>
        {/* Campos de formulário */}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Conectando...' : 'Conectar'}
        </button>
      </form>
    </div>
  );
};

// Componente de Controle do Bot
const BotControl: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [maxAmount, setMaxAmount] = useState(100);
  const [interval, setInterval] = useState(60);
  const [botStatus, setBotStatus] = useState('stopped');
  
  const startBot = async () => {
    // Lógica para iniciar o bot
  };
  
  const stopBot = async () => {
    // Lógica para parar o bot
  };
  
  return (
    <div className="card">
      <h2>Controle do Bot</h2>
      <div className="status">
        Status: <span className={`status-${botStatus}`}>{botStatus}</span>
      </div>
      {/* Campos de configuração */}
      <div className="controls">
        <button onClick={startBot} disabled={botStatus === 'running'}>
          Iniciar Bot
        </button>
        <button onClick={stopBot} disabled={botStatus === 'stopped'}>
          Parar Bot
        </button>
      </div>
    </div>
  );
};
```

## Layout Sugerido

```
+------------------------------------------+
|              Trading Bot MVP             |
+------------------------------------------+
|                                          |
|  +----------------------------------+    |
|  |       Conectar Carteira          |    |
|  |                                  |    |
|  | API Key: [*****************]     |    |
|  | Secret:  [*****************]     |    |
|  |                                  |    |
|  | [Conectar]                       |    |
|  +----------------------------------+    |
|                                          |
|  +----------------------------------+    |
|  |         Saldo da Carteira        |    |
|  |                                  |    |
|  | BTC:  0.01                       |    |
|  | USDT: 1000.0                     |    |
|  |                                  |    |
|  | [Atualizar]                      |    |
|  +----------------------------------+    |
|                                          |
|  +----------------------------------+    |
|  |         Controle do Bot          |    |
|  |                                  |    |
|  | Par: [BTCUSDT ▼]                 |    |
|  | Valor máx: [100] USDT            |    |
|  | Intervalo: [60] segundos         |    |
|  |                                  |    |
|  | Status: ● Parado                 |    |
|  |                                  |    |
|  | [INICIAR BOT]  [PARAR BOT]       |    |
|  +----------------------------------+    |
|                                          |
|  +----------------------------------+    |
|  |        Últimas Operações         |    |
|  |                                  |    |
|  | Tipo | Par    | Valor  | Horário |    |
|  |------|--------|--------|---------|    |
|  | Comp | BTCUSDT| 50 USDT| 14:30   |    |
|  | Vend | BTCUSDT| 51 USDT| 14:35   |    |
|  |                                  |    |
|  +----------------------------------+    |
|                                          |
+------------------------------------------+
```

## Implementação Recomendada

1. Use React Hooks para gerenciamento de estado local
2. Mantenha o estado global simples (Context API é suficiente para MVP)
3. Use Axios para requisições HTTP
4. Implemente tratamento de erros básico
5. Adicione um indicador visual de loading para operações assíncronas
6. Use Tailwind CSS para estilização rápida

## Segurança

1. Nunca armazene chaves de API no localStorage sem criptografia
2. Implemente timeout para sessões (logout automático)
3. Valide todas as entradas do usuário
4. Implemente confirmação para operações críticas (ex: iniciar o bot)

## Referências Adicionais

- Documentação da API Binance: https://binance-docs.github.io/apidocs/spot/en/
- Documentação da TestNet: https://testnet.binance.vision/
- Guia do desenvolvedor React: https://react.dev/

Esta implementação é deliberadamente simples para atender apenas aos requisitos mínimos de uma V1 funcional, seguindo a abordagem MVP. O foco está em permitir que o usuário conecte sua carteira e controle um bot simples, sem funcionalidades avançadas ou visualizações complexas.
