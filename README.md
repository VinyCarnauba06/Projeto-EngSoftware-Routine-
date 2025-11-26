# Routine+

**Organização Pessoal e Clima em Tempo Real**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Backend: Node.js](https://img.shields.io/badge/Backend-Node.js%20%26%20Express-43853D.svg?style=flat)]()
[![Database: MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248.svg?style=flat)]()

---

## 💡 Visão Geral e Funcionalidades

O **Routine+** é um MVP Full-Stack projetado para gerenciar tarefas diárias, integrando dados climáticos para fornecer alertas inteligentes. A arquitetura está clara, separando o Backend (`api`) e o Frontend (`web`).

### Principais Características
* **CRUD de Tarefas:** Criação, listagem (apenas tarefas pendentes), conclusão e exclusão de itens.
* **Filtragem de Tarefas:** Interface com *sidebar* funcional para filtrar tarefas por categoria (Casa, Trabalho, Estudos, Ao ar livre).
* **Alertas Climáticos Inteligentes:** Verifica a previsão do tempo via OpenWeather para tarefas categorizadas como "Ao ar livre" e notifica o usuário sobre a possibilidade de chuva.
* **Persistência de Dados:** Utiliza **MongoDB** para armazenamento de tarefas e dados do usuário.
* **Arquitetura Modular:** Separação limpa entre a API e a Aplicação Web.

---

## 📂 Estrutura do Projeto

A organização do código segue o padrão de Monorepo (repositório único) com separação lógica em "aplicações" (apps):

```
routine-plus/
├── apps/
│   ├── api/               \# Backend (Node.js/Express)
│   └── web/               \# Frontend (HTML, CSS, JS)
├── .env.example           \# Modelo de Variáveis de Ambiente
└── README.md
```

## 🧑‍💻 Tecnologias

| Categoria | Tecnologia |
| :--- | :--- |
| **Backend Core** | **Node.js** e **Express** |
| **Database** | **MongoDB** (Driver Oficial) |
| **Serviços** | **node-fetch** (HTTP Client) e **dotenv** (Variáveis de Ambiente) |
| **Autenticação** | **Firebase Admin SDK** (para futura implementação real) |
| **Frontend** | HTML, CSS e JavaScript (Vanilla) |
| **Extras** | `node-cron` (para agendamento de tarefas) |

---

## ⚙️ Instalação e Setup

### 1. Pré-requisitos
* Node.js (versão 16 ou superior)
* Instância do MongoDB em funcionamento.
* Chave de API do OpenWeatherMap.

### 2. Configuração do Backend (`apps/api`)

Navegue até o diretório do backend, instale as dependências e configure as variáveis de ambiente.

```bash
cd apps/api
npm install
```

Crie um arquivo chamado **`.env`** na pasta `apps/api` e preencha-o com suas chaves, baseando-se no `apps/api/.env.example`:

```
PORT=3000
MONGO_URI=sua_uri_real_do_mongodb
OPENWEATHER_API_KEY=sua_chave_real_do_openweather
USE_FAKE_AUTH=true 
```

### 3. Execução

| Parte | Comando | Observação |
| :--- | :--- | :--- |
| **Backend** | `npm run dev` (ou `npm start`) | Inicia o servidor Express. Use `dev` para recarga automática via Nodemon. |
| **Frontend** | Abra `apps/web/index.html` | Por ser estático, basta abrir o arquivo no navegador. |

-----

## 🌐 API Reference (apps/api)

O backend é construído com Express e o driver oficial do MongoDB para fornecer endpoints CRUD e de utilidade. A autenticação é simulada (`fakeAuth`) para propósitos de MVP.

### Tarefas (CRUD)

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| **GET** | `/api/tasks` | Lista todas as tarefas **pendentes** do usuário autenticado (mock). |
| **POST** | `/api/tasks` | Cria uma nova tarefa com `title`, `date`, `category`, `description`. |
| **PATCH** | `/api/tasks/:id` | Marca a tarefa especificada como concluída (`isCompleted: true`). |
| **DELETE** | `/api/tasks/:id` | Exclui a tarefa especificada. |

### Clima (OpenWeather Integration)

| Método | Rota | Parâmetros | Descrição |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/weather` | `city` (string) | Retorna o clima atual para a cidade. |
| **GET** | `/api/weather/forecast` | `city` (string) | Retorna a previsão detalhada, usada para os alertas de chuva. |
| **POST** | `/api/register-token` | `token` (string) | Simula o registro de um token Firebase Cloud Messaging (FCM) para futura funcionalidade de notificação. |

