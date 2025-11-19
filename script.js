
const API_KEY = "SUA_API_KEY_AQUI"; 

const weatherCity = 'Maceio'; 
// ---------- Carregar clima ----------
async function loadWeather() {
    const weatherBox = document.getElementById('weather-info');
    weatherBox.textContent = 'Carregando clima...';

    if (!API_KEY || API_KEY === 'SUA_API_KEY_AQUI') {
        weatherBox.innerHTML = '<em>Coloque sua API key no arquivo script.js para carregar o clima.</em>';
        return;
    }

    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${weatherCity}&appid=${API_KEY}&units=metric&lang=pt_br`);
        if (!res.ok) throw new Error('Erro ao buscar clima');
        const data = await res.json();

        weatherBox.innerHTML = `
            <strong>${data.name}</strong><br>
            ${data.weather[0].description}<br>
            🌡️ ${data.main.temp}°C · 💨 ${data.wind.speed} m/s
        `;
    } catch (err) {
        console.error(err);
        weatherBox.innerHTML = 'Não foi possível carregar o clima.';
    }
}

loadWeather();

// ---------- Gerenciamento de tarefas ----------
let tasks = JSON.parse(localStorage.getItem('tasks_v1')) || [];

function saveTasks(){ localStorage.setItem('tasks_v1', JSON.stringify(tasks)); }

function renderTasks(){
    const list = document.getElementById('task-list');
    list.innerHTML = '';

    if (tasks.length === 0) {
        list.innerHTML = '<li style="opacity:.8">Nenhuma tarefa por enquanto.</li>';
        return;
    }

    tasks.forEach((task, index) => {
        const li = document.createElement('li');

        const dueDate = task.date ? new Date(task.date).toLocaleString() : 'Sem data';
        li.innerHTML = `
            <strong>${escapeHtml(task.title)}</strong>
            <div class="task-meta">Categoria: ${escapeHtml(task.category)} · Data: ${dueDate}</div>
            <div class="task-desc">${escapeHtml(task.description || '')}</div>
            <div class="task-actions">
                <button class="small-btn" data-action="complete" data-index="${index}">Concluir</button>
                <button class="small-btn" data-action="delete" data-index="${index}">Excluir</button>
            </div>
        `;

        list.appendChild(li);

        // Alerta climático para tarefas ao ar livre: verifica condição atual
        if (task.category === 'Ao ar livre') {
            checkWeatherAlert(task);
        }
    });
}

document.getElementById('task-form').addEventListener('submit', function(e){
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value.trim();

    if (!title) return alert('Informe um título para a tarefa.');

    const task = { title, date, category, description, createdAt: new Date().toISOString() };
    tasks.push(task);
    saveTasks();
    renderTasks();
    this.reset();
});

// Delegation for task actions
document.getElementById('task-list').addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const idx = Number(btn.getAttribute('data-index'));
    if (action === 'complete') completeTask(idx);
    if (action === 'delete') deleteTask(idx);
});

function completeTask(index){
    // aqui apenas removemos e mostramos mensagem; você pode adaptar para marcar concluído
    alert('Tarefa marcada como concluída!');
    tasks.splice(index,1);
    saveTasks();
    renderTasks();
}

function deleteTask(index){
    if (!confirm('Deseja realmente excluir esta tarefa?')) return;
    tasks.splice(index,1);
    saveTasks();
    renderTasks();
}

// ---------- Verificar alerta climático ----------
async function checkWeatherAlert(task) {
    if (!API_KEY || API_KEY === 'SUA_API_KEY_AQUI') return;
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${weatherCity}&appid=${API_KEY}&units=metric&lang=pt_br`);
        if (!res.ok) return;
        const data = await res.json();
        const main = data.weather[0].main.toLowerCase();
        // condição simplificada de chuva/temporal
        if (main.includes('rain') || main.includes('storm') || main.includes('drizzle')) {
            // notificação simples
            console.log('Alerta climático para tarefa', task.title);
            // se a data da tarefa estiver próxima, notificamos com alert (simples)
            const taskDate = task.date ? new Date(task.date) : null;
            if (!taskDate || (Math.abs(taskDate - new Date()) < 1000 * 60 * 60 * 24)) {
                alert(`⚠️ Atenção! Pode chover na hora da tarefa: "${task.title}"`);
            }
        }
    } catch(err){ console.error(err); }
}

// util
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]); }); }

// inicializa UI
renderTasks();
