
const API_BASE = '';

let accessToken = null;

let taskMonitoringIntervals = {};
let globalTasksInterval = null;

const authSection = document.getElementById('auth-section');
const mainContent = document.getElementById('main-content');
const authError = document.getElementById('auth-error');
const taskCreateError = document.getElementById('task-create-error');
const usernameDisplay = document.getElementById('username-display');
const activeTasksList = document.getElementById('active-tasks-list');
const historyList = document.getElementById('history-list');
const historySection = document.getElementById('history-section');
const toggleHistoryButton = document.getElementById('toggle-history-button');
const keyboardInputArea = document.getElementById('keyboard-input-area');
const fileInputArea = document.getElementById('file-input-area');
const taskFileInput = document.getElementById('task-file');
const matrixDataTextarea = document.getElementById('matrix-data');
const vectorDataInput = document.getElementById('vector-data');

// точка входу після завантаження сторінки
document.addEventListener('DOMContentLoaded', async () => {
    // Перевірка наявності токену в localStorage
    accessToken = localStorage.getItem('token');
    if (accessToken) {
        try {
            // Робимо запит до /auth/me, який перевірить токен.
            const response = await fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (response.ok) {
                // Якщо токен дійсний - показуємо головний екран.
                const userData = await response.json();
                showMainContent(userData.username);
            } else {
                localStorage.removeItem('token'); accessToken = null;
            }
        } catch (error) {
            console.error('Помилка перевірки токену:', error);
            localStorage.removeItem('token'); accessToken = null;
        }
    }
    setupEventListeners();
});

// обробник html подій
function setupEventListeners() {
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    document.getElementById('task-form').addEventListener('submit', handleCreateTask);
    toggleHistoryButton.addEventListener('click', toggleHistory);

    // Перемикання способу вводу
    document.querySelectorAll('input[name="input-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'keyboard') {
                keyboardInputArea.style.display = 'block';
                fileInputArea.style.display = 'none';
                matrixDataTextarea.required = true;
                vectorDataInput.required = true;
                taskFileInput.required = false;
            } else {
                keyboardInputArea.style.display = 'none';
                fileInputArea.style.display = 'block';
                matrixDataTextarea.required = false;
                vectorDataInput.required = false;
                taskFileInput.required = true;
            }
             matrixDataTextarea.value = '';
             vectorDataInput.value = '';
             taskFileInput.value = '';
             hideError(taskCreateError);
        });
    });

    taskFileInput.addEventListener('change', handleFileSelect);

    activeTasksList.addEventListener('click', (e) => {
        if (e.target.classList.contains('cancel-button')) {
            const taskId = e.target.getAttribute('data-task-id');
            handleCancelTask(taskId);
        }
    });
}
// Обробка реєстрації нового користувача.
 // Надсилає POST-запит на /auth/register.
async function handleRegister(e) {
    e.preventDefault();
    hideError(authError);
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!username || !password) {
        showError(authError, 'Будь ласка, заповніть обидва поля.');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/auth/register?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, { method: 'POST' });
        if (response.ok) {
            showError(authError, `Успішна реєстрація! Тепер увійдіть у систему.`, 'success');
            document.getElementById('register-form').reset();
        } else {
            const error = await response.json();
            showError(authError, error.detail || 'Помилка реєстрації');
        }
    } catch (error) {
        showError(authError, 'Помилка з\'єднання з сервером');
        console.error('Помилка реєстрації:', error);
    }
}
// Обробка входу користувача. // Надсилає POST-запит на /auth/login.
async function handleLogin(e) {
    e.preventDefault(); // Запобігаємо оновленню сторінки
    hideError(authError);
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!username || !password) {
        showError(authError, 'Будь ласка, заповніть обидва поля.');
        return;
    }
    try {
        const formData = new URLSearchParams(); // Використовуємо URLSearchParams для x-www-form-urlencoded
        formData.append('username', username);
        formData.append('password', password);
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        // Обробка відповіді
        if (response.ok) {
            const data = await response.json();
            // Збереження токену
            accessToken = data.access_token;
            localStorage.setItem('token', accessToken); 
            document.getElementById('login-form').reset();
            showMainContent(username);
        } else {
            const error = await response.json();
            showError(authError, error.detail || 'Невірне ім\'я користувача або пароль');
        }
    } catch (error) {
        showError(authError, 'Помилка з\'єднання з сервером');
        console.error('Помилка входу:', error);
    }
}
// Обробка виходу користувача
function handleLogout() {
    localStorage.removeItem('token');
    accessToken = null;
    stopAllMonitoring();
    activeTasksList.innerHTML = '';
    historyList.innerHTML = '';
    mainContent.style.display = 'none';
    authSection.style.display = 'block';
    historySection.style.display = 'none'; 
    toggleHistoryButton.textContent = 'Показати історію';
    hideError(authError);
    hideError(taskCreateError);
     document.getElementById('task-form').reset();
     document.querySelector('input[name="input-type"][value="keyboard"]').checked = true; 
     keyboardInputArea.style.display = 'block';
     fileInputArea.style.display = 'none';
     matrixDataTextarea.required = true;
     vectorDataInput.required = true;
     taskFileInput.required = false;
}
// Показ головного контенту після успішного входу
function showMainContent(username) {
    usernameDisplay.textContent = username;
    authSection.style.display = 'none';
    mainContent.style.display = 'block';
    historySection.style.display = 'none'; 
    toggleHistoryButton.textContent = 'Показати історію';
    loadTasks(); 

}

// Обробка завантаження файлу
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    hideError(taskCreateError);
    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target.result;
        try {
            if (!content.includes('---')) throw new Error("Файл має містити роздільник '---'");
            const parts = content.split('---');
            const matrixPart = parts[0].trim();
            const vectorPart = parts[1].trim();
            if (!matrixPart || !vectorPart) throw new Error("Матриця або вектор у файлі порожні.");
            matrixDataTextarea.value = matrixPart;
            vectorDataInput.value = vectorPart;
            showError(taskCreateError, 'Дані з файлу завантажено. Перевірте та натисніть "Відправити".', 'success');
        } catch (error) {
            showError(taskCreateError, `Помилка читання файлу: ${error.message}`);
            matrixDataTextarea.value = '';
            vectorDataInput.value = '';
            taskFileInput.value = '';
        }
    };

    reader.onerror = () => {
        showError(taskCreateError, 'Не вдалося прочитати файл.');
        taskFileInput.value = '';
    };
    reader.readAsText(file);
}

// Обробка створення задачі
async function handleCreateTask(e) {
    e.preventDefault();
    hideError(taskCreateError);
    const matrixData = matrixDataTextarea.value.trim();
    const vectorData = vectorDataInput.value.trim();
    if (!matrixData || !vectorData) {
        showError(taskCreateError, 'Будь ласка, введіть дані або завантажте коректний файл.');
        return;
    }
    const validation = validateInput(matrixData, vectorData);
    if (!validation.valid) {
        showError(taskCreateError, validation.error);
        return;
    }

    const formData = new URLSearchParams();
    formData.append('matrix_data', matrixData);
    formData.append('vector_data', vectorData);

    try {
            const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${accessToken}`,
                 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        if (response.ok) {
            if (document.querySelector('input[name="input-type"][value="keyboard"]').checked) {
                 document.getElementById('task-form').reset();
            }
             taskFileInput.value = '';
            showError(taskCreateError, 'Задачу успішно відправлено!', 'success');
            loadTasks();
        } else {
            const error = await response.json();
            showError(taskCreateError, error.detail || 'Помилка створення задачі');
        }
    } catch (error) {
        showError(taskCreateError, 'Помилка з\'єднання з сервером');
        console.error('Помилка створення задачі:', error);
    }
}

// Валідація вводу матриці та вектора
function validateInput(matrixData, vectorData) {
    const matrixRows = matrixData.split('\n').filter(row => row.trim());
    if (matrixRows.length === 0) return { valid: false, error: 'Матриця не може бути порожньою' };
    const n = matrixRows.length;

    const MAX_SIZE_FRONTEND = 12;
    if (n > MAX_SIZE_FRONTEND) return { valid: false, error: `Розмірність матриці не може перевищувати ${MAX_SIZE_FRONTEND}x${MAX_SIZE_FRONTEND}` };
    for (let i = 0; i < n; i++) {
        const row = matrixRows[i].trim().split(/\s+/);
        if (row.length !== n) return { valid: false, error: `Матриця має бути квадратною (рядок ${i + 1} містить ${row.length} ел. замість ${n})` };
        for (let j = 0; j < row.length; j++) {
            if (isNaN(parseFloat(row[j]))) return { valid: false, error: `Невірний формат числа '${row[j]}' в рядку ${i + 1}` };
        }
    }
    const vector = vectorData.trim().split(/\s+/);
    if (vector.length !== n) return { valid: false, error: `Довжина вектора (${vector.length}) має дорівнювати розмірності матриці (${n})` };
    for (let i = 0; i < vector.length; i++) {
        if (isNaN(parseFloat(vector[i]))) return { valid: false, error: `Невірний формат числа '${vector[i]}' у векторі` };
    }
    return { valid: true };
}

// Завантаження списку задач
async function loadTasks() {
    if (!accessToken) return;
    try {
        const response = await fetch(`${API_BASE}/tasks`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (response.ok) {
            // Розділення задач на активні та історичні
            const tasks = await response.json();
            const activeTasks = tasks.filter(t => ['PENDING', 'IN_PROGRESS', 'PROGRESS'].includes(t.status));
            const historyTasks = tasks.filter(t => ['DONE', 'SUCCESS', 'FAILED', 'FAILURE', 'CANCELLED', 'REVOKED'].includes(t.status));

            // Оновлення списку активних задач
            Object.keys(taskMonitoringIntervals).forEach(taskId => {
                // Зупинка моніторингу задач, які більше не активні
                if (!activeTasks.some(task => task.id === parseInt(taskId))) {
                    stopTaskMonitoring(taskId);
                }
            });
            // Очищення та відображення активних задач
            activeTasksList.innerHTML = '';
            activeTasks.forEach(task => {
                displayActiveTask(task);
                startTaskMonitoring(task.id);
            });
             if (activeTasks.length === 0) {
                 activeTasksList.innerHTML = '<li style="list-style: none; color: #888;">Немає активних задач</li>';
             }
            // Оновлення історії, якщо вона відкрита
            if (historySection.style.display === 'block') {
                displayHistory(historyTasks);
            }
        } else if (response.status === 401) { handleLogout(); }
    } catch (error) { console.error('Помилка завантаження задач:', error); }
}

// Відображення активної задачі
function displayActiveTask(task) {
    const li = document.createElement('li');
    li.id = `task-${task.id}`;
    let progress = 0; 
    // Визначення прогресу
    const statusText = task.status === 'PENDING' ? 'Очікує' : (task.status === 'PROGRESS' || task.status === 'IN_PROGRESS' ? 'Виконується' : task.status);
    li.innerHTML = `
        Задача #${task.id} (${task.n}x${task.n}) - Статус: ${statusText} (<span class="progress-value">${progress}</span>%)
        <button class="cancel-button" data-task-id="${task.id}">Скасувати</button>
    `;
    activeTasksList.appendChild(li);
}

// Відображення всієї історії
function displayHistory(historyTasks) {
     historyList.innerHTML = '';
     if (historyTasks.length === 0) {
         historyList.innerHTML = '<li style="list-style: none; color: #888;">Історія порожня</li>';
     } else {
         historyTasks.forEach(task => {
             displayHistoryTask(task);
         });
     }
}

// Відображення одного елемента історії
function displayHistoryTask(task) {
    const li = document.createElement('li');
    li.style.flexDirection = 'column';
    li.style.alignItems = 'flex-start';
    let statusText = '';
    let resultHTML = '';
    let executionTime = 'N/A';
    if (task.created_at && task.completed_at) {
        const start = new Date(task.created_at);
        const end = new Date(task.completed_at);
        if (!isNaN(start) && !isNaN(end)) {
            const diffSeconds = ((end - start) / 1000).toFixed(2);
            executionTime = `${Math.max(0.01, diffSeconds)} сек`;
        }
    }

    if (task.status === 'DONE' || task.status === 'SUCCESS') {
        statusText = 'Виконано';
        try {
            const resultData = JSON.parse(task.result);
            if(Array.isArray(resultData)) { 
                 resultHTML = resultData.map((val, index) => `x<sub>${index + 1}</sub> = ${Number(val).toFixed(4)}`).join('<br>');
            } else { 
                 resultHTML = `<pre>${task.result || 'N/A'}</pre>`;
            }
        } catch (e) { resultHTML = `<pre>${task.result || 'N/A'}</pre>`; }
    } else if (task.status === 'FAILED' || task.status === 'FAILURE') {
        statusText = 'Помилка';
        try {
            const errorData = JSON.parse(task.result);
            resultHTML = `<span class="error-text">Повідомлення: ${errorData.error || task.result || 'Невідома помилка'}</span>`;
        } catch (e) { resultHTML = `<span class="error-text">Повідомлення: ${task.result || 'Невідома помилка'}</span>`; }
    } else if (task.status === 'CANCELLED' || task.status === 'REVOKED') {
        statusText = 'Скасовано';
        resultHTML = '-';
    } else {
        statusText = task.status;
        resultHTML = '-';
    }

    // Форматуємо дату створення
    const createdAtFormatted = task.created_at ? new Date(task.created_at).toLocaleString() : 'N/A';

    li.innerHTML = `
        <div style="width: 100%; display: flex; justify-content: space-between;">
             <strong>Задача #${task.id} (${task.n}x${task.n})</strong>
             <small>Створено: ${createdAtFormatted}</small>
        </div>
        <div>Статус: ${statusText}</div>
        <div><strong>Вхідні дані:</strong><pre style="white-space: pre-wrap; word-wrap: break-word;">${task.matrix_data || ''}\n---\n${task.vector_b || ''}</pre></div>
        <div><strong>Результат:</strong><div style="margin-top: 5px;">${resultHTML}</div></div>
        <div><strong>Час виконання:</strong> ${executionTime}</div>
    `;
    historyList.appendChild(li);
}
// Запуск моніторингу конкретної задачі
function startTaskMonitoring(taskId) {
    if (taskMonitoringIntervals[taskId]) return; // Вже моніториться

    
    updateTaskStatus(taskId); 
    // Запуск інтервалу оновлення статусу
    taskMonitoringIntervals[taskId] = setInterval(() => {
        updateTaskStatus(taskId);
    }, 2000);// Кожні 2 секунди
    console.log(`Started monitoring task ${taskId}`);
}
// Оновлення статусу задачі
async function updateTaskStatus(taskId) {
    if (!accessToken) { stopTaskMonitoring(taskId); return; } 
    try {
        // Запит статусу задачі
        const response = await fetch(`${API_BASE}/tasks/${taskId}/status`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (response.ok) {
            const taskStatus = await response.json();
            const taskElement = document.getElementById(`task-${taskId}`);
            if (!taskElement) { stopTaskMonitoring(taskId); return; }

             const isActive = ['PENDING', 'IN_PROGRESS', 'PROGRESS'].includes(taskStatus.status);

            if (isActive) {
                const progress = taskStatus.progress || 0;
                const statusText = taskStatus.status === 'PENDING' ? 'Очікує' : 'Виконується';

                const statusSpan = taskElement.childNodes[1]; 
                 const progressSpan = taskElement.querySelector('.progress-value');
                 if(statusSpan) statusSpan.textContent = ` - Статус: ${statusText} (`;
                 if(progressSpan) progressSpan.textContent = progress;

            } else {
                console.log(`Task ${taskId} finished with status: ${taskStatus.status}`);
                stopTaskMonitoring(taskId);
                loadTasks(); 
            }
        } else if (response.status === 401) { handleLogout(); } 
        else if (response.status === 404) { 
            console.warn(`Задача ${taskId} не знайдена при оновленні статусу.`);
            stopTaskMonitoring(taskId);
            loadTasks();
        } else {
             console.error(`Помилка ${response.status} при оновленні статусу задачі ${taskId}`);
             
        }
    } catch (error) {
        console.error(`Помилка з'єднання при оновленні статусу задачі ${taskId}:`, error);
        
    }
}

// Зупинка моніторингу конкретної задачі
function stopTaskMonitoring(taskId) {
    if (taskMonitoringIntervals[taskId]) {
        clearInterval(taskMonitoringIntervals[taskId]);
        delete taskMonitoringIntervals[taskId];
        console.log(`Stopped monitoring task ${taskId}`);
    }
}

// Зупинка всього моніторингу
function stopAllMonitoring() {
    if (globalTasksInterval) {
        clearInterval(globalTasksInterval);
        globalTasksInterval = null;
        console.log('Stopped global task list refresh.');
    }
    Object.keys(taskMonitoringIntervals).forEach(taskId => {
        stopTaskMonitoring(taskId);
    });
     console.log('Stopped all individual task monitoring.');
}

// Обробка скасування задачі
async function handleCancelTask(taskId) {
    if (!accessToken) return;
    if (!confirm(`Ви впевнені, що хочете скасувати задачу #${taskId}?`)) return;
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            stopTaskMonitoring(taskId);
            loadTasks(); 
        } else {
            const error = await response.json();
            alert(`Помилка скасування: ${error.detail || 'Невідома помилка'}`);
             if (response.status === 400) {
                 loadTasks();
             }
        }
    } catch (error) {
        alert('Помилка з\'єднання з сервером');
        console.error('Помилка скасування задачі:', error);
    }
}

// Допоміжні функції для відображення помилок/успіху
function showError(element, message, type = 'error') {
    element.textContent = message;
    element.style.display = 'block';
    element.className = type === 'success' ? 'success-message' : 'error-message';

}

function hideError(element) {
    if(element) {
        element.style.display = 'none';
        element.textContent = '';
        element.className = 'error-message';
    }
}

// Перемикання видимості історії
async function toggleHistory() {
    if (historySection.style.display === 'none') {
        historySection.style.display = 'block';
        toggleHistoryButton.textContent = 'Приховати історію';
         if (accessToken) {
             try {
                 const response = await fetch(`${API_BASE}/tasks`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
                 if (response.ok) {
                     const tasks = await response.json();
                     const historyTasks = tasks.filter(t => ['DONE', 'SUCCESS', 'FAILED', 'FAILURE', 'CANCELLED', 'REVOKED'].includes(t.status));
                     displayHistory(historyTasks);
                 } else if (response.status === 401) { handleLogout(); }
             } catch (error) { console.error('Помилка завантаження історії:', error); }
         }
    } else {
        historySection.style.display = 'none';
        toggleHistoryButton.textContent = 'Показати історію';
    }
}