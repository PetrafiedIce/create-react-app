import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'homework_tracker_v1';
const SETTINGS_KEY = 'homework_settings_v1';
const IN_PROGRESS_ID_KEY = 'homework_current_task_id';
const NOTES_KEY = 'homework_notes_v1';
const NOTES_CANVAS_KEY_PREFIX = 'homework_note_canvas_';

// Supabase client (URL from env; will fallback to local only if not set)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = (SUPABASE_URL && SUPABASE_ANON) ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

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

function getTaskStorageKey(userId) {
  return userId ? `${STORAGE_KEY}__${userId}` : STORAGE_KEY;
}

function loadTasks(key = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveTasks(tasks, key = STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(tasks));
  } catch {}
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

function loadNotes() {
  try { const raw = localStorage.getItem(NOTES_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveNotes(notes) { try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch {} }

function loadCanvas(noteId) {
  try { const raw = localStorage.getItem(NOTES_CANVAS_KEY_PREFIX + noteId); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveCanvas(noteId, items) { try { localStorage.setItem(NOTES_CANVAS_KEY_PREFIX + noteId, JSON.stringify(items)); } catch {} }

function defaultNewTask(overrideDueAtISO = null) {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return {
    id: generateId(),
    title: '',
    subject: '',
    notes: '',
    priority: 'medium',
    status: 'todo',
    dueAt: overrideDueAtISO || twoHoursLater.toISOString(),
    estimatedMinutes: 60,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    subtasks: [],
    repeat: 'none',
    reminderMinutesBefore: 0,
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

function InlineDatePicker({ valueISO, onChange }) {
  const [viewDate, setViewDate] = useState(() => valueISO ? new Date(valueISO) : new Date());
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0);
  const startOfGrid = (d) => { const s = startOfMonth(d); const wd = s.getDay(); return new Date(s.getFullYear(), s.getMonth(), s.getDate() - wd); };
  const days = []; {
    const gridStart = startOfGrid(viewDate);
    for (let i = 0; i < 42; i++) { const dt = new Date(gridStart); dt.setDate(gridStart.getDate() + i); days.push(dt); }
  }
  const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const selected = valueISO ? new Date(valueISO) : null;
  return (
    <div className="date-picker">
      <div className="date-picker-header">
        <button type="button" className="btn btn-ghost" onClick={()=>setViewDate(d=>new Date(d.getFullYear(), d.getMonth()-1, 1))}>Prev</button>
        <div className="chip">{viewDate.toLocaleString(undefined, { month:'long', year:'numeric' })}</div>
        <button type="button" className="btn btn-ghost" onClick={()=>setViewDate(d=>new Date(d.getFullYear(), d.getMonth()+1, 1))}>Next</button>
      </div>
      <div className="weekday-grid" style={{ margin: 0 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="weekday">{d}</div>)}
      </div>
      <div className="date-picker-grid">
        {days.map((dt, idx) => {
          const muted = dt.getMonth() !== viewDate.getMonth();
          const isSel = selected && sameDay(dt, selected);
          return <button type="button" key={idx} className={`date-cell ${muted?'muted':''} ${isSel?'selected':''}`} onClick={()=>onChange(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), selected?.getHours()||17, selected?.getMinutes()||0).toISOString())}>{dt.getDate()}</button>;
        })}
      </div>
    </div>
  );
}

function AssignmentForm({ initialTask, onSave, onCancel, subjectsList = [] }) {
  const [title, setTitle] = useState(initialTask.title ?? '');
  const [subject, setSubject] = useState(initialTask.subject ?? '');
  const [notes, setNotes] = useState(initialTask.notes ?? '');
  const [priority, setPriority] = useState(initialTask.priority ?? 'medium');
  const [dueAtISO, setDueAtISO] = useState(initialTask.dueAt ?? null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialTask.estimatedMinutes ?? 60);
  const [repeat, setRepeat] = useState(initialTask.repeat ?? 'none');
  const [reminderMinutes, setReminderMinutes] = useState(initialTask.reminderMinutesBefore ?? 0);

  const quickDurations = [15, 30, 45, 60, 90];
  const reminderQuick = [0, 10, 30, 60, 120];
  const priorities = ['low','medium','high'];

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
      dueAt: dueAtISO,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      repeat,
      reminderMinutesBefore: Number(reminderMinutes) || 0,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form className="af-form" onSubmit={handleSubmit}>
      <div className="af-section">
        <div className="af-title">Basics</div>
        <label className="af-field">
          <span className="af-label">Title</span>
          <input className="input" placeholder="Math worksheet on fractions" value={title} onChange={(e)=>setTitle(e.target.value)} required />
        </label>
        <label className="af-field">
          <span className="af-label">Subject</span>
          <div className="chip-group" style={{ marginBottom: 6 }}>
            {subjectsList.map(s => (
              <button key={s} type="button" className={`btn btn-ghost chip-btn ${subject===s?'active':''}`} onClick={()=>setSubject(s)}>{s}</button>
            ))}
            <button type="button" className="btn btn-ghost chip-btn" title="Add new subject" onClick={()=>{ const name=(prompt('New subject name')||'').trim(); if(name) setSubject(name); }}>＋ New</button>
          </div>
          <select
            className="input"
            value={subject}
            onChange={(e)=>setSubject(e.target.value)}
            aria-label="Select subject"
          >
            <option value="">Select subject</option>
            {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
            {subject && !subjectsList.includes(subject) && <option value={subject}>{subject}</option>}
          </select>
        </label>
        <label className="af-field">
          <span className="af-label">Priority</span>
          <div className="seg-group">
            {priorities.map(p => (
              <button key={p} type="button" className={`seg-btn ${priority===p?'seg-active':''}`} onClick={()=>setPriority(p)}>{p[0].toUpperCase()+p.slice(1)}</button>
            ))}
          </div>
        </label>
      </div>

      <div className="af-section">
        <div className="af-title">Schedule</div>
        <div className="af-grid">
          <div className="af-col">
            <label className="af-field">
              <span className="af-label">Due date</span>
              <InlineDatePicker valueISO={dueAtISO} onChange={setDueAtISO} />
            </label>
            <label className="af-field">
              <span className="af-label">Repeat</span>
              <select className="input" value={repeat} onChange={(e)=>setRepeat(e.target.value)} aria-label="Repeat">
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
          <div className="af-col">
            <label className="af-field">
              <span className="af-label">Estimate (min)</span>
              <div className="chip-group" style={{ marginBottom: 6 }}>
                {quickDurations.map(m => (
                  <button key={m} type="button" className={`btn btn-ghost chip-btn ${Number(estimatedMinutes)===m?'active':''}`} onClick={()=>setEstimatedMinutes(m)}>{m}m</button>
                ))}
              </div>
              <input className="input" type="number" min="0" step="5" value={estimatedMinutes} onChange={(e)=>setEstimatedMinutes(e.target.value)} placeholder="60" />
            </label>
            <label className="af-field">
              <span className="af-label">Reminder (min before)</span>
              <div className="chip-group" style={{ marginBottom: 6 }}>
                {reminderQuick.map(m => (
                  <button key={m} type="button" className={`btn btn-ghost chip-btn ${Number(reminderMinutes)===m?'active':''}`} onClick={()=>setReminderMinutes(m)}>{m}m</button>
                ))}
              </div>
              <input className="input" type="number" min="0" step="5" value={reminderMinutes} onChange={(e)=>setReminderMinutes(e.target.value)} placeholder="10" />
            </label>
          </div>
        </div>
      </div>

      <div className="af-section">
        <div className="af-title">Notes</div>
        <label className="af-field">
          <span className="af-label">Description</span>
          <textarea className="input" rows={4} placeholder="Add details, links, or requirements" value={notes} onChange={(e)=>setNotes(e.target.value)} />
        </label>
      </div>

      <div className="af-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn">Save assignment</button>
      </div>
    </form>
  );
}

export default function HomeworkApp() {
  const [tasks, setTasks] = useState(() => loadTasks(getTaskStorageKey((loadSettings().currentUserId)||'local')));
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due');
  const [showInfo, setShowInfo] = useState(false);
  const [view, setView] = useState('board'); // board | calendar
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(timerMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('planner'); // planner | calendar | settings | notes
  const [notes, setNotes] = useState(() => loadNotes());
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [canvasItems, setCanvasItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [notesMode, setNotesMode] = useState('editor');
  const [noteSearch, setNoteSearch] = useState('');
  const [rteHtml, setRteHtml] = useState('');
  const editorRef = useRef(null);
  const imgInputRef = useRef(null);
  // Canvas/Sync settings
  const initialSettings = useMemo(() => loadSettings(), []);
  const [canvasIcsUrl, setCanvasIcsUrl] = useState(initialSettings.canvasIcsUrl || '');
  const [canvasBaseUrl, setCanvasBaseUrl] = useState(initialSettings.canvasBaseUrl || '');
  const [canvasToken, setCanvasToken] = useState(initialSettings.canvasToken || '');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(Boolean(initialSettings.autoSyncEnabled));
  const [autoSyncSource, setAutoSyncSource] = useState(initialSettings.autoSyncSource || 'ics'); // ics | api
  const [autoSyncIntervalMin, setAutoSyncIntervalMin] = useState(initialSettings.autoSyncIntervalMin || 60);
  const [lastSyncStatus, setLastSyncStatus] = useState('');
  const [darkMode, setDarkMode] = useState(Boolean(initialSettings.darkMode));
  const [currentUserId, setCurrentUserId] = useState(initialSettings.currentUserId || 'local');
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const menuRef = useRef(null);
  const settingsRef = useRef(null);
  const [currentTaskId, setCurrentTaskId] = useState(() => localStorage.getItem(IN_PROGRESS_ID_KEY) || '');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [quickMenu, setQuickMenu] = useState({ open: false, x: 0, y: 0 });
  const [textStyle, setTextStyle] = useState({ font: 'sans-serif', size: 16, color: '#111827' });
  const [tool, setTool] = useState('select'); // select | pan | text | rect | image
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);
  const [marquee, setMarquee] = useState(null);
  const onWheelZoom = (e) => {
    if (!e.ctrlKey) return; e.preventDefault();
    setZoom(z => Math.min(2, Math.max(0.4, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  };
  const onCanvasPointerDown = (e) => {
    if (tool === 'pan') {
      document.body.classList.add('pan-grabbing');
      dragState.current = { id: 'pan', lastX: e.clientX, lastY: e.clientY, mode: 'pan' };
      window.addEventListener('pointermove', onCanvasPan);
      window.addEventListener('pointerup', onCanvasPanEnd, { once: true });
      return;
    }
    if (tool === 'select' && e.shiftKey) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      setMarquee({ x, y, w: 0, h: 0 });
      window.addEventListener('pointermove', onMarqueeMove);
      window.addEventListener('pointerup', onMarqueeEnd, { once: true });
      return;
    }
  };
  const onCanvasPan = (e) => {
    const s = dragState.current; if (s.mode !== 'pan') return;
    const dx = e.clientX - s.lastX; const dy = e.clientY - s.lastY;
    s.lastX = e.clientX; s.lastY = e.clientY;
    const el = canvasRef.current; if (!el) return;
    const cur = getComputedStyle(el).transform;
    setCanvasTransform(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };
  const onCanvasPanEnd = () => {
    document.body.classList.remove('pan-grabbing');
    window.removeEventListener('pointermove', onCanvasPan);
  };
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0 });
  const onMarqueeMove = (e) => {
    setMarquee(m => ({ ...m, w: e.clientX - (canvasRef.current?.getBoundingClientRect().left || 0) - m.x, h: e.clientY - (canvasRef.current?.getBoundingClientRect().top || 0) - m.y }));
  };
  const onMarqueeEnd = () => { setMarquee(null); window.removeEventListener('pointermove', onMarqueeMove); };

  const triggerImageTool = () => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=(e)=>{ const f=inp.files?.[0]; if (f) addImageItem(f); }; inp.click(); };

  useEffect(() => { if (currentTaskId) localStorage.setItem(IN_PROGRESS_ID_KEY, currentTaskId); else localStorage.removeItem(IN_PROGRESS_ID_KEY); }, [currentTaskId]);
  useEffect(() => { saveNotes(notes); }, [notes]);

  // Initialize theme on mount from saved setting
  useEffect(() => {
    if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, []);
  // React to theme changes
  useEffect(() => {
    if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, [darkMode]);

  // Motivational messages
  const messages = [
    'Small steps lead to big wins.',
    'Focus for 25 minutes. You got this!',
    'Done is better than perfect.',
    'Start now; future you will thank you.',
    'Progress, not perfection.',
    'One page, one problem, one step.',
    'Show up. Even a little counts.',
    'Make it easy to start; momentum will follow.',
    'Aim for consistent, not extreme.',
    'You only need to begin.',
    'Tiny progress today becomes big progress tomorrow.',
    'Reset, refocus, restart—right now.',
    'Your effort compounds; keep going.',
    'You don\'t have to be fast, just consistent.',
    'It\'s okay to take it slow. Don\'t stop.',
  ];
  const [messageIdx, setMessageIdx] = useState(() => Math.floor(Math.random() * messages.length));
  const [messageKey, setMessageKey] = useState(() => generateId());
  useEffect(() => {
    const id = setInterval(() => {
      setMessageIdx(i => (i + 1) % messages.length);
      setMessageKey(generateId());
    }, 8000);
    return () => clearInterval(id);
  }, [messages.length]);

  // Ensure view follows activeTab
  useEffect(() => { if (activeTab === 'calendar') setView('calendar'); else setView('board'); }, [activeTab, setView]);

  // Close menus on route/tab change
  useEffect(() => { setMenuOpen(false); }, [activeTab]);

  useEffect(() => { setTimeLeft(timerMinutes * 60); }, [timerMinutes]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);
  useEffect(() => { if (timeLeft === 0 && timerRunning) setTimerRunning(false); }, [timeLeft, timerRunning]);

  useEffect(() => {
    saveTasks(tasks, getTaskStorageKey(currentUserId));
  }, [tasks, currentUserId]);

  // CSV export
  const exportCsv = () => {
    const headers = ['Title','Subject','Notes','Priority','Status','DueAt','EstimateMin'];
    const rows = tasks.map(t => [t.title, t.subject, t.notes.replace(/\n/g,' '), t.priority, t.status, t.dueAt || '', t.estimatedMinutes]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'homework_tasks.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const exportIcs = () => {
    const formatDate = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return (
        d.getUTCFullYear().toString() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) + 'Z'
      );
    };
    const escapeText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//School Homework Planner//EN'];
    const now = formatDate(new Date().toISOString());
    tasks.forEach(t => {
      const dt = formatDate(t.dueAt);
      if (!dt) return;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${t.id}@local`);
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${dt}`);
      lines.push(`SUMMARY:${escapeText(t.title)}`);
      if (t.notes) lines.push(`DESCRIPTION:${escapeText(t.notes)}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'homework_tasks.ics'; a.click(); URL.revokeObjectURL(url);
  };

  // Handle repeat when marking done
  const scheduleNextIfRepeating = (task) => {
    if (!task.dueAt) return null;
    const due = new Date(task.dueAt);
    const next = new Date(due);
    if (task.repeat === 'daily') next.setDate(due.getDate() + 1);
    else if (task.repeat === 'weekly') next.setDate(due.getDate() + 7);
    else if (task.repeat === 'monthly') next.setMonth(due.getMonth() + 1);
    else return null;
    return { ...task, id: generateId(), status: 'todo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dueAt: next.toISOString() };
  };

  // Reminder banner (simple, local time check at load)
  const upcomingSoon = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => t.reminderMinutesBefore > 0 && t.dueAt && parseDate(t.dueAt)).filter(t => {
      const due = new Date(t.dueAt);
      const remindAt = new Date(due.getTime() - t.reminderMinutesBefore * 60000);
      return remindAt > now && (remindAt.getTime() - now.getTime()) < 60 * 60 * 1000; // within next hour
    }).slice(0, 3);
  }, [tasks]);

  const subjects = useMemo(() => {
    const set = new Set(tasks.map(t => t.subject).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Working search: filter tasks by title/subject/notes
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

  // ARIA: prevent interaction with dropdown when hidden
  useEffect(() => {
    if (menuRef.current) {
      if (menuOpen) {
        menuRef.current.removeAttribute('aria-hidden');
      } else {
        menuRef.current.setAttribute('aria-hidden', 'true');
      }
    }
  }, [menuOpen]);

  useEffect(() => {
    if (settingsRef.current) {
      if (settingsOpen) {
        settingsRef.current.removeAttribute('aria-hidden');
      } else {
        settingsRef.current.setAttribute('aria-hidden', 'true');
      }
    }
  }, [settingsOpen]);

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
    setTaskFormOpen(true);
    setNewTaskDueISO(null);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setTaskFormOpen(false);
    setNewTaskDueISO(null);
  };

  const upsertTask = (task) => {
    setTasks(prev => {
      const exists = prev.some(t => t.id === task.id);
      if (exists) return prev.map(t => (t.id === task.id ? task : t));
      return [task, ...prev];
    });
    setIsAdding(false);
    setEditingId(null);
    setTaskFormOpen(false);
    setNewTaskDueISO(null);
  };

  const removeTask = (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleDone = (id, done) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        return { ...t, status: done ? 'done' : 'todo', updatedAt: new Date().toISOString() };
      });
      if (done) {
        const finished = updated.find(t => t.id === id);
        const next = finished ? scheduleNextIfRepeating(finished) : null;
        return next ? [next, ...updated] : updated;
      }
      return updated;
    });
  };

  const setInProgress = (id) => {
    setCurrentTaskId(id);
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: 'in_progress', updatedAt: new Date().toISOString() } : t)));
  };

  const pauseTask = (id) => {
    if (currentTaskId === id) setCurrentTaskId('');
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: 'todo', updatedAt: new Date().toISOString() } : t)));
  };

  const completeTask = (id) => {
    if (currentTaskId === id) setCurrentTaskId('');
    toggleDone(id, true);
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
        subtasks: Array.isArray(t.subtasks) ? t.subtasks.map((s) => ({ id: s.id || generateId(), text: String(s.text || ''), done: Boolean(s.done) })) : [],
        repeat: ['none', 'daily', 'weekly', 'monthly'].includes(t.repeat) ? t.repeat : 'none',
        reminderMinutesBefore: Number(t.reminderMinutesBefore) || 0,
      }));
      setTasks(sanitized);
    } catch (e) {
      alert('Import failed. Ensure the file is a valid tasks JSON export.');
    } finally {
      event.target.value = '';
    }
  };

  const editingTask = useMemo(() => tasks.find(t => t.id === editingId) || null, [tasks, editingId]);

  useEffect(() => {
    if (editingId != null) setTaskFormOpen(true);
  }, [editingId]);

  // Calendar helpers
  const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const monthDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [calendarMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    monthDays.forEach(d => map.set(d.toDateString(), []));
    tasks.forEach(t => {
      if (!t.dueAt) return;
      const key = new Date(t.dueAt).toDateString();
      if (map.has(key)) map.get(key).push(t);
    });
    return map;
  }, [monthDays, tasks]);

  // Dedup helper
  const hasTask = useCallback((title, dueAtIso) => {
    const key = `${title}__${dueAtIso || ''}__Canvas`;
    return tasks.some(t => `${t.title}__${t.dueAt || ''}__${t.subject || ''}` === key);
  }, [tasks]);

  // ICS import helper
  const importIcsText = useCallback((text, subjectLabel = 'Canvas') => {
    const lines = text.split(/\r?\n/);
    const events = [];
    let cur = {};
    for (const raw of lines) {
      const line = raw.startsWith(' ') ? (events.length ? (events[events.length-1]._lastLine += raw.slice(1)) : raw) : raw; // simple fold handling
      if (line.startsWith('BEGIN:VEVENT')) cur = {};
      else if (line.startsWith('SUMMARY:')) cur.summary = line.slice(8).trim();
      else if (line.startsWith('DTSTART')) {
        const parts = line.split(':');
        cur.start = parts[1]?.trim();
      } else if (line.startsWith('DTEND')) {
        const parts = line.split(':');
        cur.end = parts[1]?.trim();
      } else if (line.startsWith('DESCRIPTION:')) cur.description = line.slice(12).trim();
      else if (line.startsWith('END:VEVENT')) { events.push(cur); cur = {}; }
    }
    const parseIcsDate = (v) => {
      if (!v) return null;
      if (/^\d{8}T\d{6}Z$/.test(v)) return new Date(v).toISOString();
      if (/^\d{8}T\d{6}$/.test(v)) {
        const yyyy = v.slice(0,4), mm=v.slice(4,6), dd=v.slice(6,8), hh=v.slice(9,11), mi=v.slice(11,13), ss=v.slice(13,15);
        const d = new Date(Number(yyyy), Number(mm)-1, Number(dd), Number(hh), Number(mi), Number(ss));
        return d.toISOString();
      }
      if (/^\d{8}$/.test(v)) {
        const yyyy = v.slice(0,4), mm=v.slice(4,6), dd=v.slice(6,8);
        const d = new Date(Number(yyyy), Number(mm)-1, Number(dd), 17, 0, 0);
        return d.toISOString();
      }
      return null;
    };
    const newTasks = events.map(ev => ({
      id: generateId(),
      title: ev.summary || 'Canvas Assignment',
      subject: subjectLabel,
      notes: (ev.description || '').replace(/\\n/g, '\n'),
      priority: 'medium',
      status: 'todo',
      dueAt: parseIcsDate(ev.end) || parseIcsDate(ev.start) || null,
      estimatedMinutes: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtasks: [],
      repeat: 'none',
      reminderMinutesBefore: 0,
    })).filter(t => !hasTask(t.title, t.dueAt));
    if (newTasks.length > 0) setTasks(prev => [...newTasks, ...prev]);
    return newTasks.length;
  }, [hasTask]);

  const syncFromIcsUrl = useCallback(async () => {
    if (!canvasIcsUrl) { setLastSyncStatus('Set ICS URL'); return; }
    try {
      const res = await fetch(canvasIcsUrl, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const count = importIcsText(text, 'Canvas');
      setLastSyncStatus(`ICS synced: ${count} new`);
    } catch (e) {
      setLastSyncStatus(`ICS sync failed: ${e.message}`);
    }
  }, [canvasIcsUrl, importIcsText]);

  const syncFromCanvasApi = useCallback(async () => {
    if (!canvasBaseUrl || !canvasToken) { setLastSyncStatus('Set Canvas URL and token'); return; }
    try {
      const base = canvasBaseUrl.replace(/\/$/, '');
      const startISO = new Date(Date.now() - 7*86400000).toISOString();
      const endISO = new Date(Date.now() + 30*86400000).toISOString();
      const url = `${base}/api/v1/planner/items?start_date=${encodeURIComponent(startISO)}&end_date=${encodeURIComponent(endISO)}&per_page=100`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${canvasToken}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();
      const toAdd = [];
      items.forEach((it) => {
        const title = it.plannable?.name || it.title || 'Canvas Item';
        const dueAt = it.plannable?.due_at || it.plannable?.all_day_date || it.plannable?.todo_date || null;
        if (!hasTask(title, dueAt)) {
          toAdd.push({
            id: generateId(),
            title,
            subject: 'Canvas',
            notes: it.plannable?.description || '',
            priority: 'medium',
            status: 'todo',
            dueAt,
            estimatedMinutes: 60,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subtasks: [],
            repeat: 'none',
            reminderMinutesBefore: 0,
          });
        }
      });
      if (toAdd.length > 0) setTasks(prev => [...toAdd, ...prev]);
      setLastSyncStatus(`API synced: ${toAdd.length} new`);
    } catch (e) {
      setLastSyncStatus(`API sync failed: ${e.message}`);
    }
  }, [canvasBaseUrl, canvasToken, hasTask]);

  // Auto sync timer
  useEffect(() => {
    if (!autoSyncEnabled) return;
    const fn = autoSyncSource === 'api' ? syncFromCanvasApi : syncFromIcsUrl;
    fn();
    const id = setInterval(() => fn(), Math.max(1, autoSyncIntervalMin) * 60 * 1000);
    return () => clearInterval(id);
  }, [autoSyncEnabled, autoSyncSource, autoSyncIntervalMin, syncFromCanvasApi, syncFromIcsUrl]);

  const subjectColors = useMemo(() => {
    // deterministic color assignment per subject
    const colors = ['#2563eb','#7c3aed','#16a34a','#f59e0b','#ef4444','#06b6d4','#a855f7'];
    const map = new Map();
    tasks.forEach(t => {
      if (!t.subject) return;
      if (!map.has(t.subject)) {
        const idx = (t.subject.split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % colors.length;
        map.set(t.subject, colors[idx]);
      }
    });
    return map;
  }, [tasks]);

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    if (!q) return notes;
    const strip = (html) => String(html || '').replace(/<[^>]+>/g, ' ');
    return notes.filter(n =>
      String(n.title || '').toLowerCase().includes(q) ||
      strip(n.body).toLowerCase().includes(q)
    );
  }, [notes, noteSearch]);

  const beginNewNote = () => { setEditingNoteId(null); setNoteTitle(''); setNoteBody(''); setRteHtml(''); setActiveTab('notes'); };
  const saveNote = () => {
    const title = noteTitle.trim(); const body = (rteHtml || noteBody).trim(); if (!title && !body) return;
    if (editingNoteId) {
      setNotes(prev => prev.map(n => n.id === editingNoteId ? { ...n, title, body, updatedAt: new Date().toISOString() } : n));
    } else {
      const id = generateId();
      setNotes(prev => [{ id, title, body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]);
      setSelectedNoteId(id);
    }
    setNoteTitle(''); setNoteBody(''); setRteHtml('');
  };
  const editNote = (id) => {
    const n = notes.find(x => x.id === id); if (!n) return;
    setEditingNoteId(id); setNoteTitle(n.title); setNoteBody(n.body); setRteHtml(n.body || ''); setActiveTab('notes');
  };
  const deleteNote = (id) => { if (!window.confirm('Delete this note?')) return; setNotes(prev => prev.filter(n => n.id !== id)); };

  // Load canvas when selecting a note
  useEffect(() => {
    if (!selectedNoteId) return;
    setCanvasItems(loadCanvas(selectedNoteId));
  }, [selectedNoteId]);
  useEffect(() => {
    if (!selectedNoteId) return;
    saveCanvas(selectedNoteId, canvasItems);
  }, [selectedNoteId, canvasItems]);

  const addTextItem = () => {
    if (!selectedNoteId) return;
    const id = generateId();
    setCanvasItems(prev => [...prev, { id, type: 'text', x: 40, y: 60, w: 220, h: 80, text: 'New text' }]);
    setSelectedItemId(id);
  };
  const addImageItem = async (file) => {
    if (!selectedNoteId || !file) return;
    const url = URL.createObjectURL(file);
    setCanvasItems(prev => [...prev, { id: generateId(), type: 'image', x: 60, y: 80, w: 240, h: 180, src: url }]);
  };
  const gridSize = 10;
  const snap = (v) => Math.round(v / gridSize) * gridSize;
  const clampRect = (x, y, w, h) => {
    const pad = 2;
    const maxW = Math.max(60, w);
    const maxH = Math.max(40, h);
    return { x: Math.max(pad, x), y: Math.max(pad, y), w: maxW, h: maxH };
  };
  const onDrag = (id, dx, dy) => {
    setCanvasItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const next = clampRect(snap(it.x + dx), snap(it.y + dy), it.w, it.h);
      return { ...it, ...next };
    }));
  };
  const onResize = (id, dw, dh) => {
    setCanvasItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const next = clampRect(it.x, it.y, snap(it.w + dw), snap(it.h + dh));
      return { ...it, ...next };
    }));
  };
  const updateText = (id, text) => setCanvasItems(prev => prev.map(it => it.id === id ? { ...it, text } : it));
  const removeItem = (id) => setCanvasItems(prev => prev.filter(it => it.id !== id));
  const duplicateItem = () => {
    if (!selectedItemId) return;
    setCanvasItems(prev => {
      const it = prev.find(x => x.id === selectedItemId); if (!it) return prev;
      const copy = { ...it, id: generateId(), x: snap(it.x + 20), y: snap(it.y + 20) };
      return [...prev, copy];
    });
  };
  const deleteSelected = () => { if (!selectedItemId) return; removeItem(selectedItemId); setSelectedItemId(null); };

  // Pointer handlers for drag/resize
  const dragState = useRef({ id: null, lastX: 0, lastY: 0, mode: 'move' });
  const onPointerDown = (e, id, mode) => {
    e.stopPropagation();
    dragState.current = { id, lastX: e.clientX, lastY: e.clientY, mode };
    setSelectedItemId(id);
    document.body.classList.add('grabbing');
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  };
  const onPointerMove = (e) => {
    const s = dragState.current; if (!s.id) return;
    const dx = e.clientX - s.lastX; const dy = e.clientY - s.lastY;
    if (s.mode === 'move') onDrag(s.id, dx, dy); else onResize(s.id, dx, dy);
    dragState.current.lastX = e.clientX; dragState.current.lastY = e.clientY;
  };
  const onPointerUp = () => {
    dragState.current = { id: null, lastX: 0, lastY: 0, mode: 'move' };
    document.body.classList.remove('grabbing');
    window.removeEventListener('pointermove', onPointerMove);
  };

  const handleCanvasDoubleClick = (e) => {
    if (!selectedNoteId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = snap(e.clientX - rect.left);
    const y = snap(e.clientY - rect.top);
    const id = generateId();
    setCanvasItems(prev => [...prev, { id, type: 'text', x, y, w: 240, h: 100, text: 'New text', style: { ...textStyle } }]);
    setSelectedItemId(id);
    setQuickMenu({ open: false, x: 0, y: 0 });
  };

  const handleCanvasClick = (e) => {
    if (!selectedNoteId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setQuickMenu({ open: true, x, y });
  };

  const applyTextStyle = (key, value) => {
    setTextStyle(prev => ({ ...prev, [key]: value }));
    if (selectedItemId) {
      setCanvasItems(prev => prev.map(it => it.id === selectedItemId && it.type==='text' ? { ...it, style: { ...(it.style||{}), [key]: value } } : it));
    }
  };

  const addShapeItem = (fill = 'rgba(37,99,235,0.15)') => {
    if (!selectedNoteId) return;
    setCanvasItems(prev => [...prev, { id: generateId(), type: 'shape', x: 60, y: 60, w: 200, h: 120, fill }]);
  };

  const addEllipseItem = (fill = 'rgba(16,185,129,0.2)') => {
    if (!selectedNoteId) return;
    setCanvasItems(prev => [...prev, { id: generateId(), type: 'ellipse', x: 80, y: 80, w: 200, h: 140, fill, rx: 9999 }]);
  };
  const addLineItem = (stroke = 'rgba(124,58,237,0.9)') => {
    if (!selectedNoteId) return;
    setCanvasItems(prev => [...prev, { id: generateId(), type: 'line', x: 60, y: 60, w: 220, h: 2, stroke }]);
  };

  const [overlayQuick, setOverlayQuick] = useState({ open: false, x: 0, y: 0 });
  const [connections, setConnections] = useState([]); // {id, fromId, toId}
  const [drawingConn, setDrawingConn] = useState(null); // {fromId, x, y}

  const openQuickAt = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setOverlayQuick({ open: true, x: clientX - rect.left, y: clientY - rect.top });
  };

  const startConnection = (fromId, e) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    setDrawingConn({ fromId, x: e.clientX - rect.left, y: e.clientY - rect.top });
    window.addEventListener('pointermove', onConnMove);
    window.addEventListener('pointerup', onConnEnd, { once: true });
  };
  const onConnMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    setDrawingConn(dc => (dc ? { ...dc, x: e.clientX - rect.left, y: e.clientY - rect.top } : null));
  };
  const onConnEnd = (e) => {
    window.removeEventListener('pointermove', onConnMove);
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    // Hit-test items (simple bounding box)
    const hit = canvasItems.find(it => x >= it.x && x <= it.x + it.w && y >= it.y && y <= it.y + it.h);
    if (hit && drawingConn?.fromId && hit.id !== drawingConn.fromId) {
      setConnections(prev => [...prev, { id: generateId(), fromId: drawingConn.fromId, toId: hit.id }]);
    }
    setDrawingConn(null);
  };

  const getItemCenter = (id) => {
    const it = canvasItems.find(i => i.id === id); if (!it) return { x: 0, y: 0 };
    return { x: it.x + it.w/2, y: it.y + it.h/2 };
  };

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const apply = () => setLeftCollapsed(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (activeTab !== 'notes' || notesMode !== 'editor') return;
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); document.execCommand('bold'); }
      if (e.key.toLowerCase() === 'i') { e.preventDefault(); document.execCommand('italic'); }
      if (e.key.toLowerCase() === 'u') { e.preventDefault(); document.execCommand('underline'); }
      if (e.key.toLowerCase() === 's') { e.preventDefault(); saveNote(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab, notesMode, saveNote]);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authStatus, setAuthStatus] = useState('');

  const supaSignUp = useCallback(async () => {
    if (!supabase) { setAuthStatus('Supabase not configured'); return; }
    try {
      const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) throw error;
      setAuthStatus('Check your email to confirm');
    } catch (e) { setAuthStatus(e.message); }
  }, [authEmail, authPassword]);
  const supaSignIn = useCallback(async () => {
    if (!supabase) { setAuthStatus('Supabase not configured'); return; }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) throw error;
      setAuthStatus('Signed in');
      setCurrentUserId(data.user?.id || 'local');
    } catch (e) { setAuthStatus(e.message); }
  }, [authEmail, authPassword]);
  const supaSignOut = useCallback(async () => {
    if (!supabase) return; await supabase.auth.signOut(); setAuthStatus('Signed out'); setCurrentUserId('local');
  }, []);

  // Optional: sync tasks to Supabase tasks table
  const supaSyncTasks = useCallback(async () => {
    if (!supabase) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) { setAuthStatus('Sign in to sync'); return; }
      const payload = tasks.map(t => ({ ...t, user_id: user.id }));
      // Upsert into 'tasks' table (schema should exist)
      const { error } = await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
      if (error) throw error; setAuthStatus('Synced to cloud');
    } catch (e) { setAuthStatus(`Sync failed: ${e.message}`); }
  }, [tasks]);

  const supaOAuth = useCallback(async (provider) => {
    if (!supabase) { setAuthStatus('Supabase not configured'); return; }
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
      if (error) throw error;
      setAuthStatus('Redirecting to provider…');
    } catch (e) { setAuthStatus(e.message); }
  }, []);

  const [settingsTab, setSettingsTab] = useState('general'); // general | account | data | integrations | sync

  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef(null);

  const [newTaskDueISO, setNewTaskDueISO] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(Boolean(initialSettings.notificationsEnabled));
  const [timerCollapsed, setTimerCollapsed] = useState(true);
  const [clockOpen, setClockOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const defaultTimerPos = useMemo(() => {
    const wh = typeof window !== 'undefined' ? (window.innerHeight || 600) : 600;
    const panelH = 110;
    return { x: 16, y: Math.max(16, wh - panelH - 16) };
  }, []);
  const [timerPos, setTimerPos] = useState(defaultTimerPos);
  const timerRef = useRef(null);
  const dragRef = useRef({ active: false, dx: 0, dy: 0 });
  const [timerDragging, setTimerDragging] = useState(false);
  const rafRef = useRef(0);
  const latestPosRef = useRef(timerPos);

  useEffect(() => {
    // Force default on load
    setTimerCollapsed(true);
    const wh = (typeof window !== 'undefined') ? (window.innerHeight || 600) : 600;
    setTimerPos({ x: 16, y: Math.max(16, wh - 110 - 16) });
  }, []);

  // Live clock for header (top-left)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const clockDate = now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const clockTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Persist settings (excluding timer UI position/state to keep defaults on refresh)
  useEffect(() => {
    saveSettings({ canvasIcsUrl, canvasBaseUrl, canvasToken, autoSyncEnabled, autoSyncSource, autoSyncIntervalMin, darkMode, currentUserId, notificationsEnabled });
  }, [canvasIcsUrl, canvasBaseUrl, canvasToken, autoSyncEnabled, autoSyncSource, autoSyncIntervalMin, darkMode, currentUserId, notificationsEnabled]);

  const requestNotify = useCallback(async () => {
    if (!('Notification' in window)) { alert('Notifications not supported'); return; }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  }, []);
  const testNotification = useCallback(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('Reminder enabled', { body: 'Notifications are working.' });
    }
  }, []);

  const beginAddWithDueDate = (iso) => {
    setEditingId(null);
    setIsAdding(true);
    setNewTaskDueISO(iso || null);
    setTaskFormOpen(true);
  };

  const onTimerPointerDown = (e) => {
    if (e.button !== 0) return;
    if ((e.target.closest && e.target.closest('input,button,select,textarea'))) return;
    e.preventDefault();
    const rect = timerRef.current?.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const offX = startX - (rect?.left || 0);
    const offY = startY - (rect?.top || 0);
    dragRef.current = { active: true, dx: offX, dy: offY };
    setTimerDragging(true);
    document.body.classList.add('timer-grabbing');
    try { timerRef.current?.setPointerCapture?.(e.pointerId); } catch {}
    window.addEventListener('pointermove', onTimerPointerMove);
    window.addEventListener('pointerup', onTimerPointerUp, { once: true });
  };
  const onTimerPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const rawX = e.clientX - dragRef.current.dx;
    const rawY = e.clientY - dragRef.current.dy;
    const w = timerRef.current?.offsetWidth || 320;
    const h = timerRef.current?.offsetHeight || 96;
    const maxX = (window.innerWidth || 800) - w - 8;
    const maxY = (window.innerHeight || 600) - h - 8;
    const clamped = { x: Math.max(8, Math.min(maxX, rawX)), y: Math.max(8, Math.min(maxY, rawY)) };
    latestPosRef.current = clamped;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setTimerPos(latestPosRef.current);
      });
    }
  };
  const onTimerPointerUp = () => {
    dragRef.current.active = false;
    setTimerDragging(false);
    document.body.classList.remove('timer-grabbing');
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    window.removeEventListener('pointermove', onTimerPointerMove);
  };

  return (
    <div className="hw-app" onClick={() => menuOpen && setMenuOpen(false)}>
      <header className="hw-header" onClick={(e) => e.stopPropagation()}>
        <div className="hw-title" role="button" onClick={() => setActiveTab('planner')}>
          <span className="clock" role="button" aria-haspopup="dialog" aria-expanded={clockOpen} onClick={(e)=>{ e.stopPropagation(); setClockOpen(true); }}>{clockDate} • {clockTime}</span>
        </div>
        <div className="center">
          <input className="input search" aria-label="Search tasks" placeholder="Search title, subject, notes" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className="icon-btn filter" title="Filters" aria-expanded={filtersOpen} onClick={(e)=>{ e.stopPropagation(); setFiltersOpen(v=>!v); }} style={{ marginLeft: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18l-7 8v5l-4-2v-3L3 5z"/></svg>
          </button>
          {filtersOpen && (
            <div ref={filtersRef} className="dropdown filter-dropdown" role="menu" style={{ position:'absolute', top: 54, left: '50%', transform:'translateX(-50%)', minWidth: 280 }} onClick={(e)=>e.stopPropagation()}>
              <div className="item" role="menuitem" style={{ pointerEvents: 'none', opacity: 0.8 }}>Filters</div>
              <div className="item" role="menuitem">
                <span style={{ flex: 1 }}>Status</span>
                <select className="input" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="item" role="menuitem">
                <span style={{ flex: 1 }}>Subject</span>
                <select className="input" value={subjectFilter} onChange={(e)=>setSubjectFilter(e.target.value)}>
                  <option value="all">All</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="item" role="menuitem">
                <span style={{ flex: 1 }}>Sort</span>
                <select className="input" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
                  <option value="due">Due</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                  <option value="updated">Updated</option>
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="right">
          <button type="button" className={`icon-btn ${activeTab==='planner' ? 'active' : ''}`} title="Planner" aria-pressed={activeTab==='planner'} onClick={() => setActiveTab('planner')}>📋</button>
          <button type="button" className={`icon-btn ${activeTab==='calendar' ? 'active' : ''}`} title="Calendar" aria-pressed={activeTab==='calendar'} onClick={() => setActiveTab('calendar')}>📆</button>
          <button type="button" className={`icon-btn ${activeTab==='notes' ? 'active' : ''}`} title="Notes" aria-pressed={activeTab==='notes'} onClick={() => setActiveTab('notes')}>📝</button>
          <button type="button" className="icon-btn" title={darkMode ? 'Light mode' : 'Dark mode'} aria-pressed={darkMode} onClick={() => setDarkMode(d => !d)}>{darkMode ? '🌙' : '☀️'}</button>
          <button type="button" className="icon-btn" title="More" aria-expanded={menuOpen} aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}>⋯</button>
          {menuOpen && (
            <div ref={menuRef} className="dropdown slide-down" role="menu" style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
              <div className="item" role="menuitem" style={{ pointerEvents: 'none', opacity: 0.8 }}>Quick login</div>
              <div className="item" role="menuitem" style={{ display:'grid', gap:6 }}>
                <button className="btn" onClick={()=>supaOAuth('google')}>Continue with Google</button>
                <button className="btn" onClick={()=>supaOAuth('azure')}>Continue with Microsoft</button>
              </div>
              <div className="item" role="menuitem" style={{ display:'grid', gap:6 }}>
                <input className="input" placeholder="Email" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
                <input className="input" type="password" placeholder="Password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} />
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn" onClick={supaSignIn}>Sign in</button>
                  <button className="btn btn-ghost" onClick={supaSignUp}>Sign up</button>
                  <button className="btn btn-ghost" onClick={supaSignOut}>Sign out</button>
                </div>
                <div className="settings-note">{authStatus || (supabase ? '—' : 'Supabase not configured')}</div>
              </div>
              <hr />
              <button className="item" role="menuitem" onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>Settings</button>
            </div>
          )}
        </div>
      </header>

      <section className="hero fade-in" onClick={() => setMenuOpen(false)}>
        <div className="hero-inner">
          <div>
            <div className="hero-message">
              <h1 key={messageKey} className="hero-title slide-in">{messages[messageIdx]}</h1>
            </div>
            <p className="hero-subtitle">Plan smarter. Track assignments, deadlines, and progress at a glance.</p>
          </div>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-top"><span className="stat-icon">⏰</span><span className="stat-label">Overdue</span></div>
              <div className="stat-kpi">{stats.overdue}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><span className="stat-icon">📅</span><span className="stat-label">Today</span></div>
              <div className="stat-kpi">{stats.today}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><span className="stat-icon">✅</span><span className="stat-label">Done</span></div>
              <div className="stat-kpi">{stats.done}</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><span className="stat-icon">📚</span><span className="stat-label">Total</span></div>
              <div className="stat-kpi">{stats.total}</div>
            </div>
          </div>
        </div>
      </section>

      {/* remove bulky toolbar & keep tabs implicit from icons */}
      {showInfo && (
        <div className="panel fade-in">
          <div className="panel-title">For Schools & Privacy</div>
          <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
            <li>No accounts or logins; works offline in the browser.</li>
            <li>No ads, no tracking, and no third‑party analytics. All data stays on this device (local storage).</li>
            <li>No social features or external content. Import/Export is local JSON or CSV only.</li>
            <li>Designed for classrooms: keyboard‑friendly, readable, and distraction‑free.</li>
          </ul>
        </div>
      )}

      {taskFormOpen && (
        <div className="modal" onClick={cancelForm}>
          <div className="panel modal-panel slide-down" onClick={(e)=>e.stopPropagation()}>
            <div className="panel-title">{editingTask ? 'Edit assignment' : 'New assignment'}</div>
            <AssignmentForm initialTask={editingTask || defaultNewTask(newTaskDueISO)} onSave={upsertTask} onCancel={cancelForm} subjectsList={subjects} />
          </div>
        </div>
      )}

      {activeTab === 'calendar' ? (
        <div className="calendar fade-in" onClick={() => setMenuOpen(false)}>
          <div className="calendar-header">
            <button className="btn btn-ghost" onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>Prev</button>
            <div className="calendar-title">{calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
            <button className="btn btn-ghost" onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>Next</button>
          </div>
          <div className="weekday-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="weekday">{d}</div>)}
          </div>
          <div className="calendar-grid">
            {monthDays.map((d) => {
              const key = d.toDateString();
              const dayTasks = tasksByDay.get(key) || [];
              const fullLabel = `${d.toLocaleDateString()} — ${dayTasks.length} task(s)`;
              return (
                <div className="calendar-cell day-wrap" key={key} tabIndex={0} onDoubleClick={() => beginAddWithDueDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, 0, 0).toISOString())}>
                  <div className="calendar-date">{d.getDate()}</div>
                  <div className="calendar-tasks">
                    {dayTasks.map(t => (
                      <div key={t.id} className={`cal-task ${t.status==='done' ? 'done' : ''}`}>{t.title}</div>
                    ))}
                  </div>
                  <div className="day-tooltip">
                    <div className="day-tip-title">{fullLabel}</div>
                    <div className="day-tip-list">
                      {dayTasks.slice(0,6).map(t => (
                        <div key={t.id} className="day-tip-item">• {t.title}</div>
                      ))}
                      {dayTasks.length > 6 && <div className="day-tip-more">+ {dayTasks.length - 6} more…</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'notes' ? (
        <div className="panel fade-in" style={{ margin: 16 }}>
          <div className="panel-title">Notes</div>
          <div>Coming soon — this feature is under active development.</div>
        </div>
      ) : (
        <main className="board fade-in" onClick={() => setMenuOpen(false)}>
          <section className="column">
            <div className="column-title">Overdue</div>
            <div className="list">
              {grouped.overdue.length === 0 && <div className="empty">You're all caught up here.</div>}
              {grouped.overdue.map(t => (
                <TaskCard key={t.id} task={t} subjectColors={subjectColors} onEdit={() => setEditingId(t.id)} onDelete={() => removeTask(t.id)} onToggleDone={(d) => toggleDone(t.id, d)} onStart={() => setInProgress(t.id)} onPause={(id) => pauseTask(id)} onComplete={(id) => completeTask(id)} onToggleSubtask={(subId) => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, subtasks: (x.subtasks||[]).map(s => s.id === subId ? { ...s, done: !s.done } : s) } : x))} />
              ))}
            </div>
          </section>
          <section className="column">
            <div className="column-title">Today</div>
            <div className="list">
              {grouped.today.length === 0 && <div className="empty">Nothing due today.</div>}
              {grouped.today.map(t => (
                <TaskCard key={t.id} task={t} subjectColors={subjectColors} onEdit={() => setEditingId(t.id)} onDelete={() => removeTask(t.id)} onToggleDone={(d) => toggleDone(t.id, d)} onStart={() => setInProgress(t.id)} onPause={(id) => pauseTask(id)} onComplete={(id) => completeTask(id)} onToggleSubtask={(subId) => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, subtasks: (x.subtasks||[]).map(s => s.id === subId ? { ...s, done: !s.done } : s) } : x))} />
              ))}
            </div>
          </section>
          <section className="column">
            <div className="column-title">Upcoming</div>
            <div className="list">
              {grouped.upcoming.length === 0 && <div className="empty">No upcoming tasks.</div>}
              {grouped.upcoming.map(t => (
                <TaskCard key={t.id} task={t} subjectColors={subjectColors} onEdit={() => setEditingId(t.id)} onDelete={() => removeTask(t.id)} onToggleDone={(d) => toggleDone(t.id, d)} onStart={() => setInProgress(t.id)} onPause={(id) => pauseTask(id)} onComplete={(id) => completeTask(id)} onToggleSubtask={(subId) => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, subtasks: (x.subtasks||[]).map(s => s.id === subId ? { ...s, done: !s.done } : s) } : x))} />
              ))}
            </div>
          </section>
          <section className="column">
            <div className="column-title">Completed</div>
            <div className="list">
              {grouped.done.length === 0 && <div className="empty">No completed tasks yet.</div>}
              {grouped.done.map(t => (
                <TaskCard key={t.id} task={t} subjectColors={subjectColors} onEdit={() => setEditingId(t.id)} onDelete={() => removeTask(t.id)} onToggleDone={(d) => toggleDone(t.id, d)} onStart={() => setInProgress(t.id)} onPause={(id) => pauseTask(id)} onComplete={(id) => completeTask(id)} onToggleSubtask={(subId) => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, subtasks: (x.subtasks||[]).map(s => s.id === subId ? { ...s, done: !s.done } : s) } : x))} />
              ))}
            </div>
          </section>
        </main>
      )}

      {settingsOpen && (
        <div className="modal" onClick={() => setSettingsOpen(false)}>
          <div ref={settingsRef} className="panel modal-panel slide-down" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
            <div className="panel-title">Settings</div>
            <div className="settings-tabs">
              <button className={`settings-tab ${settingsTab==='general'?'settings-tab-active':''}`} onClick={()=>setSettingsTab('general')}>General</button>
              <button className={`settings-tab ${settingsTab==='account'?'settings-tab-active':''}`} onClick={()=>setSettingsTab('account')}>Account</button>
              <button className={`settings-tab ${settingsTab==='data'?'settings-tab-active':''}`} onClick={()=>setSettingsTab('data')}>Data</button>
              <button className={`settings-tab ${settingsTab==='integrations'?'settings-tab-active':''}`} onClick={()=>setSettingsTab('integrations')}>Integrations</button>
              <button className={`settings-tab ${settingsTab==='sync'?'settings-tab-active':''}`} onClick={()=>setSettingsTab('sync')}>Sync</button>
            </div>
            <div className="settings-body">
              {settingsTab === 'general' && (
                <>
                  <div className="settings-section">
                    <div className="settings-title">Appearance</div>
                    <div className="settings-row inline">
                      <label className="field">
                        <span className="label">Theme</span>
                        <select className="input" value={darkMode ? 'dark' : 'light'} onChange={(e) => setDarkMode(e.target.value === 'dark')}>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </label>
                    </div>
                    <div className="settings-desc">Switch between light and dark themes.</div>
                  </div>
                  <div className="settings-section">
                    <div className="settings-title">Notifications</div>
                    <div className="settings-row inline">
                      <button className="btn" onClick={requestNotify}>{notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}</button>
                      <button className="btn btn-ghost" onClick={testNotification} disabled={!notificationsEnabled}>Test notification</button>
                    </div>
                    <div className="settings-note">Used for local reminders when the app is open.</div>
                  </div>
                </>
              )}
              {settingsTab === 'account' && (
                <>
                  <div className="settings-section">
                    <div className="settings-title">User</div>
                    <div className="settings-row inline">
                      <label className="field">
                        <span className="label">User ID</span>
                        <input className="input" placeholder="local" value={currentUserId} onChange={(e)=>setCurrentUserId(e.target.value.trim()||'local')} />
                      </label>
                    </div>
                    <div className="settings-desc">Local data is namespaced by User ID.</div>
                  </div>
                  <div className="settings-section">
                    <div className="settings-title">Authentication</div>
                    <div className="settings-row inline">
                      <input className="input" placeholder="Email" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
                      <input className="input" type="password" placeholder="Password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} />
                      <button className="btn" onClick={supaSignUp}>Sign up</button>
                      <button className="btn" onClick={supaSignIn}>Sign in</button>
                      <button className="btn btn-ghost" onClick={supaSignOut}>Sign out</button>
                    </div>
                    <div className="settings-note">{authStatus || (supabase ? '—' : 'Supabase not configured')}</div>
                  </div>
                </>
              )}
              {settingsTab === 'data' && (
                <>
                  <div className="settings-section">
                    <div className="settings-title">Data</div>
                    <div className="settings-row">
                      <div className="settings-desc">Backup and restore your assignments.</div>
                      <div className="settings-actions">
                        <button className="btn" onClick={exportJson}>Export JSON</button>
                        <button className="btn" onClick={exportCsv}>Export CSV</button>
                        <button className="btn" onClick={exportIcs}>Export ICS</button>
                        <label className="btn btn-ghost file-label">
                          Import JSON
                          <input type="file" accept="application/json" onChange={importJson} />
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {settingsTab === 'integrations' && (
                <>
                  <div className="settings-section">
                    <div className="settings-title">Canvas</div>
                    <div className="settings-row">
                      <label className="field">
                        <span className="label">Import from ICS</span>
                        <input className="input" type="file" accept="text/calendar,.ics" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return; const text = await file.text();
                          const count = importIcsText(text, 'Canvas'); e.target.value = ''; alert(`Imported ${count} assignment(s).`);
                        }} />
                      </label>
                      <label className="field">
                        <span className="label">ICS feed URL</span>
                        <input className="input" placeholder="https://yourcanvas.example.edu/feeds/...user.ics" value={canvasIcsUrl} onChange={(e) => setCanvasIcsUrl(e.target.value)} />
                        <div className="settings-actions">
                          <button className="btn" onClick={syncFromIcsUrl}>Sync now</button>
                          <span className="settings-note">May be blocked by CORS. If blocked, download and import file above.</span>
                        </div>
                      </label>
                      <label className="field">
                        <span className="label">Canvas base URL</span>
                        <input className="input" placeholder="https://yourcanvas.example.edu" value={canvasBaseUrl} onChange={(e) => setCanvasBaseUrl(e.target.value)} />
                      </label>
                      <label className="field">
                        <span className="label">Access token</span>
                        <input className="input" type="password" placeholder="Paste personal access token" value={canvasToken} onChange={(e) => setCanvasToken(e.target.value)} />
                      </label>
                    </div>
                  </div>
                </>
              )}
              {settingsTab === 'sync' && (
                <>
                  <div className="settings-section">
                    <div className="settings-title">Auto-sync</div>
                    <div className="settings-row inline">
                      <label className="field">
                        <span className="label">Enable</span>
                        <select className="input" value={autoSyncEnabled ? 'on' : 'off'} onChange={(e) => setAutoSyncEnabled(e.target.value === 'on')}>
                          <option value="off">Off</option>
                          <option value="on">On</option>
                        </select>
                      </label>
                      <label className="field">
                        <span className="label">Source</span>
                        <select className="input" value={autoSyncSource} onChange={(e) => setAutoSyncSource(e.target.value)}>
                          <option value="ics">ICS URL</option>
                          <option value="api">Canvas API</option>
                        </select>
                      </label>
                      <label className="field">
                        <span className="label">Interval (min)</span>
                        <input className="input" type="number" min="5" step="5" value={autoSyncIntervalMin} onChange={(e) => setAutoSyncIntervalMin(Number(e.target.value)||60)} />
                      </label>
                    </div>
                    <div className="settings-actions">
                      <button className="btn" onClick={syncFromCanvasApi}>Sync via API</button>
                      <button className="btn" onClick={supaSyncTasks}>Sync tasks to cloud</button>
                      <span className="settings-note">Direct connection to Canvas or Supabase. Nothing leaves your browser except the intended API calls.</span>
                    </div>
                    <div className="settings-row">
                      <span className="settings-title">Status</span>
                      <div className="settings-note">{lastSyncStatus || '—'}</div>
                    </div>
                  </div>
                </>
              )}
              <div className="settings-actions">
                <button className="btn btn-ghost" onClick={() => setSettingsOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="fab" aria-label="Create assignment" title="Create Assignment" onClick={beginAdd}>＋</button>

      {/* Bottom-left timer panel */}
      <div ref={timerRef} className={`timer-panel ${timerCollapsed ? 'collapsed' : ''} ${timerDragging ? 'dragging' : ''}`} role="region" aria-label="Focus timer" style={{ transform: `translate(${timerPos.x}px, ${timerPos.y}px)` }} onPointerDown={onTimerPointerDown} onClick={(e)=>{ e.stopPropagation(); }}>
        {(() => {
          const total = Math.max(1, timerMinutes * 60);
          const progressDeg = Math.min(360, Math.max(0, (1 - (timeLeft / total)) * 360));
          return (
            <>
              <div className="timer-circle" style={{ '--p': `${progressDeg}deg` }} onClick={(e)=>{ e.stopPropagation(); setTimerCollapsed(true); }}>
                <div className="timer-time" aria-live="polite">
                  {String(Math.floor(timeLeft/60)).padStart(2,'0')}:{String(timeLeft%60).padStart(2,'0')}
                </div>
              </div>
              {!timerCollapsed && (
                <div className="timer-content">
                  <div className="timer-actions">
                    <button type="button" className="icon-btn" title="Expand panel" onClick={(e)=>{ e.stopPropagation(); setTimerCollapsed(false); }}>▣</button>
                    <button type="button" className="icon-btn" title="Fullscreen" onClick={(e)=>{ e.stopPropagation(); setTimerOpen(true); }}>⤢</button>
                    <button type="button" className="icon-btn" title={timerRunning ? 'Pause' : 'Start'} onClick={() => setTimerRunning(r => !r)}>{timerRunning ? '⏸️' : '▶️'}</button>
                    <button type="button" className="icon-btn" title="Reset" onClick={() => setTimeLeft(timerMinutes * 60)}>⟲</button>
                  </div>
                  <div className="chip-group">
                    {[15, 25, 50].map(m => (
                      <button key={m} type="button" className={`btn btn-ghost chip-btn ${timerMinutes===m?'active':''}`} onClick={() => { setTimerMinutes(m); setTimeLeft(m*60); }}>{m}m</button>
                    ))}
                  </div>
                  <div className="timer-edit-row">
                    <input className="input" type="number" min="1" max="240" value={timerMinutes} onChange={(e)=>{ const v=Math.max(1, Math.min(240, Number(e.target.value)||timerMinutes)); setTimerMinutes(v); setTimeLeft(v*60); }} aria-label="Minutes" placeholder="Minutes" style={{ width: 96 }} />
                  </div>
                </div>
              )}
              {timerCollapsed && (
                <div className="timer-collapsed-actions">
                  <button type="button" className="icon-btn" title="Expand panel" onClick={(e)=>{ e.stopPropagation(); setTimerCollapsed(false); }}>▣</button>
                  <button type="button" className="icon-btn" title="Fullscreen" onClick={(e)=>{ e.stopPropagation(); setTimerOpen(true); }}>⤢</button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {timerOpen && (
        <div className="timer-overlay" role="dialog" aria-modal="true" onClick={() => setTimerOpen(false)}>
          <div className="timer-dialog" onClick={(e)=>e.stopPropagation()}>
            <div className="timer-big-circle" style={{ '--p': `${Math.min(360, Math.max(0, (1 - (timeLeft / Math.max(1,timerMinutes*60))) * 360))}deg` }}>
              <div className="timer-big-time">{String(Math.floor(timeLeft/60)).padStart(2,'0')}:{String(timeLeft%60).padStart(2,'0')}</div>
            </div>
            <div className="timer-big-actions">
              <button className="btn" onClick={()=>setTimerRunning(r=>!r)}>{timerRunning ? 'Pause' : 'Start'}</button>
              <button className="btn btn-ghost" onClick={()=>setTimeLeft(timerMinutes*60)}>Reset</button>
              {[15,25,50].map(m => <button key={m} className={`btn btn-ghost ${timerMinutes===m?'active':''}`} onClick={()=>{ setTimerMinutes(m); setTimeLeft(m*60); }}>{m}m</button>)}
              <input className="input" type="number" min="1" max="240" value={timerMinutes} onChange={(e)=>{ const v=Math.max(1, Math.min(240, Number(e.target.value)||timerMinutes)); setTimerMinutes(v); setTimeLeft(v*60); }} aria-label="Minutes" placeholder="Minutes" style={{ width: 110 }} />
            </div>
            <button className="btn clock-close" onClick={()=>setTimerOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {clockOpen && (
        <div className="clock-overlay" role="dialog" aria-modal="true" onClick={() => setClockOpen(false)}>
          <div className="clock-dialog" onClick={(e)=>e.stopPropagation()}>
            <div className="clock-big-time">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            <div className="clock-big-date">{now.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <button className="btn clock-close" onClick={() => setClockOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}


function TaskCard({ task, onEdit, onDelete, onToggleDone, onStart, onPause, onComplete, subjectColors, onToggleSubtask }) {
  const dueDescriptor = formatDueDescriptor(task.dueAt);
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const dueDateFull = dueDate ? dueDate.toLocaleString() : 'No date';
  const isOverdue = task.status !== 'done' && dueDate && dueDate < new Date();
  const subjectChipStyle = {
    borderColor: '#e2e8f0',
    background: task.subject ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.02)',
    color: subjectColors.get(task.subject) ? subjectColors.get(task.subject) : 'var(--text-dim)'
  };

  return (
    <div className={`card ${isOverdue ? 'card-overdue' : ''}`}>
      <div className="card-main">
        <div className="card-title-row">
          <input type="checkbox" className="checkbox" checked={task.status === 'done'} onChange={(e) => onToggleDone(e.target.checked)} />
          <div className="title-area">
            <div className="title">{task.title}</div>
            <div className="meta">
              {task.subject && (
                <span className="chip subject-chip" style={subjectChipStyle}>{task.subject}</span>
              )}
              <PriorityChip priority={task.priority} />
              <StatusBadge status={task.status} />
            </div>
          </div>
        </div>
        {task.notes && <div className="notes">{task.notes}</div>}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="subtasks">
            {task.subtasks.map(s => (
              <div className="subtask" key={s.id}>
                <input type="checkbox" checked={s.done} onChange={() => onToggleSubtask && onToggleSubtask(s.id)} />
                <span style={{ textDecoration: s.done ? 'line-through' : 'none' }}>{s.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="due-row">
          <div className="due-wrap" tabIndex={0}>
            <span className="due-label" style={{ whiteSpace: 'nowrap' }}>{dueDescriptor}</span>
            {dueDateFull && <div className="due-tooltip">{dueDateFull}</div>}
          </div>
        </div>
      </div>
      <div className="card-actions">
        {task.status === 'in_progress' ? (
          <>
            <button className="btn" onClick={() => onPause(task.id)}>Pause</button>
            <button className="btn" onClick={() => onComplete(task.id)}>Completed</button>
          </>
        ) : (
          <>
            {task.status !== 'done' && (
              <button className="btn" onClick={onStart}>Start</button>
            )}
            <button className="btn btn-ghost" onClick={onEdit}>Edit</button>
            <button className="btn btn-danger" onClick={onDelete}>Delete</button>
          </>
        )}
      </div>
    </div>
  );
}