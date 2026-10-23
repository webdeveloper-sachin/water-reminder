import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  BellOff,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Droplet,
  Droplets,
  GlassWater,
  Goal,
  History,
  Minus,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Waves,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'hydro-tracker-v1';

const DEFAULT_STATE = {
  goal: 2500,
  reminderInterval: 45,
  remindersEnabled: false,
  entries: [],
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      goal: Number(parsed.goal) > 0 ? Number(parsed.goal) : DEFAULT_STATE.goal,
      reminderInterval: [30, 45, 60].includes(Number(parsed.reminderInterval))
        ? Number(parsed.reminderInterval)
        : DEFAULT_STATE.reminderInterval,
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.filter(
            (entry) =>
              entry &&
              typeof entry.id === 'string' &&
              Number(entry.amount) > 0 &&
              typeof entry.timestamp === 'string'
          )
        : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(key) {
  const today = localDateKey();
  const yesterday = localDateKey(new Date(Date.now() - 86400000));
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return new Date(`${key}T12:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function App() {
  const [saved, setSaved] = useState(readSavedState);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customAmount, setCustomAmount] = useState('200');
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState('');
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [now, setNow] = useState(new Date());

  const todayKey = localDateKey(now);
  const todayEntries = useMemo(
    () =>
      saved.entries
        .filter((entry) => localDateKey(new Date(entry.timestamp)) === todayKey)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [saved.entries, todayKey]
  );
  const consumed = todayEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const remaining = Math.max(saved.goal - consumed, 0);
  const progress = Math.min((consumed / saved.goal) * 100, 100);
  const completed = consumed >= saved.goal;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      setNotice('Could not save data. Check whether browser storage is available.');
    }
  }, [saved]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Reminder timer runs while this page is open. Browsers may throttle timers in background tabs.
  useEffect(() => {
    if (!saved.remindersEnabled || permission !== 'granted') return undefined;
    const intervalMs = saved.reminderInterval * 60 * 1000;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        new Notification('Time for a water break 💧', {
          body: 'Take a few sips of water and keep your hydration routine going.',
          icon: '/water-icon.svg',
          tag: 'hydro-water-reminder',
        });
      } else {
        // Notification can still appear while the tab is hidden, but the timer may be throttled.
        new Notification('Time for a water break 💧', {
          body: 'Take a few sips of water and keep your hydration routine going.',
          icon: '/water-icon.svg',
          tag: 'hydro-water-reminder',
        });
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [saved.remindersEnabled, saved.reminderInterval, permission]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function updateSaved(patch) {
    setSaved((current) => ({ ...current, ...patch }));
  }

  function addWater(amount) {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 5000) {
      setNotice('Enter an amount between 1 and 5000 ml.');
      return;
    }
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: Math.round(parsed),
      timestamp: new Date().toISOString(),
    };
    setSaved((current) => ({ ...current, entries: [...current.entries, entry] }));
    setNotice(`${Math.round(parsed)} ml added to your daily total.`);
  }

  function deleteEntry(id) {
    setSaved((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }));
    setNotice('Water entry deleted.');
  }

  async function enableReminders() {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      setNotice('This browser does not support notifications.');
      return;
    }
    if (!window.isSecureContext) {
      setNotice('Notifications require localhost or a secure HTTPS website.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        updateSaved({ remindersEnabled: true });
        new Notification('Hydro reminders are on 💧', {
          body: `We'll remind you every ${saved.reminderInterval} minutes while the app is running.`,
        });
        setNotice('Reminders enabled.');
      } else {
        updateSaved({ remindersEnabled: false });
        setNotice('Notification permission was not granted. Check browser site settings.');
      }
    } catch {
      setNotice('Could not request notification permission in this browser.');
    }
  }

  function toggleReminders() {
    if (saved.remindersEnabled) {
      updateSaved({ remindersEnabled: false });
      setNotice('Reminders paused.');
    } else if (permission === 'granted') {
      updateSaved({ remindersEnabled: true });
      setNotice('Reminders resumed.');
    } else {
      enableReminders();
    }
  }

  const groupedHistory = useMemo(() => {
    const groups = new Map();
    [...saved.entries]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .forEach((entry) => {
        const key = localDateKey(new Date(entry.timestamp));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry);
      });
    return [...groups.entries()].map(([date, entries]) => ({
      date,
      entries,
      total: entries.reduce((sum, entry) => sum + Number(entry.amount), 0),
    }));
  }, [saved.entries]);

  const weekData = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const key = localDateKey(date);
      const total = saved.entries
        .filter((entry) => localDateKey(new Date(entry.timestamp)) === key)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      return {
        key,
        label: date.toLocaleDateString([], { weekday: 'short' }),
        total,
        percent: Math.min((total / saved.goal) * 100, 100),
        isToday: key === localDateKey(),
      };
    });
  }, [saved.entries, saved.goal]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Droplets size={23} />
          </div>
          <span>
            hydro<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity size={18} /> Dashboard
          </button>
          <button
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={18} /> Water history
          </button>
          <button
            className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            <TrendingUp size={18} /> Insights
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <Sparkles size={17} />
            </div>
            <strong>Small sips, big habits.</strong>
            <p>Consistency matters more than drinking a lot at once.</p>
          </div>
          <button className="nav-item settings-link" onClick={() => setShowSettings(true)}>
            <Settings size={18} /> Settings
          </button>
          <div className="local-badge">
            <ShieldCheck size={15} /> Stored on this device
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark">
              <Droplets size={20} />
            </div>
            <span>
              hydro<span className="brand-dot">.</span>
            </span>
          </div>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>
              {activeTab === 'dashboard'
                ? 'Dashboard'
                : activeTab === 'history'
                  ? 'Water history'
                  : 'Insights'}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="date-pill">
              <CalendarDays size={15} />{' '}
              {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <button
              className={`icon-button ${saved.remindersEnabled ? 'notification-on' : ''}`}
              title={saved.remindersEnabled ? 'Pause reminders' : 'Enable reminders'}
              onClick={toggleReminders}
            >
              {saved.remindersEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
            <button
              className="avatar"
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
            >
              H
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <section className="welcome-row">
              <div>
                <div className="eyebrow">
                  <Waves size={15} /> YOUR DAILY HYDRATION
                </div>
                <h1>
                  Stay hydrated, <span>feel great.</span>
                </h1>
                <p className="subtitle">A little water goes a long way. Keep your day flowing.</p>
              </div>
              <button className="outline-button" onClick={() => setShowSettings(true)}>
                <Settings size={16} /> Customize goal
              </button>
            </section>

            <section className="stats-grid">
              <article className="card progress-card">
                <div className="card-heading">
                  <div>
                    <div className="eyebrow muted">DAILY PROGRESS</div>
                    <h2>{completed ? 'Goal reached!' : "You're doing great"}</h2>
                  </div>
                  <div className="soft-icon blue">
                    <Target size={20} />
                  </div>
                </div>
                <div className="progress-layout">
                  <div className="progress-ring" style={{ '--progress': `${progress}%` }}>
                    <div className="ring-inner">
                      <Droplet size={22} fill="#2f75f5" color="#2f75f5" />
                      <strong>
                        {Math.round(progress)}
                        <small>%</small>
                      </strong>
                      <span>completed</span>
                    </div>
                  </div>
                  <div className="progress-numbers">
                    <div className="number-block">
                      <span className="number-label">
                        <span className="legend-dot blue-dot"></span>Drank today
                      </span>
                      <strong>
                        {consumed.toLocaleString()} <small>ml</small>
                      </strong>
                    </div>
                    <div className="number-block">
                      <span className="number-label">
                        <span className="legend-dot pale-dot"></span>Daily goal
                      </span>
                      <strong>
                        {saved.goal.toLocaleString()} <small>ml</small>
                      </strong>
                    </div>
                    <div className="remaining-box">
                      <div className="remaining-icon">
                        <GlassWater size={17} />
                      </div>
                      <div>
                        <span>{completed ? 'Goal exceeded by' : 'Still to go'}</span>
                        <strong>
                          {completed
                            ? (consumed - saved.goal).toLocaleString()
                            : remaining.toLocaleString()}{' '}
                          ml
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="progress-footer">
                  <span>
                    {completed
                      ? 'Amazing work — keep listening to your thirst.'
                      : `${todayEntries.length} ${todayEntries.length === 1 ? 'drink' : 'drinks'} logged today`}
                  </span>
                  <span>
                    {Math.round(consumed / 250)} glasses <small>· 250 ml each</small>
                  </span>
                </div>
              </article>

              <article className="card quick-card">
                <div className="card-heading">
                  <div>
                    <div className="eyebrow muted">QUICK LOG</div>
                    <h2>Add a drink</h2>
                  </div>
                  <div className="soft-icon cyan">
                    <Plus size={20} />
                  </div>
                </div>
                <p className="card-description">How much water did you just drink?</p>
                <div className="quick-options">
                  {[150, 250, 500].map((amount) => (
                    <button key={amount} className="quick-option" onClick={() => addWater(amount)}>
                      <span className="glass-illustration">
                        <GlassWater size={23} />
                      </span>
                      <strong>{amount}</strong>
                      <span>ml</span>
                      <span className="quick-plus">
                        <Plus size={14} />
                      </span>
                    </button>
                  ))}
                </div>
                <form
                  className="custom-entry"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addWater(customAmount);
                  }}
                >
                  <label htmlFor="custom-amount">Custom amount</label>
                  <div className="custom-input-row">
                    <input
                      id="custom-amount"
                      type="number"
                      min="1"
                      max="5000"
                      step="1"
                      value={customAmount}
                      onChange={(event) => setCustomAmount(event.target.value)}
                    />
                    <span>ml</span>
                    <button type="submit" className="primary-button">
                      <Plus size={16} /> Add water
                    </button>
                  </div>
                </form>
              </article>
            </section>

            <section className="lower-grid">
              <article className="card activity-card">
                <div className="section-heading">
                  <div>
                    <h2>Today's activity</h2>
                    <p>Your latest water entries</p>
                  </div>
                  <button className="text-button" onClick={() => setActiveTab('history')}>
                    View history <ChevronDown size={15} className="rotate-left" />
                  </button>
                </div>
                {todayEntries.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <GlassWater size={25} />
                    </div>
                    <strong>Your first glass is waiting</strong>
                    <span>Add a drink above to start tracking your day.</span>
                  </div>
                ) : (
                  <div className="entry-list">
                    {todayEntries.slice(0, 5).map((entry) => (
                      <div className="entry-row" key={entry.id}>
                        <div className="entry-icon">
                          <Droplet size={17} />
                        </div>
                        <div className="entry-info">
                          <strong>Water</strong>
                          <span>
                            <Clock3 size={13} /> {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        <strong className="entry-amount">
                          +{entry.amount} <small>ml</small>
                        </strong>
                        <button
                          className="delete-button"
                          title="Delete entry"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="card reminder-card">
                <div className="section-heading">
                  <div>
                    <h2>Water reminders</h2>
                    <p>Build a gentle routine</p>
                  </div>
                  <div className={`status-dot ${saved.remindersEnabled ? 'on' : ''}`}></div>
                </div>
                <div className="reminder-visual">
                  <div className="reminder-circle">
                    <Bell size={27} />
                  </div>
                  <div className="reminder-spark spark-one">✦</div>
                  <div className="reminder-spark spark-two">✦</div>
                </div>
                <div className="reminder-status">
                  <strong>{saved.remindersEnabled ? 'Reminders are on' : 'Stay on track'}</strong>
                  <span>
                    {saved.remindersEnabled
                      ? `Every ${saved.reminderInterval} minutes`
                      : 'Get a nudge to take a water break.'}
                  </span>
                </div>
                <button
                  className={`reminder-button ${saved.remindersEnabled ? 'pause' : ''}`}
                  onClick={toggleReminders}
                >
                  {saved.remindersEnabled ? (
                    <>
                      <BellOff size={16} /> Pause reminders
                    </>
                  ) : (
                    <>
                      <Bell size={16} /> Enable reminders
                    </>
                  )}
                </button>
                {permission === 'denied' && (
                  <p className="permission-note">Notifications are blocked in browser settings.</p>
                )}
                {permission === 'unsupported' && (
                  <p className="permission-note">Notifications aren't supported by this browser.</p>
                )}
              </article>
            </section>
          </>
        )}

        {activeTab === 'history' && (
          <section className="page-section">
            <div className="welcome-row">
              <div>
                <div className="eyebrow">
                  <History size={15} /> YOUR JOURNEY
                </div>
                <h1>
                  Water <span>history.</span>
                </h1>
                <p className="subtitle">Every glass counts. Review your logged water intake.</p>
              </div>
            </div>
            <div className="history-summary-grid">
              <div className="card mini-stat">
                <span>Total entries</span>
                <strong>{saved.entries.length}</strong>
                <small>All-time logged drinks</small>
              </div>
              <div className="card mini-stat">
                <span>Today's intake</span>
                <strong>
                  {consumed.toLocaleString()} <small>ml</small>
                </strong>
                <small>{Math.round(progress)}% of daily goal</small>
              </div>
              <div className="card mini-stat">
                <span>Daily target</span>
                <strong>
                  {saved.goal.toLocaleString()} <small>ml</small>
                </strong>
                <small>Customize in settings</small>
              </div>
            </div>
            <div className="card history-card">
              <div className="section-heading">
                <div>
                  <h2>All entries</h2>
                  <p>Newest entries first</p>
                </div>
                <span className="count-pill">{saved.entries.length} records</span>
              </div>
              {groupedHistory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <History size={25} />
                  </div>
                  <strong>No history yet</strong>
                  <span>Log your first drink on the dashboard.</span>
                  <button className="primary-button" onClick={() => setActiveTab('dashboard')}>
                    Go to dashboard
                  </button>
                </div>
              ) : (
                groupedHistory.map((group) => (
                  <div className="history-group" key={group.date}>
                    <div className="history-date-row">
                      <div>
                        <strong>{formatDateLabel(group.date)}</strong>
                        <span>
                          {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                      <strong>
                        {group.total.toLocaleString()} <small>ml</small>
                      </strong>
                    </div>
                    {group.entries.map((entry) => (
                      <div className="entry-row history-entry" key={entry.id}>
                        <div className="entry-icon">
                          <Droplet size={17} />
                        </div>
                        <div className="entry-info">
                          <strong>Water</strong>
                          <span>
                            <Clock3 size={13} /> {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        <strong className="entry-amount">
                          +{entry.amount} <small>ml</small>
                        </strong>
                        <button
                          className="delete-button"
                          title="Delete entry"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            {saved.entries.length > 0 && (
              <button
                className="danger-outline"
                onClick={() => {
                  if (window.confirm('Delete all water history? This cannot be undone.')) {
                    updateSaved({ entries: [] });
                    setNotice('All history cleared.');
                  }
                }}
              >
                <Trash2 size={16} /> Clear all history
              </button>
            )}
          </section>
        )}

        {activeTab === 'insights' && (
          <section className="page-section">
            <div className="welcome-row">
              <div>
                <div className="eyebrow">
                  <TrendingUp size={15} /> YOUR PROGRESS
                </div>
                <h1>
                  Little habits, <span>big wins.</span>
                </h1>
                <p className="subtitle">A look at your water intake over the last seven days.</p>
              </div>
            </div>
            <div className="insight-grid">
              <div className="card mini-stat">
                <span>7-day average</span>
                <strong>
                  {Math.round(
                    weekData.reduce((sum, day) => sum + day.total, 0) / 7
                  ).toLocaleString()}{' '}
                  <small>ml</small>
                </strong>
                <small>Daily average, last 7 days</small>
              </div>
              <div className="card mini-stat">
                <span>Goal days</span>
                <strong>
                  {weekData.filter((day) => day.total >= saved.goal).length}
                  <small> / 7</small>
                </strong>
                <small>Days meeting your current goal</small>
              </div>
            </div>
            <div className="card chart-card">
              <div className="section-heading">
                <div>
                  <h2>Last 7 days</h2>
                  <p>Daily water intake compared with your {saved.goal.toLocaleString()} ml goal</p>
                </div>
                <span className="chart-legend">
                  <span></span> Water intake
                </span>
              </div>
              <div className="bar-chart">
                {weekData.map((day) => (
                  <div className="bar-column" key={day.key}>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${day.isToday ? 'today' : ''}`}
                        style={{ height: `${Math.max(day.percent, day.total > 0 ? 3 : 0)}%` }}
                        title={`${day.total} ml`}
                      ></div>
                    </div>
                    <strong>{day.total ? `${(day.total / 1000).toFixed(1)}` : '—'}</strong>
                    <span className={day.isToday ? 'today-label' : ''}>{day.label}</span>
                  </div>
                ))}
              </div>
              <div className="chart-footnote">
                <Target size={15} /> Daily goal: {saved.goal.toLocaleString()} ml <span>·</span>{' '}
                History is stored locally in this browser.
              </div>
            </div>
            <div className="card insight-tip">
              <div className="tip-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <strong>Keep it sustainable</strong>
                <p>
                  Use reminders as gentle prompts, drink according to thirst and activity, and avoid
                  forcing large amounts of water at once.
                </p>
              </div>
            </div>
          </section>
        )}

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} Hydro Tracker</span>
          <span>
            <ShieldCheck size={14} /> Your data stays in this browser
          </span>
        </footer>
      </main>

      {showSettings && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowSettings(false);
          }}
        >
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow muted">
                  <Settings size={14} /> PREFERENCES
                </div>
                <h2 id="settings-title">Settings</h2>
                <p>Make Hydro work for your routine.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                <X size={19} />
              </button>
            </div>
            <div className="setting-block">
              <label htmlFor="goal-select">Daily water goal</label>
              <p>Choose a daily target in millilitres.</p>
              <select
                id="goal-select"
                value={saved.goal}
                onChange={(event) => updateSaved({ goal: Number(event.target.value) })}
              >
                <option value="1500">1,500 ml</option>
                <option value="2000">2,000 ml</option>
                <option value="2500">2,500 ml (recommended starting point)</option>
                <option value="3000">3,000 ml</option>
                <option value="3500">3,500 ml</option>
                <option value="4000">4,000 ml</option>
              </select>
              <div className="setting-help">
                <Goal size={15} /> This is a personal tracking target, not a medical prescription.
              </div>
            </div>
            <div className="setting-block">
              <label htmlFor="interval-select">Reminder interval</label>
              <p>How often would you like a hydration nudge?</p>
              <select
                id="interval-select"
                value={saved.reminderInterval}
                onChange={(event) => updateSaved({ reminderInterval: Number(event.target.value) })}
              >
                <option value="30">Every 30 minutes</option>
                <option value="45">Every 45 minutes</option>
                <option value="60">Every 60 minutes</option>
              </select>
            </div>
            <div className="setting-block reminder-setting">
              <div className="setting-toggle-copy">
                <div>
                  <label>Browser notifications</label>
                  <p>
                    {saved.remindersEnabled
                      ? 'Reminders are currently enabled.'
                      : 'Receive reminders while the app is running.'}
                  </p>
                </div>
                <button
                  className={`toggle ${saved.remindersEnabled ? 'checked' : ''}`}
                  role="switch"
                  aria-checked={saved.remindersEnabled}
                  onClick={toggleReminders}
                >
                  <span />
                </button>
              </div>
              <div className="setting-help">
                <ShieldCheck size={15} /> Permission status:{' '}
                {permission === 'granted'
                  ? 'Allowed'
                  : permission === 'denied'
                    ? 'Blocked in browser'
                    : permission === 'unsupported'
                      ? 'Not supported'
                      : 'Not requested'}
              </div>
            </div>
            <div className="storage-info">
              <div className="storage-icon">
                <ShieldCheck size={19} />
              </div>
              <div>
                <strong>Private by default</strong>
                <p>
                  Your entries and settings are saved in localStorage on this device. Clearing
                  browser data can remove them.
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="outline-button"
                onClick={() => {
                  if (
                    window.confirm('Reset settings to defaults? Your water history will remain.')
                  ) {
                    updateSaved({ goal: 2500, reminderInterval: 45, remindersEnabled: false });
                    setNotice('Settings reset.');
                  }
                }}
              >
                Reset settings
              </button>
              <button className="primary-button" onClick={() => setShowSettings(false)}>
                <Check size={16} /> Done
              </button>
            </div>
          </section>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} /> {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss message">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
