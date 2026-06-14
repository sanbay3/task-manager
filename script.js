'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'task-manager:tasks';

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
  const CATEGORY_LABEL = { work: '仕事', personal: '個人', learning: '学習', other: 'その他' };

  // --- State ---
  let tasks = load();
  let editingId = null;
  let undoTask = null;
  let undoTimer = null;

  // --- DOM refs ---
  const form         = document.getElementById('task-form');
  const titleInput   = document.getElementById('task-title');
  const priorityInput = document.getElementById('task-priority');
  const categoryInput = document.getElementById('task-category');
  const dueInput     = document.getElementById('task-due');
  const taskList     = document.getElementById('task-list');
  const taskCount    = document.getElementById('task-count');
  const emptyMsg     = document.getElementById('empty-message');
  const undoToast     = document.getElementById('undo-toast');
  const undoBtn       = document.getElementById('undo-btn');
  const clearDoneBtn  = document.getElementById('clear-done');
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
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
    showUndo(task);
  }

  function showUndo(task) {
    if (undoTimer) clearTimeout(undoTimer);
    undoTask = task;
    undoToast.classList.remove('hidden');
    undoTimer = setTimeout(hideUndo, 4000);
  }

  function hideUndo() {
    undoTask = null;
    undoTimer = null;
    undoToast.classList.add('hidden');
  }

  function undoDelete() {
    if (!undoTask) return;
    clearTimeout(undoTimer);
    tasks.push(undoTask);
    save();
    hideUndo();
    render();
  }

  function clearDone() {
    tasks = tasks.filter(t => !t.done);
    save();
    render();
  }

  function updateTask(id, updates) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, updates);
      save();
      editingId = null;
      render();
    }
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

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.title = '編集';
    editBtn.setAttribute('aria-label', '編集');
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => {
      editingId = task.id;
      render();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.title = '削除';
    delBtn.setAttribute('aria-label', '削除');
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(checkbox);
    li.appendChild(body);
    li.appendChild(actions);

    return li;
  }

  function createEditEl(task) {
    const li = document.createElement('li');
    li.className = 'task-item editing';

    const form = document.createElement('form');
    form.className = 'edit-form';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'edit-title';
    titleInput.value = task.title;
    titleInput.required = true;

    const row = document.createElement('div');
    row.className = 'edit-row';

    const priSel = document.createElement('select');
    priSel.className = 'edit-select';
    [['high', '高'], ['medium', '中'], ['low', '低']].forEach(([v, l]) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = l;
      if (v === task.priority) opt.selected = true;
      priSel.appendChild(opt);
    });

    const catSel = document.createElement('select');
    catSel.className = 'edit-select';
    [['work', '仕事'], ['personal', '個人'], ['learning', '学習'], ['other', 'その他']].forEach(([v, l]) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = l;
      if (v === task.category) opt.selected = true;
      catSel.appendChild(opt);
    });

    const dueInput = document.createElement('input');
    dueInput.type = 'date';
    dueInput.className = 'edit-select';
    dueInput.value = task.dueDate || '';

    row.appendChild(priSel);
    row.appendChild(catSel);
    row.appendChild(dueInput);

    const btnRow = document.createElement('div');
    btnRow.className = 'edit-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn btn-primary btn-sm';
    saveBtn.textContent = '保存';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-sm';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.addEventListener('click', () => {
      editingId = null;
      render();
    });

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const title = titleInput.value.trim();
      if (!title) return;
      updateTask(task.id, {
        title,
        priority: priSel.value,
        category: catSel.value,
        dueDate: dueInput.value || null,
      });
    });

    form.appendChild(titleInput);
    form.appendChild(row);
    form.appendChild(btnRow);
    li.appendChild(form);
    return li;
  }

  function render() {
    const filtered = getFiltered();

    taskList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    filtered.forEach(t => fragment.appendChild(
      t.id === editingId ? createEditEl(t) : createTaskEl(t)
    ));
    taskList.appendChild(fragment);

    if (editingId) {
      const editTitle = taskList.querySelector('.edit-title');
      if (editTitle) editTitle.focus();
    }

    const done = tasks.filter(t => t.done).length;
    const active = tasks.length - done;
    taskCount.textContent = `未完了 ${active} / 全 ${tasks.length} 件`;
    clearDoneBtn.classList.toggle('hidden', done === 0);

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

  undoBtn.addEventListener('click', undoDelete);
  clearDoneBtn.addEventListener('click', clearDone);

  [filterStatus, filterPriority, filterCategory, sortBy].forEach(el => {
    el.addEventListener('change', render);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && editingId) {
      editingId = null;
      render();
    }
  });

  // --- Init ---
  render();
});
