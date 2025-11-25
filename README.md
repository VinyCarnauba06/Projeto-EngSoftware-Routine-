Routine+ — Frontend (Revamped)
=============================

Visão geral
-----------
Frontend moderno construído com React (Vite) e Tailwind (CDN). Autenticação usando Firebase Auth (email/password + Google). Integração com backend em /api.

Requisitos
----------
- Node.js >= 16
- Backend executando (veja pasta /backend)

Instalação e execução
---------------------
1. No diretório frontend:
   npm install
   npm run dev
2. Configure o arquivo src/firebase.js com suas credenciais do Firebase.
3. Abra o app em http://localhost:5173

Observações
-----------
- Para autenticação completa, configure o backend para verificar tokens (USE_FAKE_AUTH=false e adicione serviceAccountKey.json em backend/config).
- Perfil do usuário disponível em /profile.
