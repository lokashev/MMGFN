const SUPABASE_URL = 'https://cqyziulpcsywkgrttzey.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eV00TOezDmw9P8k5-Pf0XQ_jlrmyYwk';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentRole = null;

// === ВХОД И ПЕРЕКЛЮЧЕНИЕ ===
function loginAs(role) {
    currentRole = role;
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById(`${role}-screen`).classList.add('active');
    
    if (role === 'admin') { loadPlans(); loadTasks(); loadSales(); }
    if (role === 'employee') { loadEmployeeTasks(); }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
}

// === СОТРУДНИК: ВВОД ПРОДАЖ ===
async function submitSales() {
    const data = {
        employee_name: "Сотрудник 1", // Пока заглушка
        sim: parseInt(document.getElementById('emp-sim').value) || 0,
        abon: parseInt(document.getElementById('emp-abon').value) || 0,
        tovar: parseInt(document.getElementById('emp-tovar').value) || 0,
        aks: parseInt(document.getElementById('emp-aks').value) || 0,
        finka: parseInt(document.getElementById('emp-finka').value) || 0
    };
    
    await db.from('daily_sales').insert([data]);
    alert('Продажи отправлены!');
    document.querySelectorAll('#employee-screen input').forEach(i => i.value = '');
}

// === СОТРУДНИК: ЗАДАЧИ ===
async function loadEmployeeTasks() {
    const { data } = await db.from('tasks').select('*').eq('is_active', true);
    const list = document.getElementById('employee-tasks');
    list.innerHTML = '';
    
    if (data.length === 0) return list.innerHTML = '<p style="color:#777; text-align:center;">Активных задач нет</p>';

    data.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.innerHTML = `
            <div class="list-info">
                <b>📝 ${task.task_name}</b>
                <p>⏰ ${task.schedule_info}</p>
            </div>
            <button class="btn-primary" style="width:auto; margin:0;" onclick="completeTask(${task.id})">Выполнить</button>
        `;
        list.appendChild(div);
    });
}

async function completeTask(id) {
    await db.from('tasks').update({ is_active: false }).eq('id', id).execute();
    alert('Задача выполнена! 🎉');
    loadEmployeeTasks();
}

// === АДМИН: ПЛАНЫ ===
async function addPlan() {
    const start = document.getElementById('plan-start-date').value;
    const end = document.getElementById('plan-end-date').value;
    if (!start || !end) return alert('Выберите даты!');

    const { error } = await db.from('plans').insert([{
        start_date: start, end_date: end,
        sim: parseInt(document.getElementById('plan-sim').value) || 0,
        abon: parseInt(document.getElementById('plan-abon').value) || 0,
        tovar: parseInt(document.getElementById('plan-tovar').value) || 0,
        aks: parseInt(document.getElementById('plan-aks').value) || 0,
        finka: parseInt(document.getElementById('plan-finka').value) || 0
    }]);
    if (error) return alert('Ошибка: ' + error.message);
    
    alert('План сохранен!');
    loadPlans();
}

async function loadPlans() {
    const { data } = await db.from('plans').select('*').order('start_date', { ascending: true });
    const list = document.getElementById('plans-list');
    list.innerHTML = '';
    if (!data || data.length === 0) return list.innerHTML = '<p style="color:#777;">Планов нет</p>';

    data.forEach(plan => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-info">
                <b>📅 ${new Date(plan.start_date).toLocaleDateString('ru-RU')} — ${new Date(plan.end_date).toLocaleDateString('ru-RU')}</b>
                <p>СИМ: ${plan.sim||0} | Абон: ${plan.abon||0} | Тов: ${plan.tovar||0}₽ | Акс: ${plan.aks||0}₽ | Фин: ${plan.finka||0}₽</p>
            </div>
            <div class="list-actions">
                <button class="btn-edit" onclick="openEditModal(${plan.id}, ${plan.sim||0}, ${plan.abon||0}, ${plan.tovar||0}, ${plan.aks||0}, ${plan.finka||0})">✎</button>
                <button class="btn-delete" onclick="deletePlan(${plan.id})">✖</button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function deletePlan(id) { await db.from('plans').delete().eq('id', id); loadPlans(); }
function openEditModal(id, sim, abon, tovar, aks, finka) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-sim').value = sim; document.getElementById('edit-abon').value = abon;
    document.getElementById('edit-tovar').value = tovar; document.getElementById('edit-aks').value = aks; document.getElementById('edit-finka').value = finka;
    document.getElementById('edit-modal').classList.add('active');
}
async function saveEdit() {
    await db.from('plans').update({
        sim: parseInt(document.getElementById('edit-sim').value)||0, abon: parseInt(document.getElementById('edit-abon').value)||0,
        tovar: parseInt(document.getElementById('edit-tovar').value)||0, aks: parseInt(document.getElementById('edit-aks').value)||0, finka: parseInt(document.getElementById('edit-finka').value)||0
    }).eq('id', document.getElementById('edit-id').value);
    closeModal(); loadPlans();
}
function closeModal() { document.getElementById('edit-modal').classList.remove('active'); }

// === АДМИН: ЗАДАЧИ ===
async function addTask() {
    const name = document.getElementById('task-name').value;
    const interval = parseInt(document.getElementById('task-interval').value);
    if (!name) return alert('Введите название!');

    await db.from('tasks').insert([{ task_name: name, schedule_info: interval > 0 ? `Напоминание каждые ${interval} мин` : 'Разовая', interval_mins: interval, is_active: true }]);
    alert('Задача создана!');
    document.getElementById('task-name').value = '';
    loadTasks();
}

async function loadTasks() {
    const { data } = await db.from('tasks').select('*').order('id', { ascending: false });
    const list = document.getElementById('tasks-list');
    list.innerHTML = '';
    if (!data || data.length === 0) return list.innerHTML = '<p style="color:#777;">Задач нет</p>';

    data.forEach(task => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-info">
                <b>📝 ${task.task_name}</b>
                <p>⏰ ${task.schedule_info} | ${task.is_active ? '🟢 Активна' : '✅ Выполнена'}</p>
            </div>
            <button class="btn-delete" onclick="deleteTask(${task.id})">✖</button>
        `;
        list.appendChild(div);
    });
}

async function deleteTask(id) { await db.from('tasks').delete().eq('id', id); loadTasks(); }

// === АДМИН: ПРОДАЖИ ===
async function loadSales() {
    const { data } = await db.from('daily_sales').select('*').order('created_at', { ascending: false }).limit(10);
    const list = document.getElementById('sales-list');
    list.innerHTML = '';
    if (!data || data.length === 0) return list.innerHTML = '<p style="color:#777;">Продаж пока нет</p>';

    data.forEach(sale => {
        const div = document.createElement('div');
        div.className = 'list-item';
        const dt = new Date(sale.created_at).toLocaleString('ru-RU');
        div.innerHTML = `
            <div class="list-info">
                <b>📊 ${sale.employee_name} - ${dt}</b>
                <p>СИМ: ${sale.sim} | Абон: ${sale.abon} | Тов: ${sale.tovar}₽ | Акс: ${sale.aks}₽ | Фин: ${sale.finka}₽</p>
            </div>
        `;
        list.appendChild(div);
    });
}
