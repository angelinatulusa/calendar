// Названия месяцев и дней недели
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

// Текущий отображаемый месяц и год
const today = new Date();
let curYear = today.getFullYear();
let curMonth = today.getMonth();

// Все записи хранятся в объекте: ключ — дата "2025-04-14", значение — массив записей
let data = {};

// Ключ выбранной даты (когда открыто модальное окно)
let selectedKey = '';

// --- Загрузка и сохранение данных ---

function loadData() {
const saved = localStorage.getItem('calendar_data');
if (saved) data = JSON.parse(saved);
}

function saveData() {
localStorage.setItem('calendar_data', JSON.stringify(data));
}

// Формат ключа даты: "2025-04-14"
function dateKey(year, month, day) {
return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// --- Отрисовка календаря ---

function renderCalendar() {
document.getElementById('month-label').textContent = MONTHS[curMonth] + ' ' + curYear;

const grid = document.getElementById('calendar');
grid.innerHTML = '';

// Подписи дней недели
DAYS.forEach(d => {
const label = document.createElement('div');
label.className = 'day-label';
label.textContent = d;
grid.appendChild(label);
});

// Первый день месяца — какой день недели?
// getDay() возвращает 0=вс, поэтому приводим к пн=0
let startDow = new Date(curYear, curMonth, 1).getDay();
startDow = startDow === 0 ? 6 : startDow - 1;

const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
const prevMonthDays = new Date(curYear, curMonth, 0).getDate();

// Пустые ячейки из предыдущего месяца
for (let i = 0; i < startDow; i++) {
const day = prevMonthDays - startDow + 1 + i;
const pm = curMonth === 0 ? 11 : curMonth - 1;
const py = curMonth === 0 ? curYear - 1 : curYear;
grid.appendChild(makeCell(py, pm, day, true));
}

// Ячейки текущего месяца
for (let d = 1; d <= daysInMonth; d++) {
const cell = makeCell(curYear, curMonth, d, false);
const isToday = d === today.getDate() && curMonth === today.getMonth() && curYear === today.getFullYear();
if (isToday) cell.classList.add('today');
grid.appendChild(cell);
}

// Пустые ячейки из следующего месяца
const total = startDow + daysInMonth;
const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
for (let d = 1; d <= remainder; d++) {
const nm = curMonth === 11 ? 0 : curMonth + 1;
const ny = curMonth === 11 ? curYear + 1 : curYear;
grid.appendChild(makeCell(ny, nm, d, true));
}
}

// Создаёт одну ячейку дня
function makeCell(year, month, day, otherMonth) {
const cell = document.createElement('div');
cell.className = 'day-cell' + (otherMonth ? ' other-month' : '');

// Номер дня
const num = document.createElement('div');
num.className = 'day-num';
num.textContent = day;
cell.appendChild(num);

// Теги записей (максимум 3, остальные скрыты)
const key = dateKey(year, month, day);
const items = data[key] || [];
items.slice(0, 3).forEach(item => {
const tag = document.createElement('span');
tag.className = 'tag ' + item.type;
tag.textContent = (item.time ? item.time + ' ' : '') + item.text;
cell.appendChild(tag);
});

if (items.length > 3) {
const more = document.createElement('div');
more.style.cssText = 'font-size:10px;color:#888';
more.textContent = `+${items.length - 3}`;
cell.appendChild(more);
}

// Клик открывает модальное окно
cell.addEventListener('click', () => openModal(year, month, day));
return cell;
}

// --- Модальное окно ---

function openModal(year, month, day) {
selectedKey = dateKey(year, month, day);
document.getElementById('modal-title').textContent = `${day} ${MONTHS[month]} ${year}`;
document.getElementById('add-text').value = '';
document.getElementById('add-time').value = '';
renderItems();
document.getElementById('modal-bg').style.display = 'flex';
document.getElementById('add-text').focus();
}

function closeModal() {
document.getElementById('modal-bg').style.display = 'none';
}

// Отрисовывает список записей внутри модального окна
function renderItems() {
const container = document.getElementById('modal-items');
container.innerHTML = '';

const items = data[selectedKey] || [];

if (items.length === 0) {
container.innerHTML = '<div style="font-size:13px;color:#888;padding:4px 0">Нет записей</div>';
return;
}

items.forEach((item, index) => {
const row = document.createElement('div');
row.className = 'item-row';

const tag = document.createElement('span');
tag.className = 'tag ' + item.type;
tag.textContent = { shift: 'Смена', plan: 'План', task: 'Задача' }[item.type];

const text = document.createElement('span');
text.textContent = (item.time ? item.time + ' — ' : '') + item.text;

// Кнопка удаления
const del = document.createElement('button');
del.textContent = '✕';
del.addEventListener('click', () => {
data[selectedKey].splice(index, 1);
if (data[selectedKey].length === 0) delete data[selectedKey];
saveData();
renderItems();
renderCalendar();
});

row.appendChild(tag);
row.appendChild(text);
row.appendChild(del);
container.appendChild(row);
});
}

// Добавление новой записи
function addItem() {
const text = document.getElementById('add-text').value.trim();
if (!text) return;

const type = document.getElementById('add-type').value;
const time = document.getElementById('add-time').value;

if (!data[selectedKey]) data[selectedKey] = [];
data[selectedKey].push({ type, text, time });

saveData();
scheduleNotification(selectedKey, text, time);

document.getElementById('add-text').value = '';
document.getElementById('add-time').value = '';
renderItems();
renderCalendar();
}

// --- Уведомления ---

function scheduleNotification(dateKey, text, time) {
if (!time || !('Notification' in window)) return;

const request = () => {
if (Notification.permission === 'granted') {
doNotify(dateKey, text, time);
} else if (Notification.permission !== 'denied') {
Notification.requestPermission().then(permission => {
if (permission === 'granted') doNotify(dateKey, text, time);
});
}
};
request();
}

function doNotify(dateKey, text, time) {
const target = new Date(dateKey + 'T' + time + ':00');
const diff = target.getTime() - Date.now();

// Уведомление сработает если время в пределах 7 дней
if (diff > 0 && diff < 7 * 24 * 60 * 60 * 1000) {
setTimeout(() => {
new Notification('Напоминание', { body: text });
}, diff);
}
}

// --- Обработчики событий ---

document.getElementById('prev').addEventListener('click', () => {
curMonth--;
if (curMonth < 0) { curMonth = 11; curYear--; }
renderCalendar();
});

document.getElementById('next').addEventListener('click', () => {
curMonth++;
if (curMonth > 11) { curMonth = 0; curYear++; }
renderCalendar();
});

document.getElementById('btn-cancel').addEventListener('click', closeModal);
document.getElementById('btn-add').addEventListener('click', addItem);

// Закрытие по клику на фон
document.getElementById('modal-bg').addEventListener('click', (e) => {
if (e.target === e.currentTarget) closeModal();
});

// Enter в поле текста — добавить запись
document.getElementById('add-text').addEventListener('keydown', (e) => {
if (e.key === 'Enter') addItem();
});

// --- Запуск ---
loadData();
renderCalendar();