'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'task-manager:tasks';

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
  const CATEGORY_LABEL = { work: '仕事', personal: '個人', learning: '学習', other: 'その他' };

  // --- State ---
  let tasks = load();

  // --- DOM refs ---
  const form         = document.getElementById('task-form');
  const titleInput   = document.getElementById('task-title');
  const priorityInput = document.getElementById('task-priority');
  const categoryInput = document.getElementById('task-category');
  const dueInput     = document.getElementById('task-due');
  const taskList     = document.getElementById('task-list');
  const taskCount    = document.getElementById('task-count');
  const emptyMsg     = document.getElementById('empty-message');
  const filterStatus   = document.getElementById('filter-status');
  const filterPriority = document.getElementById('filter-priority');
  const filterCategory = document.getElementById('filter-category');
  const sortBy       = document.getElementById('sort-by');

  // --- Persistence ---
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // --- Task operations ---
  function addTask(title, priority, category, dueDate) {
    tasks.push({
      id: Date.now().toString(),
      title,
      priority,
      category,
      dueDate,
      done: false,
      createdAt: Date.now(),
    });
    save();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.done = !task.done;
      save();
      render();
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
  }

  // --- Filtering & sorting ---
  function getFiltered() {
    const status   = filterStatus.value;
    const priority = filterPriority.value;
    const category = filterCategory.value;
    const sort     = sortBy.value;

    let result = tasks.filter(t => {
      if (status === 'active' && t.done) return false;
      if (status === 'done'   && !t.done) return false;
      if (priority !== 'all' && t.priority !== priority) return false;
      if (category !== 'all' && t.category !== category) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sort === 'due') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sort === 'priority') {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      return a.createdAt - b.createdAt;
    });

    return result;
  }

  // --- Rendering ---
  function formatDue(dueDate) {
    if (!dueDate) return null;
    const [y, m, d] = dueDate.split('-');
    return `${y}/${m}/${d}`;
  }

  function isOverdue(dueDate) {
    if (!dueDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    return dueDate < today;
  }

  function createTaskEl(task) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const body = document.createElement('div');
    body.className = 'task-body';

    const titleEl = document.createElement('div');
    titleEl.className = 'task-title';
    titleEl.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const priBadge = document.createElement('span');
    priBadge.className = `badge priority-${task.priority}`;
    priBadge.textContent = PRIORITY_LABEL[task.priority];

    const catBadge = document.createElement('span');
    catBadge.className = 'badge category-badge';
    catBadge.textContent = CATEGORY_LABEL[task.category] || task.category;

    meta.appendChild(priBadge);
    meta.appendChild(catBadge);

    if (task.dueDate) {
      const dueBadge = document.createElement('span');
      dueBadge.className = 'badge due-badge' + (!task.done && isOverdue(task.dueDate) ? ' overdue' : '');
      dueBadge.textContent = '期限: ' + formatDue(task.dueDate);
      meta.appendChild(dueBadge);
    }

    body.appendChild(titleEl);
    body.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.title = '削除';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(delBtn);

    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(actions);

    return li;
  }

  function render() {
    const filtered = getFiltered();

    taskList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    filtered.forEach(t => fragment.appendChild(createTaskEl(t)));
    taskList.appendChild(fragment);

    const active = tasks.filter(t => !t.done).length;
    taskCount.textContent = `未完了 ${active} / 全 ${tasks.length} 件`;

    emptyMsg.classList.toggle('hidden', filtered.length > 0);
  }

  // --- Event listeners ---
  form.addEventListener('submit', e => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    addTask(title, priorityInput.value, categoryInput.value, dueInput.value || null);
    titleInput.value = '';
    dueInput.value = '';
    titleInput.focus();
  });

  [filterStatus, filterPriority, filterCategory, sortBy].forEach(el => {
    el.addEventListener('change', render);
  });

  // --- Init ---
  render();
});
