// Подключаем Firebase через CDN (без npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Конфиг твоего проекта
const firebaseConfig = {
  apiKey: "AIzaSyDi-5qloTkHVgsC9KQV0IDwB-a6eArPudM",
  authDomain: "calendar-4c067.firebaseapp.com",
  projectId: "calendar-4c067",
  storageBucket: "calendar-4c067.firebasestorage.app",
  messagingSenderId: "638400937966",
  appId: "1:638400937966:web:71dad012dfa707e93958ff"
};

// Инициализируем Firebase и Firestore
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Названия месяцев и дней недели
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const today = new Date();
let curYear = today.getFullYear();
let curMonth = today.getMonth();

// Локальный кэш данных чтобы не дёргать Firebase на каждый рендер
let data = {};
let selectedKey = '';

// --- Работа с Firebase ---

// Загружает все записи для текущего месяца
async function loadMonth(year, month) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const docRef = doc(db, 'calendar', key);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    // Мержим загруженные данные в локальный кэш
    Object.assign(data, snap.data());
  }
}

// Сохраняет записи одного дня в Firebase
async function saveDay(dateKey) {
  const monthKey = dateKey.slice(0, 7); // "2025-04"
  const docRef = doc(db, 'calendar', monthKey);

  // Собираем все записи текущего месяца из локального кэша
  const monthData = {};
  Object.keys(data).forEach(k => {
    if (k.startsWith(monthKey)) monthData[k] = data[k];
  });

  await setDoc(docRef, monthData);
}

// --- Отрисовка календаря ---

function renderCalendar() {
  document.getElementById('month-label').textContent = MONTHS[curMonth] + ' ' + curYear;

  const grid = document.getElementById('calendar');
  grid.innerHTML = '';

  DAYS.forEach((d, i) => {
    const label = document.createElement('div');
    label.className = 'day-label' + (i >= 5 ? ' weekend' : '');
    label.textContent = d;
    grid.appendChild(label);
    });

  let startDow = new Date(curYear, curMonth, 1).getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const prevMonthDays = new Date(curYear, curMonth, 0).getDate();

  for (let i = 0; i < startDow; i++) {
    const day = prevMonthDays - startDow + 1 + i;
    const pm = curMonth === 0 ? 11 : curMonth - 1;
    const py = curMonth === 0 ? curYear - 1 : curYear;
    grid.appendChild(makeCell(py, pm, day, true));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = makeCell(curYear, curMonth, d, false);
    const isToday = d === today.getDate() && curMonth === today.getMonth() && curYear === today.getFullYear();
    if (isToday) cell.classList.add('today');
    grid.appendChild(cell);
  }

  const total = startDow + daysInMonth;
  const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remainder; d++) {
    const nm = curMonth === 11 ? 0 : curMonth + 1;
    const ny = curMonth === 11 ? curYear + 1 : curYear;
    grid.appendChild(makeCell(ny, nm, d, true));
  }
}

function makeCell(year, month, day, otherMonth) {
  const cell = document.createElement('div');
  cell.className = 'day-cell' + (otherMonth ? ' other-month' : '');

  const num = document.createElement('div');
  num.className = 'day-num';
  num.textContent = day;
  cell.appendChild(num);

  const key = dateKey(year, month, day);
  const items = data[key] || [];
  items.slice(0, 3).forEach(item => {
    const tag = document.createElement('span');
    tag.className = 'tag ' + item.type;
    const timeStr = item.timeStart
        ? item.timeStart + (item.timeEnd ? '–' + item.timeEnd : '') + ' '
        : '';
    tag.textContent = timeStr + item.text;
    cell.appendChild(tag);
  });

  if (items.length > 3) {
    const more = document.createElement('div');
    more.style.cssText = 'font-size:10px;color:#888';
    more.textContent = `+${items.length - 3}`;
    cell.appendChild(more);
  }

  const dow = new Date(year, month, day).getDay();
    if (dow === 0 || dow === 6) cell.classList.add('weekend');

    cell.addEventListener('click', () => openModal(year, month, day));
    return cell;
}

// --- Модальное окно ---

function openModal(year, month, day) {
  selectedKey = dateKey(year, month, day);
  document.getElementById('modal-title').textContent = `${day} ${MONTHS[month]} ${year}`;
  document.getElementById('add-text').value = '';
  document.getElementById('add-time-start').value = '';
  document.getElementById('add-time-end').value = '';
  renderItems();
  document.getElementById('modal-bg').style.display = 'flex';
  document.getElementById('add-text').focus();
}

function closeModal() {
  document.getElementById('modal-bg').style.display = 'none';
  // Сбрасываем режим редактирования
  const btnAdd = document.getElementById('btn-add');
  btnAdd.textContent = 'Добавить';
  delete btnAdd.dataset.editIndex;
}

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
    const timeStr = item.timeStart
        ? item.timeStart + (item.timeEnd ? ' – ' + item.timeEnd : '') + ' '
        : '';
        text.textContent = timeStr + item.text;

        // Кнопка редактирования
    const edit = document.createElement('button');
    edit.textContent = '✎';
    edit.addEventListener('click', () => {
    // Подставляем данные записи в форму
    document.getElementById('add-type').value = item.type;
    document.getElementById('add-text').value = item.text;
    document.getElementById('add-time-start').value = item.timeStart || '';
    document.getElementById('add-time-end').value = item.timeEnd || '';

    // Меняем кнопку "Добавить" на "Сохранить"
    const btnAdd = document.getElementById('btn-add');
    btnAdd.textContent = 'Сохранить';
    btnAdd.dataset.editIndex = index; // запоминаем какую запись редактируем

    document.getElementById('add-text').focus();
    });

    // Кнопка удаления
    const del = document.createElement('button');
    del.textContent = '✕';
    del.addEventListener('click', async () => {
    data[selectedKey].splice(index, 1);
    if (data[selectedKey].length === 0) delete data[selectedKey];
    await saveDay(selectedKey);
    renderItems();
    renderCalendar();
    updateShiftCount();
    });

    row.appendChild(tag);
    row.appendChild(text);
    row.appendChild(edit);
    row.appendChild(del);
    container.appendChild(row);
  });
}

async function addItem() {
  const text = document.getElementById('add-text').value.trim();
  if (!text) return;

  const type = document.getElementById('add-type').value;
  const timeStart = document.getElementById('add-time-start').value;
  const timeEnd = document.getElementById('add-time-end').value;
  const time = timeStart;

  const btnAdd = document.getElementById('btn-add');
  const editIndex = btnAdd.dataset.editIndex;

  if (editIndex !== undefined) {
    // Режим редактирования — заменяем старую запись
    data[selectedKey][editIndex] = { type, text, timeStart, timeEnd };
    delete btnAdd.dataset.editIndex;
    btnAdd.textContent = 'Добавить';
  } else {
    // Режим добавления — добавляем новую запись
    if (!data[selectedKey]) data[selectedKey] = [];
    data[selectedKey].push({ type, text, timeStart, timeEnd });
    scheduleNotification(selectedKey, text, time);
  }

  await saveDay(selectedKey);

  document.getElementById('add-text').value = '';
  document.getElementById('add-time-start').value = '';
  document.getElementById('add-time-end').value = '';
  renderItems();
  renderCalendar();
  updateShiftCount();
}

// --- подсчет смен за месяц ---

function updateShiftCount() {
  const monthKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
  let count = 0;
  Object.keys(data).forEach(k => {
    if (k.startsWith(monthKey)) {
      const items = data[k] || [];
      count += items.filter(item => item.type === 'shift').length;
    }
  });
  document.getElementById('shift-count').textContent = count;
}

// --- Уведомления ---

function scheduleNotification(dateKey, text, time) {
  if (!time || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    doNotify(dateKey, text, time);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') doNotify(dateKey, text, time);
    });
  }
}

function doNotify(dateKey, text, time) {
  const target = new Date(dateKey + 'T' + time + ':00');
  const diff = target.getTime() - Date.now();
  if (diff > 0 && diff < 7 * 24 * 60 * 60 * 1000) {
    setTimeout(() => new Notification('Напоминание', { body: text }), diff);
  }
}

// --- Вспомогательные ---

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// --- Обработчики событий ---

document.getElementById('prev').addEventListener('click', async () => {
  curMonth--;
  if (curMonth < 0) { curMonth = 11; curYear--; }
  await loadMonth(curYear, curMonth);
  renderCalendar();
  updateShiftCount();
});

document.getElementById('next').addEventListener('click', async () => {
  curMonth++;
  if (curMonth > 11) { curMonth = 0; curYear++; }
  await loadMonth(curYear, curMonth);
  renderCalendar();
  updateShiftCount();
});

document.getElementById('btn-cancel').addEventListener('click', closeModal);
document.getElementById('btn-add').addEventListener('click', addItem);

document.getElementById('modal-bg').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

document.getElementById('add-text').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});

// --- Запуск ---
async function init() {
  await loadMonth(curYear, curMonth);
  renderCalendar();
  updateShiftCount();
}

init();