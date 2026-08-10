const SUPABASE_URL = 'https://cqyziulpcsywkgrttzey.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eV00TOezDmw9P8k5-Pf0XQ_jlrmyYwk';

// Переименовали supabase в db, чтобы не было конфликта
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Переключение вкладок
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
}

// === ЛОГИКА ПЛАНОВ ===
async function addPlan() {
    const start = document.getElementById('plan-start-date').value;
    const end = document.getElementById('plan-end-date').value;
    if (!start || !end) return alert('Выберите даты!');

    const planData = {
        start_date: start,
        end_date: end,
        sim: parseInt(document.getElementById('plan-sim').value) || 0,
        abon: parseInt(document.getElementById('plan-abon').value) || 0,
        tovar: parseInt(document.getElementById('plan-tovar').value) || 0,
        aks: parseInt(document.getElementById('plan-aks').value) || 0,
        finka: parseInt(document.getElementById('plan-finka').value) || 0
    };

    const { error } = await db.from('plans').insert([planData]);
    if (error) return alert('Ошибка: ' + error.message);
    
    alert('План сохранен!');
    loadPlans();
}

async function loadPlans() {
    const { data } = await db.from('plans').select('*').order('start_date', { ascending: true });
    const list = document.getElementById('plans-list');
    list.innerHTML = '';
    
    if (data.length === 0) return list.innerHTML = '<p style="color:#777; text-align:center;">Планов нет</p>';

    data.forEach(plan => {
        const sDate = new Date(plan.start_date).toLocaleDateString('ru-RU');
        const eDate = new Date(plan.end_date).toLocaleDateString('ru-RU');
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-info">
                <b>📅 ${sDate} — ${eDate}</b>
                <p>СИМ: ${plan.sim} | Абон: ${plan.abon} | Тов: ${plan.tovar}₽ | Акс: ${plan.aks}₽ | Фин: ${plan.finka}₽</p>
            </div>
            <div class="list-actions">
                <button class="btn-edit" onclick="openEditModal(${plan.id}, ${plan.sim}, ${plan.abon}, ${plan.tovar}, ${plan.aks}, ${plan.finka})">✎</button>
                <button class="btn-delete" onclick="deletePlan(${plan.id})">✖</button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function deletePlan(id) {
    await db.from('plans').delete().eq('id', id);
    loadPlans();
}

function openEditModal(id, sim, abon, tovar, aks, finka) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-sim').value = sim;
    document.getElementById('edit-abon').value = abon;
    document.getElementById('edit-tovar').value = tovar;
    document.getElementById('edit-aks').value = aks;
    document.getElementById('edit-finka').value = finka;
    document.getElementById('edit-modal').classList.add('active');
}

async function saveEdit() {
    const id = document.getElementById('edit-id').value;
    const updatedData = {
        sim: parseInt(document.getElementById('edit-sim').value) || 0,
        abon: parseInt(document.getElementById('edit-abon').value) || 0,
        tovar: parseInt(document.getElementById('edit-tovar').value) || 0,
        aks: parseInt(document.getElementById('edit-aks').value) || 0,
        finka: parseInt(document.getElementById('edit-finka').value) || 0
    };
    await db.from('plans').update(updatedData).eq('id', id);
    closeModal();
    loadPlans();
}

function closeModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

// === ЛОГИКА ЗАДАЧ ===
const BOT_TOKEN = 'ВАШ_ТОКЕН_ОТ_BOTFATHER'; // Вставьте токен бота!
const ADMIN_ID = 123456789; // Ваш Telegram ID

// Функция мгновенной отправки сообщения вам в Telegram
async function notifyAdmin(text) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${ADMIN_ID}&text=${encodeURIComponent(text)}`;
    await fetch(url);
}

async function addTask() {
    const name = document.getElementById('task-name').value;
    const chatId = document.getElementById('task-user-id').value;
    const interval = parseInt(document.getElementById('task-interval').value);
    
    if (!name || !chatId) return alert('Заполните название и ID чата!');

    const { data, error } = await db.from('tasks').insert([{ 
        task_name: name, 
        schedule_info: interval > 0 ? `Каждые ${interval} мин` : 'Разовая',
        target_chat_id: parseInt(chatId),
        interval_mins: interval,
        is_active: true
    }]).select();

    if (error) return alert('Ошибка: ' + error.message);
    
    // Отправляем уведомление админу
    await notifyAdmin(`🆕 *Новая задача создана!*\n\n📝 ${name}\n⏰ ${interval > 0 ? 'Напоминания каждые ' + interval + ' мин' : 'Без напоминаний'}\n📍 Чат: ${chatId}`);
    
    alert('Задача создана! Бот начнет работу.');
    document.getElementById('task-name').value = '';
    loadTasks();
}

async function loadTasks() {
    const { data } = await db.from('tasks').select('*').order('id', { ascending: false });
    const list = document.getElementById('tasks-list');
    list.innerHTML = '';
    
    if (data.length === 0) return list.innerHTML = '<p style="color:#777; text-align:center;">Задач нет</p>';

    data.forEach(task => {
        const status = task.is_active ? '🟢 Активна' : '✅ Выполнена';
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-info">
                <b>📝 ${task.task_name}</b>
                <p>⏰ ${task.schedule_info} | ${status} | Чат: ${task.target_chat_id}</p>
            </div>
            <div class="list-actions">
                <button class="btn-delete" onclick="deleteTask(${task.id})">✖</button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function deleteTask(id) {
    await db.from('tasks').delete().eq('id', id);
    loadTasks();
}

// Запуск при загрузке
loadPlans();
loadTasks();
