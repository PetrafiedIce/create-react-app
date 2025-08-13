import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'homework_tracker_v1';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toLocalInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fromLocalInputValue(value) {
  if (!value) return null;
  // Treat local time value as local, then convert to ISO string for storage
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDueDescriptor(isoString) {
  if (!isoString) return 'No due date';
  const now = new Date();
  const due = new Date(isoString);
  const diffMs = due.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  if (minutes < 60) {
    return diffMs < 0 ? `Overdue by ${minutes}m` : `Due in ${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return diffMs < 0 ? `Overdue by ${hours}h` : `Due in ${hours}h`;
  }
  const days = Math.round(hours / 24);
  return diffMs < 0 ? `Overdue by ${days}d` : `Due in ${days}d`;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

function defaultNewTask() {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return {
    id: generateId(),
    title: '',
    subject: '',
    notes: '',
    priority: 'medium',
    status: 'todo',
    dueAt: twoHoursLater.toISOString(),
    estimatedMinutes: 60,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function PriorityChip({ priority }) {
  const label = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium';
  return <span className={`chip chip-${priority}`}>{label}</span>;
}

function StatusBadge({ status }) {
  const label = status === 'todo' ? 'To do' : status === 'in_progress' ? 'In progress' : 'Done';
  return <span className={`badge status-${status}`}>{label}</span>;
}

function TaskForm({ initialTask, onSave, onCancel }) {
  const [title, setTitle] = useState(initialTask.title ?? '');
  const [subject, setSubject] = useState(initialTask.subject ?? '');
  const [notes, setNotes] = useState(initialTask.notes ?? '');
  const [priority, setPriority] = useState(initialTask.priority ?? 'medium');
  const [status, setStatus] = useState(initialTask.status ?? 'todo');
  const [dueAt, setDueAt] = useState(toLocalInputValue(initialTask.dueAt));
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialTask.estimatedMinutes ?? 60);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave({
      ...initialTask,
      title: trimmedTitle,
      subject: subject.trim(),
      notes: notes.trim(),
      priority,
      status,
      dueAt: fromLocalInputValue(dueAt),
      estimatedMinutes: Number(estimatedMinutes) || 0,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Math worksheet on fractions" required />
        </label>
        <label className="field">
          <span className="label">Subject</span>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Math" />
        </label>
        <label className="field">
          <span className="label">Due</span>
          <input className="input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </label>
        <label className="field">
          <span className="label">Priority</span>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Estimate (min)</span>
          <input className="input" type="number" min="0" step="5" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span className="label">Notes</span>
        <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details, links, or requirements" />
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn">Save task</button>
      </div>
    </form>
  );
}

export default function HomeworkApp() {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due');

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const subjects = useMemo(() => {
    const set = new Set(tasks.map(t => t.subject).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (subjectFilter !== 'all' && t.subject !== subjectFilter) return false;
      if (term) {
        const hay = `${t.title} ${t.subject} ${t.notes}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    const compare = (a, b) => {
      if (sortBy === 'due') {
        const ad = parseDate(a.dueAt) ?? new Date(8640000000000000);
        const bd = parseDate(b.dueAt) ?? new Date(8640000000000000);
        return ad.getTime() - bd.getTime();
      }
      if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
      }
      if (sortBy === 'status') {
        const order = { todo: 0, in_progress: 1, done: 2 };
        return (order[a.status] ?? 99) - (order[b.status] ?? 99);
      }
      if (sortBy === 'updated') {
        return (parseDate(b.updatedAt)?.getTime() ?? 0) - (parseDate(a.updatedAt)?.getTime() ?? 0);
      }
      return 0;
    };
    return result.sort(compare);
  }, [tasks, search, statusFilter, subjectFilter, sortBy]);

  const grouped = useMemo(() => {
    const now = new Date();
    const todayGroup = [];
    const overdueGroup = [];
    const upcomingGroup = [];
    const doneGroup = [];

    filtered.forEach((t) => {
      if (t.status === 'done') {
        doneGroup.push(t);
        return;
      }
      const due = parseDate(t.dueAt);
      if (!due) {
        upcomingGroup.push(t);
        return;
      }
      if (isSameDay(due, now)) {
        todayGroup.push(t);
        return;
      }
      if (due < now) {
        overdueGroup.push(t);
        return;
      }
      upcomingGroup.push(t);
    });

    return {
      overdue: overdueGroup,
      today: todayGroup,
      upcoming: upcomingGroup,
      done: doneGroup,
    };
  }, [filtered]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.status !== 'done' && parseDate(t.dueAt) && parseDate(t.dueAt) < new Date()).length,
      today: tasks.filter(t => t.status !== 'done' && parseDate(t.dueAt) && isSameDay(parseDate(t.dueAt), new Date())).length,
    };
  }, [tasks]);

  const beginAdd = () => {
    setEditingId(null);
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const upsertTask = (task) => {
    setTasks(prev => {
      const exists = prev.some(t => t.id === task.id);
      if (exists) return prev.map(t => (t.id === task.id ? task : t));
      return [task, ...prev];
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const removeTask = (id) => {
    if (!window.confirm('Delete this task?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleDone = (id, done) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, status: done ? 'done' : 'todo', updatedAt: new Date().toISOString() };
    }));
  };

  const setInProgress = (id) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: 'in_progress', updatedAt: new Date().toISOString() } : t)));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'homework_tasks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      // Basic validation
      const sanitized = data.map((t) => ({
        id: t.id || generateId(),
        title: String(t.title || '').slice(0, 300),
        subject: String(t.subject || ''),
        notes: String(t.notes || ''),
        priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
        status: ['todo', 'in_progress', 'done'].includes(t.status) ? t.status : 'todo',
        dueAt: t.dueAt && parseDate(t.dueAt) ? new Date(t.dueAt).toISOString() : null,
        estimatedMinutes: Number(t.estimatedMinutes) || 0,
        createdAt: t.createdAt && parseDate(t.createdAt) ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setTasks(sanitized);
    } catch (e) {
      alert('Import failed. Ensure the file is a valid tasks JSON export.');
    } finally {
      event.target.value = '';
    }
  };

  const editingTask = useMemo(() => tasks.find(t => t.id === editingId) || null, [tasks, editingId]);

  return (
    <div className="hw-app">
      <header className="hw-header">
        <div className="hw-title">Homework Tracker</div>
        <div className="hw-stats">
          <div className="stat"><span className="stat-num">{stats.overdue}</span><span className="stat-label">Overdue</span></div>
          <div className="stat"><span className="stat-num">{stats.today}</span><span className="stat-label">Due today</span></div>
          <div className="stat"><span className="stat-num">{stats.done}</span><span className="stat-label">Completed</span></div>
          <div className="stat"><span className="stat-num">{stats.total}</span><span className="stat-label">Total</span></div>
        </div>
      </header>

      <div className="toolbar">
        <div className="left">
          <button className="btn" onClick={beginAdd}>+ Add task</button>
          <label className="btn btn-ghost file-label">
            Import
            <input type="file" accept="application/json" onChange={importJson} />
          </label>
          <button className="btn btn-ghost" onClick={exportJson}>Export</button>
        </div>
        <div className="filters">
          <input className="input search" placeholder="Search title, subject, notes" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="all">All subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="due">Sort: Due</option>
            <option value="priority">Sort: Priority</option>
            <option value="status">Sort: Status</option>
            <option value="updated">Sort: Updated</option>
          </select>
        </div>
      </div>

      {(isAdding || editingTask) && (
        <div className="panel">
          <div className="panel-title">{editingTask ? 'Edit task' : 'New task'}</div>
          <TaskForm initialTask={editingTask || defaultNewTask()} onSave={upsertTask} onCancel={cancelForm} />
        </div>
      )}

      <main className="board">
        <section className="column">
          <div className="column-title">Overdue</div>
          <div className="list">
            {grouped.overdue.length === 0 && <div className="empty">You're all caught up here.</div>}
            {grouped.overdue.map(t => (
              <TaskCard key={t.id} task={t} onEdit={() => setEditingId(t.id)} onDelete={() => removeTask(t.id)} onToggleDone={(d) => toggleDone(t.id, d)} onStart={() => setInProgress(t.id)} />
            ))}
          </div>
        </section>
        <section className="column">
          <div className="column-title">Today</div>
          <div className="list">
            {grouped.today.length === 0 && <div className="empty">Nothing due today.</div>}
            {grouped.today.map(t => (
              <TaskCard key={t.id} task={t} onEdit={() => setEditingId(t.id)} onDelete={() => removeTask(t.id)} onToggleDone={(d) => toggleDone(t.id, d)} onStart={() => setInProgress(t.id)} />
            ))}
          </div>
        </section>
        <section className="column">
          <div className="column-title">Upcoming</div>
          <div className="list">
            {grouped.upcoming.length === 0 && <div className="empty">No upcoming tasks.</div>}
            {grouped.upcoming.map(t => (
              <TaskCard key={t.id} task={t} onEdit={() => setEditingId(t.id)} onDelete={() => removeTask(t.id)} onToggleDone={(d) => toggleDone(t.id, d)} onStart={() => setInProgress(t.id)} />
            ))}
          </div>
        </section>
        <section className="column">
          <div className="column-title">Completed</div>
          <div className="list">
            {grouped.done.length === 0 && <div className="empty">No completed tasks yet.</div>}
            {grouped.done.map(t => (
              <TaskCard key={t.id} task={t} onEdit={() => setEditingId(t.id)} onDelete={() => removeTask(t.id)} onToggleDone={(d) => toggleDone(t.id, d)} onStart={() => setInProgress(t.id)} />
            ))}
          </div>
        </section>
      </main>

      <footer className="hw-footer">
        <div>Pro tip: break large assignments into smaller tasks and set earlier due times.</div>
      </footer>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onToggleDone, onStart }) {
  const dueDescriptor = formatDueDescriptor(task.dueAt);
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const dueDateStr = dueDate ? dueDate.toLocaleString() : 'No date';
  const isOverdue = task.status !== 'done' && dueDate && dueDate < new Date();

  return (
    <div className={`card ${isOverdue ? 'card-overdue' : ''}`}>
      <div className="card-main">
        <div className="card-title-row">
          <input type="checkbox" className="checkbox" checked={task.status === 'done'} onChange={(e) => onToggleDone(e.target.checked)} />
          <div className="title-area">
            <div className="title">{task.title}</div>
            <div className="meta">
              {task.subject && <span className="chip chip-muted">{task.subject}</span>}
              <PriorityChip priority={task.priority} />
              <StatusBadge status={task.status} />
            </div>
          </div>
        </div>
        {task.notes && <div className="notes">{task.notes}</div>}
        <div className="due-row">
          <span className="due-label">{dueDescriptor}</span>
          <span className="due-date">{dueDateStr}</span>
        </div>
      </div>
      <div className="card-actions">
        {task.status !== 'done' && task.status !== 'in_progress' && (
          <button className="btn btn-ghost" onClick={onStart}>Start</button>
        )}
        <button className="btn btn-ghost" onClick={onEdit}>Edit</button>
        <button className="btn btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}