# Routine+ — MVP com Alertas Climáticos

Este repositório contém um MVP do Routine+, uma aplicação frontend simples que demonstra:

- CRUD de tarefas (criar, listar, concluir, excluir)
- Organização por categorias (incluindo 'Ao ar livre')
- Armazenamento local (LocalStorage) para funcionamento offline
- Integração com OpenWeatherMap para previsão do tempo e alertas climáticos

## Estrutura de pastas
```
routine-plus/
├─ index.html
├─ style.css
├─ script.js
└─ README.md
```

## Como usar localmente (passo a passo rápido)

1. Clone o repositório ou baixe os arquivos.
2. Abra a pasta no VS Code.
3. (Opcional) Instale a extensão **Live Server** no VS Code para visualizar em `http://127.0.0.1:5500`.
4. Coloque sua API Key do OpenWeatherMap em `script.js` na variável `API_KEY`.
5. Abra `index.html` no navegador (ou use Live Server).
6. Crie tarefas, teste o comportamento e verifique os alertas para tarefas 'Ao ar livre'.

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (por exemplo: `routine-plus`).
2. No terminal, dentro da pasta do projeto:
```bash
git init
git add .
git commit -m "Initial commit - Routine+ MVP"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```
3. No GitHub, vá em *Settings → Pages* e selecione branch `main` e folder `root` (ou `gh-pages` se usar action).
4. Aguarde e acesse `https://SEU_USUARIO.github.io/SEU_REPO/`

## Observações técnicas
- A chave da API do OpenWeatherMap é necessária para carregar o clima.
- A versão atual é frontend apenas; backend real (sincronização, autenticação) pode ser adicionada mais tarde.
- Notificações e lógica de alerta são simplificadas para este MVP.
