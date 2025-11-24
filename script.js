
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


// script.js - Routine+ frontend (local development)
const BASE_URL = 'http://localhost:3000';
let MOCK_ID_TOKEN = "TEST_TOKEN_XYZ_MOCK_USER_123";

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${MOCK_ID_TOKEN}`,
        'Content-Type': 'application/json'
    };
}

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
             list.innerHTML = '<li>Erro: Não autorizado. Simule o Login.</li>';
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

async function checkWeatherAlert(task) {
    try {
        const res = await fetch(`${BASE_URL}/api/weather/forecast?city=${encodeURIComponent(currentCity)}`);
        if (!res.ok) return;
        const data = await res.json();
        // OneCall-style response: check hourly[0] or daily
        const main = (data.hourly?.[0]?.weather?.[0]?.main || data.current?.weather?.[0]?.main || '').toLowerCase();
        if (main.includes('rain') || main.includes('storm') || main.includes('drizzle')) {
            const taskDate = task.date ? new Date(task.date) : null;
            if (!taskDate || (Math.abs(taskDate - new Date()) < 1000 * 60 * 60 * 24)) {
                alert(`⚠️ Atenção! Pode chover na hora da tarefa "${task.title}" em ${data.name}!`);
            }
        }
    } catch(err){ console.error(err); }
}

function escapeHtml(str){ return String(str).replace(/[&<>"']/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]); }); }

// inicializa UI
fetchAndRenderTasks();
loadWeather();



// Simulate registering an FCM token for this user (for demo/dev)
const registerTokenBtn = document.getElementById('register-token-btn');
if (registerTokenBtn) {
  registerTokenBtn.addEventListener('click', async () => {
    const fakeToken = 'fcm_mock_token_' + Math.random().toString(36).slice(2,9);
    try {
      const res = await fetch(`${BASE_URL}/api/register-token`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: fakeToken })
      });
      if (!res.ok) throw new Error('Falha ao registrar token');
      alert('Token FCM simulado registrado com sucesso (veja backend).');
    } catch (e) {
      console.error(e);
      alert('Erro ao registrar token.');
    }
  });
}
