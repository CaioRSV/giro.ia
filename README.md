# Giro.IA

Uma implementação de um agente de notícias acessível e facilmente personalizável.




## Run Locally

É necessário ter acesso a chaves API da OpenAI, e também criar uma instância própria de um server MCP da News API por meio do [Pipedream](https://mcp.pipedream.com/app/news_api) ou plataformas similares.

A partir disso, clone o projeto

```bash
  git clone https://github.com/CaioRSV/giro.ia.git
```

Entre no diretório
```bash
  cd my-project
```

Instale as dependências
```bash
  npm install
```

Prepare um arquivo `.env` baseado na referência abaixo.
```
OPENAI_API_KEY= # Chave API da OpenAI
PIPEDREAM_API_URL = # URL server News API MCP
PORT = # Port de hospedagem
```

E então, inicie a aplicação

```bash
  npm start
```

## Tech Stack

**Client:** React, Next.js, TailwindCSS

**Server:** Node.js (HTTP + WebSockets), Next.js Custom Server
## Authors

- [@CaioRSV](https://www.github.com/CaioRSV)