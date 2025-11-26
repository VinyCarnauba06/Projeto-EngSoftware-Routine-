// Theme toggle (dark / light) - persists in localStorage
const themeToggleBtn = document.getElementById('toggle-theme');
function applyTheme() {
  const t = localStorage.getItem('routine_theme') || 'light';
  if (t === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  if (themeToggleBtn) themeToggleBtn.textContent = (t === 'dark') ? 'Desativar Dark Mode' : 'Ativar Dark Mode';
}
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const current = localStorage.getItem('routine_theme') || 'light';
    localStorage.setItem('routine_theme', current === 'dark' ? 'light' : 'dark');
    applyTheme();
  });
}
applyTheme();


const weatherPopup = document.getElementById('weather-popup');
const toggleWeatherBtn = document.getElementById('toggle-weather-btn');
const closeWeatherBtn = document.getElementById('close-weather-btn');

if (toggleWeatherBtn) {
    toggleWeatherBtn.addEventListener('click', () => {
        
        weatherPopup.classList.toggle('hidden'); 
        // ✅ CORREÇÃO: Adiciona a classe no-scroll para travar o body
        document.body.classList.toggle('no-scroll');
        
        // Carrega o clima apenas se o painel estiver VISÍVEL
        if (!weatherPopup.classList.contains('hidden')) {
            loadWeather(currentCity); 
        }
    });
}

if (closeWeatherBtn) {
    closeWeatherBtn.addEventListener('click', () => {
        // Esconde o painel
        weatherPopup.classList.add('hidden'); 
        // ✅ CORREÇÃO: Remove a classe no-scroll ao fechar
        document.body.classList.remove('no-scroll');
    });
}

// Garante que o painel está escondido ao carregar a página
if (weatherPopup) {
    weatherPopup.classList.add('hidden');
}


// script.js - Routine+ frontend
const BASE_URL = 'https://routine-plus.onrender.com';
let AUTH_TOKEN = localStorage.getItem('jwt_token') || null;


function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
    };
}

// ======================================================
//  LÓGICA DE AUTENTICAÇÃO
// ======================================================

const registerView = document.getElementById('register-view');
const loginView = document.getElementById('login-view');
const mainContainer = document.querySelector('.main-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const showLoginLink = document.getElementById('show-login-link');
const showRegisterLink = document.getElementById('show-register-link');


function updateUI(isLoggedIn) {
    if (isLoggedIn) {
        registerView.classList.add('hidden');
        loginView.classList.add('hidden');
        mainContainer.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        fetchAndRenderTasks();
    } else {
        registerView.classList.remove('hidden');
        loginView.classList.add('hidden');
        mainContainer.classList.add('hidden');
        logoutBtn.classList.add('hidden');
    }
}

async function handleAuth(url, email, password) {
    try {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(`Erro de conexão com o servidor de autenticação.`); 
            console.error(`Falha na autenticação: ${data.error || res.statusText}`);
            return;
        }

        AUTH_TOKEN = data.token;
        localStorage.setItem('jwt_token', data.token);
        updateUI(true);

    } catch (err) {
        console.error(err);
        alert('Erro de conexão com o servidor de autenticação.');
    }
}

// Lógica de Navegação entre Login/Registro
if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });
}

if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.remove('hidden');
        loginView.classList.add('hidden');
    });
}

// Submissão do Login
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        handleAuth('/api/auth/login', email, password);
    });
}

// Submissão do Registro
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();
        handleAuth('/api/auth/register', email, password);
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        AUTH_TOKEN = null;
        localStorage.removeItem('jwt_token');
        updateUI(false);
        alert('Logout realizado com sucesso.');
    });
}


// Inicialização: Verifica se já existe um token
updateUI(AUTH_TOKEN !== null);


// CÓDIGO ANTERIOR ABAIXO:

const cityInput = document.getElementById('city-input');
const loadWeatherBtn = document.getElementById('load-weather-btn');

let currentCity = localStorage.getItem('routine_city') || 'Maceio';
if(cityInput) cityInput.value = currentCity;

function saveCity(city){
    currentCity = city;
    localStorage.setItem('routine_city', city);
}

if(loadWeatherBtn){
    loadWeatherBtn.addEventListener('click', () => {
        const newCity = cityInput.value.trim();
        if (newCity) {
            saveCity(newCity);
            loadWeather(newCity);
        } else {
            alert('Por favor, digite o nome de uma cidade.');
        }
    });
}

async function loadWeather(city = currentCity) {
    const weatherBox = document.getElementById('weather-info');
    weatherBox.textContent = 'Carregando clima...';

    try {
        const res = await fetch(`${BASE_URL}/api/weather?city=${encodeURIComponent(city)}`);
        if (!res.ok) throw new Error('Erro ao buscar clima no servidor.');
        const data = await res.json();
        if (city !== currentCity) { saveCity(city); cityInput.value = city; }
        weatherBox.innerHTML = `
            <strong>${data.name}</strong><br>
            ${data.weather[0].description}<br>
            🌡️ ${data.main.temp}°C · 💨 ${data.wind.speed} m/s
        `;
    } catch (err) {
        console.error(err);
        weatherBox.innerHTML = `Não foi possível carregar o clima para ${city}.`;
    }
}

// Tasks
let tasks = [];

async function fetchAndRenderTasks(){
    const list = document.getElementById('task-list');
    list.innerHTML = '<li>Carregando tarefas...</li>';
    try {
        const res = await fetch(`${BASE_URL}/api/tasks`, { headers: getAuthHeaders() });
        
        if (res.status === 401) {
             updateUI(false);
             list.innerHTML = '<li>Sessão expirada. Faça login novamente.</li>';
             return;
        }

        tasks = await res.json();
        list.innerHTML = '';
        if (tasks.length === 0) {
            list.innerHTML = '<li style="opacity:.8">Nenhuma tarefa por enquanto.</li>';
            return;
        }
        tasks.forEach((task) => {
            const li = document.createElement('li');
            const dueDate = task.date ? new Date(task.date).toLocaleString() : 'Sem data';
            li.innerHTML = `
                <strong>${escapeHtml(task.title)}</strong>
                <div class="task-meta">Categoria: ${escapeHtml(task.category)} · Data: ${dueDate}</div>
                <div class="task-desc">${escapeHtml(task.description || '')}</div>
                <div class="task-actions">
                    <button class="small-btn" data-action="complete" data-id="${task._id}">Concluir</button>
                    <button class="small-btn" data-action="delete" data-id="${task._id}">Excluir</button>
                </div>
            `;
            list.appendChild(li);
            if (task.category === 'Ao ar livre') {
                checkWeatherAlert(task);
            }
        });
    } catch(err) {
        console.error("Erro ao carregar tarefas:", err);
        list.innerHTML = '<li>Erro de conexão com o servidor de tarefas.</li>';
    }
}

document.getElementById('task-form').addEventListener('submit', async function(e){
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value.trim();
    if (!title) return alert('Informe um título para a tarefa.');
    const task = { title, date, category, description };
    try {
        const res = await fetch(`${BASE_URL}/api/tasks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(task)
        });
        if (!res.ok) throw new Error('Falha ao adicionar tarefa.');
        this.reset();
        await fetchAndRenderTasks();
    } catch (err) {
        console.error("Erro ao adicionar tarefa:", err);
        alert('Não foi possível adicionar a tarefa. Verifique o backend.');
    }
});

document.getElementById('task-list').addEventListener('click', async function(e){
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const taskId = btn.getAttribute('data-id');
    if (action === 'complete') completeTask(taskId);
    if (action === 'delete') await deleteTask(taskId);
});

async function completeTask(taskId){
    try {
        const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ isCompleted: true })
        });
        if (!res.ok) throw new Error('Falha ao completar tarefa.');
        await fetchAndRenderTasks();
    } catch (err) {
        console.error(err);
        alert('Erro ao marcar como concluída.');
    }
}

async function deleteTask(taskId){
    if (!confirm('Deseja realmente excluir esta tarefa?')) return;
    try {
        const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.status === 204) {
            await fetchAndRenderTasks();
        } else {
            throw new Error('Falha ao excluir tarefa.');
        }
    } catch (err) {
        console.error("Erro ao excluir tarefa:", err);
        alert('Não foi possível excluir a tarefa.');
    }
}

// LÓGICA DO ALERTA CLIMÁTICO REVISADA
async function checkWeatherAlert(task) {
    try {
        const res = await fetch(`${BASE_URL}/api/weather/forecast?city=${encodeURIComponent(currentCity)}`);
        if (!res.ok) throw new Error("Forecast API error");
        const data = await res.json();
        
        const now = new Date().getTime();
        const next24Hours = now + (1000 * 60 * 60 * 24);
        
        let shouldAlert = false;
        
        if (data && data.list) {
            for (const forecast of data.list) {
                const forecastTime = forecast.dt * 1000;
                
                if (forecastTime > now && forecastTime <= next24Hours) {
                     const weatherDesc = forecast.weather[0].main.toLowerCase();
                     
                     if (weatherDesc.includes('rain') || weatherDesc.includes('storm') || weatherDesc.includes('drizzle')) {
                        shouldAlert = true;
                        break;
                     }
                }
            }
        }

        if (shouldAlert) {
            alert(`⚠️ ALERTA: Pode chover ou ter tempestade/garoa em ${data.city.name} nas próximas 24 horas. Sua tarefa "${task.title}" é "Ao ar livre"!`);
        }

    } catch(err) {
        console.error("Erro ao verificar alerta climático:", err); 
    }
}

function escapeHtml(str){ return String(str).replace(/[&<>"']/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]); }); }

// inicializa UI
fetchAndRenderTasks();