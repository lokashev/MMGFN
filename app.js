const SUPABASE_URL = 'https://cqyziulpcsywkgrttzey.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eV00TOezDmw9P8k5-Pf0XQ_jlrmyYwk';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentEmpId = null;

// === АВТОРИЗАЦИЯ ===
async function login() {
    const id = document.getElementById('emp-id-input').value;
    if (id.length !== 8) return alert('Табельный номер должен состоять из 8 цифр!');
    
    // Заглушка: 99999999 - Админ. Любые другие 8 цифр - Сотрудник.
    if (id === '99999999') {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('admin-screen').classList.add('active');
        loadPlans(); loadTasks(); loadWeeklyStats();
    } else {
        currentEmpId = id;
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('employee-screen').classList.add('active');
        document.getElementById('emp-welcome').innerText = `Вы вошли как: Сотрудник #${id}`;
        loadEmployeeDashboard();
        loadEmployeeTasks();
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    if (tabName === 'stats') loadWeeklyStats();
}

// === СОТРУДНИК: Дашборд План/Факт ===
async function loadEmployeeDashboard() {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Находим активный план на сегодня
    const { data: plans } = await db.from('plans').select('*').lte('start_date', today).gte('end_date', today);
    if (!plans || plans.length === 0) {
        document.getElementById('emp-dashboard').innerHTML = '<p>План на сегодня не задан.</p>';
        return;
    }
    const plan = plans[0];

    // 2. Считаем фактические продажи сотрудника за период плана
    const { data: sales } = await db.from('daily_sales').select('*').gte('created_at', plan.start_date).lte('created_at', plan.end_date + ' 23:59:59').eq('employee_id', currentEmpId);
    
    // Суммируем факт
    const fact = { sim: 0, abon: 0, tovar: 0, aks: 0, finka: 0, internet: 0, cards: 0 };
    sales.forEach(s => {
        fact.sim += s.sim; fact.abon += s.abon; fact.tovar += s.tovar;
        fact.aks += s.aks; fact.finka += s.finka; fact.internet += s.internet; fact.cards += s.cards;
    });

    // 3. Считаем Прогноз (сколько дней прошло)
    const pStart = new Date(plan.start_date);
    const pEnd = new Date(plan.end_date);
    const totalDays = (pEnd - pStart) / 86400000 + 1;
    const daysPassed = Math.max(1, Math.ceil((new Date() - pStart) / 86400000));

    // Ожидаемый план на сегодня
    const expectedToday = (field) => Math.round((plan[field] / totalDays) * daysPassed);
    // Прогноз на конец периода
    const forecast = (field) => Math.round((fact[field] / daysPassed) * totalDays);

    // 4. Рисуем таблицу
    const metrics = [
        ['СИМ', 'sim'], ['Абонементы', 'abon'], ['Интернет', 'internet'], ['Карты', 'cards'],
        ['Товарка', 'tovar'], ['Аксессуары', 'aks'], ['Финка', 'finka']
    ];
    
    let html = `<table class="dashboard-table"><tr><th>Показатель</th><th>План</th><th>Факт</th><th>%</th></tr>`;
    metrics.forEach(([name, key]) => {
        const exp = expectedToday(key);
        const fct = fact[key];
        const pct = exp > 0 ? Math.round((fct / exp) * 100) : 0;
        const cls = pct >= 100 ? 'fact-good' : 'fact-bad';
        
        html += `<tr>
            <td>${name}<br><span class="forecast">Прогноз: ${forecast(key)}</span></td>
            <td>${exp}</td>
            <td class="${cls}">${fct}</td>
            <td class="${cls}">${pct}%</td>
        </tr>`;
    });
    html += `</table>`;
    document.getElementById('emp-dashboard').innerHTML = html;
}

// === СОТРУДНИК: ВВОД ПРОДАЖ ===
async function submitSales() {
    const data = {
        employee_id: currentEmpId,
        sim: parseInt(document.getElementById('emp-sim').value) || 0,
        abon: parseInt(document.getElementById('emp-abon').value) || 0,
        internet: parseInt(document.getElementById('emp-internet').value) || 0,
        cards: parseInt(document.getElementById('emp-cards').value) || 0,
        tovar: parseInt(document.getElementById('emp-tovar').value) || 0,
        aks: parseInt(document.getElementById('emp-aks').value) || 0,
        finka: parseInt(document.getElementById('emp-finka').value) || 0
    };
    
    await db.from('daily_sales').insert([data]);
    alert('Продажи отправлены!');
    document.querySelectorAll('#employee-screen input[type=number]').forEach(i => i.value = '');
    loadEmployeeDashboard(); // Обновляем таблицу
}

// === АДМИН: СТАТИСТИКА ЗА НЕДЕЛЮ ===
async function loadWeeklyStats() {
    const { data: sales } = await db.from('daily_sales').select('*').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
    const list = document.getElementById('weekly-stats');
    
    if (!sales || sales.length === 0) {
        list.innerHTML = '<p>Продаж за неделю нет.</p>';
        return;
    }

    // Группируем по дням
    const days = {};
    sales.forEach(s => {
        const d = new Date(s.created_at).toLocaleDateString('ru-RU');
        if (!days[d]) days[d] = { sim: 0, abon: 0, tovar: 0, aks: 0, finka: 0, internet: 0, cards: 0 };
        days[d].sim += s.sim; days[d].abon += s.abon; days[d].tovar += s.tovar;
        days[d].aks += s.aks; days[d].finka += s.finka; days[d].internet += s.internet; days[d].cards += s.cards;
    });

    let html = `<table class="dashboard-table"><tr><th>Дата</th><th>СИМ</th><th>Абон</th><th>Интернет</th><th>Карты</th></tr>`;
    for (const d in days) {
        html += `<tr><td>${d}</td><td>${days[d].sim}</td><td>${days[d].abon}</td><td>${days[d].internet}</td><td>${days[d].cards}</td></tr>`;
    }
    html += `</table>`;
    list.innerHTML = html;
}

// === АДМИН: ПЛАНЫ ===
async function addPlan() {
    const start = document.getElementById('plan-start-date').value;
    const end = document.getElementById('plan-end-date').value;
    if (!start || !end) return alert('Выберите даты!');

    await db.from('plans').insert([{
        start_date: start, end_date: end,
        sim: parseInt(document.getElementById('plan-sim').value) || 0,
        abon: parseInt(document.getElementById('plan-abon').value) || 0,
        internet: parseInt(document.getElementById('plan-internet').value) || 0,
        cards: parseInt(document.getElementById('plan-cards').value) || 0,
        tovar: parseInt(document.getElementById('plan-tovar').value) || 0,
        aks: parseInt(document.getElementById('plan-aks').value) || 0,
        finka: parseInt(document.getElementById('plan-finka').value) || 0
    }]);
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
                <p>СИМ: ${plan.sim} | Абон: ${plan.abon} | Инт: ${plan.internet} | Карты: ${plan.cards}</p>
                <p>Тов: ${plan.tovar}₽ | Акс: ${plan.aks}₽ | Фин: ${plan.finka}₽</p>
            </div>
            <button class="btn-danger" onclick="deletePlan(${plan.id})">✖</button>
        `;
        list.appendChild(div);
    });
}

async function deletePlan(id) { await db.from('plans').delete().eq('id', id); loadPlans(); }

// === АДМИН: ЗАДАЧИ ===
async function addTask() {
    const name = document.getElementById('task-name').value;
    const interval = parseInt(document.getElementById('task-interval').value);
    if (!name) return alert('Введите название!');

    await db.from('tasks').insert([{ task_name: name, schedule_info: interval > 0 ? `Напоминание каждые ${interval} мин` : 'Разовая', is_active: true }]);
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
            <button class="btn-danger" onclick="deleteTask(${task.id})">✖</button>
        `;
        list.appendChild(div);
    });
}

async function deleteTask(id) { await db.from('tasks').delete().eq('id', id); loadTasks(); }
