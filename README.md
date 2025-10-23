# LLM Test Coverage Analyzer

<div align="center">

**Trabalho de Conclusão de Curso**

**Universidade Unicesumar - Maringá**

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

</div>

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Usar](#-como-usar)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Arquitetura](#-arquitetura)
- [Licença](#-licença)
- [Autor](#-autor)

---

## 🎯 Sobre o Projeto

O **LLM Test Coverage Analyzer** é um sistema inteligente que utiliza Large Language Models (LLMs) para análise automática de gaps de cobertura de testes em projetos de software. O sistema é capaz de:

- Analisar relatórios de cobertura de testes
- Identificar lacunas na cobertura
- Integrar-se com repositórios GitHub
- Gerar análises detalhadas utilizando inteligência artificial
- Fornecer insights sobre a qualidade dos testes

Este projeto foi desenvolvido como Trabalho de Conclusão de Curso (TCC) do curso de graduação da Unicesumar - Centro Universitário de Maringá.

---

## ✨ Funcionalidades

- 🔍 **Análise Automática de Cobertura**: Processa relatórios de cobertura e identifica gaps
- 🤖 **Integração com LLMs**: Utiliza modelos de linguagem avançados para análise inteligente
- 📊 **Geração de Relatórios**: Cria relatórios detalhados sobre a qualidade dos testes
- 🔗 **Integração GitHub**: Conecta-se diretamente com repositórios para análise
- 📁 **Análise Local**: Suporta análise de repositórios locais
- 💾 **Persistência de Dados**: Armazena análises e relatórios para consulta posterior

---

## 🚀 Tecnologias Utilizadas

- **[TypeScript](https://www.typescriptlang.org/)**: Linguagem de programação principal
- **[Node.js](https://nodejs.org/)**: Runtime JavaScript
- **[OpenAI API](https://openai.com/)**: Integração com modelos de linguagem
- **[Octokit](https://github.com/octokit/rest.js)**: Cliente GitHub API
- **[Axios](https://axios-http.com/)**: Cliente HTTP
- **[dotenv](https://github.com/motdotla/dotenv)**: Gerenciamento de variáveis de ambiente

---

## 📦 Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- Uma chave API da OpenAI ([obtenha aqui](https://platform.openai.com/api-keys))
- (Opcional) Token de acesso do GitHub para análise de repositórios privados

---

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/alison-luiz/llm-test-coverage-analyzer.git
cd llm-test-coverage-analyzer
```

2. Instale as dependências:

```bash
npm install
```

3. Compile o projeto TypeScript:

```bash
npm run build
```

---

## ⚙️ Configuração

1. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e adicione suas credenciais:

```env
OPENAI_API_KEY=sua_chave_api_openai
GITHUB_TOKEN=seu_token_github (opcional)
```

---

## 🎮 Como Usar

### Executar Anáise Repositório Remoto

```bash
npm start repo <usuario> <repositorio>
Exemplo: npm start repo facebook react
```

### Executar Anáise Repositórios Local

```bash
npm start local <caminho>
Exemplo: npm start local ./meu-projeto
```

### Executar Anáise Repositórios Multiplos

```bash
npm start multiple <linguagem> [minStars] [maxRepos]
Exemplo: npm start multiple JavaScript 100 3
```

## 📁 Estrutura do Projeto

```
llm-test-coverage-analyzer/
├── src/
│   ├── config/              # Configurações da aplicação
│   ├── services/            # Serviços principais
│   │   ├── AnalysisOrchestrator.ts  # Orquestrador de análises
│   │   ├── CoverageService.ts       # Serviço de cobertura
│   │   ├── GitHubService.ts         # Integração GitHub
│   │   └── LLMService.ts            # Integração LLM
│   ├── types/               # Definições de tipos TypeScript
│   ├── utils/               # Utilitários
│   │   ├── fileSystem.ts    # Operações de sistema de arquivos
│   │   └── logger.ts        # Sistema de logs
│   └── index.ts             # Ponto de entrada da aplicação
├── dist/                    # Arquivos compilados
├── data/                    # Dados temporários e relatórios
│   ├── repositories/        # Repositórios clonados
│   └── reports/             # Relatórios gerados
├── package.json             # Dependências do projeto
├── tsconfig.json            # Configuração TypeScript
└── README.md                # Este arquivo
```

---

## 🏗️ Arquitetura

O sistema é organizado em camadas:

1. **Camada de Serviços**: Contém a lógica de negócio principal

   - `AnalysisOrchestrator`: Coordena o fluxo de análise
   - `CoverageService`: Processa relatórios de cobertura
   - `GitHubService`: Gerencia interações com GitHub
   - `LLMService`: Interface com modelos de linguagem

2. **Camada de Utilitários**: Funções auxiliares e helpers

   - Sistema de arquivos
   - Logging estruturado

3. **Camada de Tipos**: Definições TypeScript para type-safety

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍🎓 Autor

**Alison Luiz da Silva**  
RA: 220332812  
UNICESUMAR - CENTRO UNIVERSITÁRIO DE MARINGÁ

Trabalho de Conclusão de Curso - 2025

---

<div align="center">

Desenvolvido com 💙 por [Alison Luiz da Silva](https://github.com/seu-usuario)

</div>
