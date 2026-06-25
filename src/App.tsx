import { useState, useEffect } from 'react';
import { 
  initDefaultHabits, 
  getEntry, 
  saveEntry, 
  getAllEntries, 
  getAllHabits, 
  addHabit, 
  archiveHabit, 
  reactivateHabit, 
  getMonthlyReview, 
  saveMonthlyReview 
} from './utils/db';
import type { DailyEntry, Habit, MonthlyReview as DBMonthlyReview } from './utils/db';
import { Dashboard } from './components/Dashboard';
import { MorningCheckIn } from './components/MorningCheckIn';
import { EveningCheckIn } from './components/EveningCheckIn';
import { HistoryLog } from './components/HistoryLog';
import { MonthlyReview } from './components/MonthlyReview';
import { Settings } from './components/Settings';
import { Home, Calendar, BookOpen, Leaf, Settings as SettingsIcon } from 'lucide-react';

type View = 'dashboard' | 'history' | 'review' | 'morning' | 'evening' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayEntry, setTodayEntry] = useState<DailyEntry | undefined>(undefined);
  const [streak, setStreak] = useState(0);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();

  // Load initial data
  const loadData = async () => {
    await initDefaultHabits();
    const allEntries = await getAllEntries();
    const allHabits = await getAllHabits();
    const today = await getEntry(todayStr);

    setEntries(allEntries);
    setHabits(allHabits);
    setTodayEntry(today);
    setStreak(calculateStreak(allEntries));
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateStreak = (allEntries: DailyEntry[]): number => {
    if (allEntries.length === 0) return 0;

    const checkedDates = new Set(
      allEntries
        .filter(e => e.morning || e.evening)
        .map(e => e.date)
    );

    const getOffsetDateString = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let currentStreak = 0;
    let offset = 0;
    const tStr = getOffsetDateString(0);
    const yStr = getOffsetDateString(1);

    if (!checkedDates.has(tStr) && !checkedDates.has(yStr)) {
      return 0;
    }

    if (checkedDates.has(tStr)) {
      offset = 0;
    } else {
      offset = 1;
    }

    while (true) {
      const checkStr = getOffsetDateString(offset);
      if (checkedDates.has(checkStr)) {
        currentStreak++;
        offset++;
      } else {
        break;
      }
    }

    return currentStreak;
  };

  // Check-In Handlers
  const handleSaveMorning = async (morningData: NonNullable<DailyEntry['morning']>) => {
    const existing = todayEntry || { date: todayStr };
    const updated: DailyEntry = {
      ...existing,
      morning: morningData,
    };
    await saveEntry(updated);
    await loadData();
    setCurrentView('dashboard');
  };

  const handleSaveEvening = async (eveningData: NonNullable<DailyEntry['evening']>) => {
    const existing = todayEntry || { date: todayStr };
    const updated: DailyEntry = {
      ...existing,
      evening: eveningData,
    };
    await saveEntry(updated);
    await loadData();
    setCurrentView('dashboard');
  };

  // Habits Management Handlers
  const handleAddHabit = async (name: string) => {
    await addHabit(name);
    const allHabits = await getAllHabits();
    setHabits(allHabits);
  };

  const handleArchiveHabit = async (id: string) => {
    await archiveHabit(id);
    const allHabits = await getAllHabits();
    setHabits(allHabits);
  };

  const handleReactivateHabit = async (id: string) => {
    await reactivateHabit(id);
    const allHabits = await getAllHabits();
    setHabits(allHabits);
  };

  // Goals Review Handlers
  const handleSaveMonthlyReview = async (review: DBMonthlyReview) => {
    await saveMonthlyReview(review);
  };

  const handleGetMonthlyReview = async (month: string) => {
    return await getMonthlyReview(month);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            todayEntry={todayEntry} 
            streak={streak} 
            onNavigate={(view) => setCurrentView(view as View)}
          />
        );
      case 'morning':
        return (
          <MorningCheckIn 
            initialEntry={todayEntry} 
            onSave={handleSaveMorning} 
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      case 'evening':
        return (
          <EveningCheckIn 
            initialEntry={todayEntry} 
            activeHabits={habits.filter(h => h.active)} 
            onSave={handleSaveEvening} 
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      case 'history':
        return <HistoryLog entries={entries} />;
      case 'review':
        return (
          <MonthlyReview 
            entries={entries} 
            allHabits={habits}
            onAddHabit={handleAddHabit}
            onArchiveHabit={handleArchiveHabit}
            onReactivateHabit={handleReactivateHabit}
            onSaveMonthlyReview={handleSaveMonthlyReview}
            getMonthlyReviewFromDB={handleGetMonthlyReview}
          />
        );
      case 'settings':
        return (
          <Settings 
            onBack={() => setCurrentView('dashboard')}
            onImportSuccess={loadData}
          />
        );
      default:
        return <div>View nicht gefunden.</div>;
    }
  };

  const isFormView = currentView === 'morning' || currentView === 'evening' || currentView === 'settings';

  return (
    <div className="app-container">
      {/* Sticky App Header */}
      <header className="app-header">
        <div className="brand" onClick={() => setCurrentView('dashboard')} style={{ cursor: 'pointer' }}>
          <Leaf className="brand-icon" strokeWidth={2.5} />
          <h1 className="brand-title">Rooted</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
            selbstreflektion
          </div>
          <button 
            onClick={() => setCurrentView('settings')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: currentView === 'settings' ? 'var(--clay)' : 'var(--text-muted)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              transition: 'var(--transition-smooth)'
            }}
            title="Einstellungen"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      {/* Main content scroll area */}
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Bottom Nav Bar (hidden in form views for focus) */}
      {!isFormView && (
        <nav className="bottom-nav">
          <button 
            onClick={() => setCurrentView('dashboard')} 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          >
            <Home className="nav-icon" />
            <span>Journal</span>
          </button>
          <button 
            onClick={() => setCurrentView('history')} 
            className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
          >
            <BookOpen className="nav-icon" />
            <span>Reise</span>
          </button>
          <button 
            onClick={() => setCurrentView('review')} 
            className={`nav-item ${currentView === 'review' ? 'active' : ''}`}
          >
            <Calendar className="nav-icon" />
            <span>Rückblick</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
