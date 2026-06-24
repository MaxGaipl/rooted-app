import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Plus, Archive, RefreshCw, BarChart2, Target, Heart } from 'lucide-react';
import type { DailyEntry, Habit, MonthlyReview as DBMonthlyReview, MonthlyGoal } from '../utils/db';

interface MonthlyReviewProps {
  entries: DailyEntry[];
  allHabits: Habit[];
  onAddHabit: (name: string) => Promise<void>;
  onArchiveHabit: (id: string) => Promise<void>;
  onReactivateHabit: (id: string) => Promise<void>;
  onSaveMonthlyReview: (review: DBMonthlyReview) => Promise<void>;
  getMonthlyReviewFromDB: (month: string) => Promise<DBMonthlyReview | undefined>;
}

export const MonthlyReview: React.FC<MonthlyReviewProps> = ({
  entries,
  allHabits,
  onAddHabit,
  onArchiveHabit,
  onReactivateHabit,
  onSaveMonthlyReview,
  getMonthlyReviewFromDB,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [newHabitName, setNewHabitName] = useState('');
  const [showHabitManager, setShowHabitManager] = useState(false);
  
  // Goals State
  const [monthlyReviewData, setMonthlyReviewData] = useState<DBMonthlyReview | null>(null);
  const [newGoalText, setNewGoalText] = useState('');
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  const getMonthKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const selectedMonthKey = getMonthKey(currentMonthDate); // YYYY-MM

  // Fetch Monthly Review Data (Goals) from DB
  useEffect(() => {
    const fetchReview = async () => {
      const data = await getMonthlyReviewFromDB(selectedMonthKey);
      if (data) {
        setMonthlyReviewData(data);
      } else {
        setMonthlyReviewData({
          month: selectedMonthKey,
          goals: []
        });
      }
    };
    fetchReview();
    setIsEditingGoals(false);
  }, [selectedMonthKey, getMonthlyReviewFromDB]);

  // Filter entries for the selected month
  const monthEntries = entries.filter((e) => e.date.startsWith(selectedMonthKey));

  // Navigate months
  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.setMonth(currentMonthDate.getMonth() - 1)));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.setMonth(currentMonthDate.getMonth() + 1)));
  };

  const formatMonthName = () => {
    return currentMonthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  // --- STATS CALCULATIONS ---
  const totalDays = monthEntries.length;
  
  // Mood and Energy calculations
  const moodEntries = monthEntries.filter(e => !!e.evening?.mood);
  const avgMood = moodEntries.length 
    ? (moodEntries.reduce((sum, e) => sum + (e.evening?.mood || 0), 0) / moodEntries.length).toFixed(1)
    : '0';

  const energyEntries = monthEntries.filter(e => !!e.morning?.energy);
  const avgEnergy = energyEntries.length 
    ? (energyEntries.reduce((sum, e) => sum + (e.morning?.energy || 0), 0) / energyEntries.length).toFixed(1)
    : '0';

  // Habits calculations
  const activeHabits = allHabits.filter(h => h.active || (h.archivedAt && getMonthKey(new Date(h.archivedAt)) >= selectedMonthKey));
  const habitStats = activeHabits.map(habit => {
    let completedCount = 0;
    monthEntries.forEach(entry => {
      if (entry.evening?.habits?.[habit.id]) {
        completedCount++;
      }
    });
    const percentage = totalDays ? Math.round((completedCount / totalDays) * 100) : 0;
    return {
      ...habit,
      completedCount,
      percentage
    };
  });

  // Social stats
  const socialCounts = { restorative: 0, neutral: 0, draining: 0, none: 0 };
  let socialTotal = 0;
  monthEntries.forEach(e => {
    if (e.evening?.social) {
      socialCounts[e.evening.social]++;
      socialTotal++;
    }
  });

  // Add a new habit
  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    await onAddHabit(newHabitName.trim());
    setNewHabitName('');
  };

  // --- GOALS HANDLERS ---
  const handleAddGoal = () => {
    if (!newGoalText.trim() || !monthlyReviewData) return;
    const newGoal: MonthlyGoal = {
      id: 'g_' + Math.random().toString(36).substring(2, 11),
      text: newGoalText.trim(),
      achieved: null
    };
    const updated = {
      ...monthlyReviewData,
      goals: [...monthlyReviewData.goals, newGoal]
    };
    setMonthlyReviewData(updated);
    onSaveMonthlyReview(updated);
    setNewGoalText('');
  };

  const handleToggleGoalAchieved = (goalId: string, status: boolean | null) => {
    if (!monthlyReviewData) return;
    const updatedGoals = monthlyReviewData.goals.map(g => {
      if (g.id === goalId) {
        return { ...g, achieved: status };
      }
      return g;
    });
    const updated = { ...monthlyReviewData, goals: updatedGoals };
    setMonthlyReviewData(updated);
    onSaveMonthlyReview(updated);
  };

  const handleRemoveGoal = (goalId: string) => {
    if (!monthlyReviewData) return;
    const updatedGoals = monthlyReviewData.goals.filter(g => g.id !== goalId);
    const updated = { ...monthlyReviewData, goals: updatedGoals };
    setMonthlyReviewData(updated);
    onSaveMonthlyReview(updated);
  };

  // --- SVG CHART RENDERING ---
  const renderSVGChart = () => {
    if (totalDays === 0) {
      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
          Keine Daten für diesen Monat vorhanden.
        </div>
      );
    }

    // Sort entries by date ascending
    const sorted = [...monthEntries].sort((a, b) => a.date.localeCompare(b.date));
    const width = 400;
    const height = 150;
    const padding = 20;

    const pointsCount = sorted.length;
    const getX = (index: number) => {
      if (pointsCount <= 1) return width / 2;
      return padding + (index * (width - 2 * padding)) / (pointsCount - 1);
    };

    // Y values: 1 is bottom, 5 is top
    const getY = (val: number) => {
      return height - padding - ((val - 1) * (height - 2 * padding)) / 4;
    };

    // Generate path definition strings
    let moodPath = '';
    let energyPath = '';
    
    let moodPoints: {x: number, y: number}[] = [];
    let energyPoints: {x: number, y: number}[] = [];

    sorted.forEach((entry, idx) => {
      const x = getX(idx);
      if (entry.evening?.mood) {
        const y = getY(entry.evening.mood);
        moodPoints.push({ x, y });
      }
      if (entry.morning?.energy) {
        const y = getY(entry.morning.energy);
        energyPoints.push({ x, y });
      }
    });

    if (moodPoints.length > 0) {
      moodPath = `M ${moodPoints[0].x} ${moodPoints[0].y} ` + 
        moodPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }
    if (energyPoints.length > 0) {
      energyPath = `M ${energyPoints[0].x} ${energyPoints[0].y} ` + 
        energyPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
        {/* Horizontal grid lines */}
        {[1, 2, 3, 4, 5].map(lvl => (
          <line 
            key={lvl}
            x1={padding} 
            y1={getY(lvl)} 
            x2={width - padding} 
            y2={getY(lvl)} 
            className="chart-grid" 
          />
        ))}

        {/* Y-axis Labels */}
        <text x={padding - 5} y={getY(5) + 3} textAnchor="end" className="chart-label">5</text>
        <text x={padding - 5} y={getY(3) + 3} textAnchor="end" className="chart-label">3</text>
        <text x={padding - 5} y={getY(1) + 3} textAnchor="end" className="chart-label">1</text>

        {/* Date labels at bottom (start and end) */}
        {sorted.length > 0 && (
          <>
            <text x={padding} y={height - 2} textAnchor="start" className="chart-label">
              {sorted[0].date.split('-')[2]}.
            </text>
            <text x={width - padding} y={height - 2} textAnchor="end" className="chart-label">
              {sorted[sorted.length - 1].date.split('-')[2]}.
            </text>
          </>
        )}

        {/* Energy path (moss green, thinner/background) */}
        {energyPath && (
          <path 
            d={energyPath} 
            className="chart-line chart-line-energy" 
            style={{ opacity: 0.6, strokeWidth: 2 }}
          />
        )}

        {/* Mood path (clay terracotta, thicker) */}
        {moodPath && (
          <path 
            d={moodPath} 
            className="chart-line chart-line-mood" 
          />
        )}

        {/* Mood data points */}
        {moodPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--clay)" />
        ))}
      </svg>
    );
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px' }}>
      {/* Month Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'space-between' }}>
        <button onClick={prevMonth} className="btn btn-secondary" style={{ padding: '8px 12px', width: 'auto', borderRadius: '12px' }}>
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={20} color="var(--clay)" />
          {formatMonthName()}
        </h2>
        <button 
          onClick={nextMonth} 
          disabled={selectedMonthKey >= getMonthKey(new Date())}
          className="btn btn-secondary" 
          style={{ padding: '8px 12px', width: 'auto', borderRadius: '12px' }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* --- MONTHLY STATISTICS CARD --- */}
      <div className="card">
        <h3 className="card-title">
          <BarChart2 size={18} color="var(--clay)" />
          Monats-Auswertung
        </h3>
        <p className="card-subtitle">{totalDays} Tage aufgezeichnet</p>

        {totalDays > 0 ? (
          <div>
            {/* Mood/Energy averages */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Mittlere Stimmung</span>
                <span style={{ fontSize: '1.6rem', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--clay)' }}>
                  {avgMood} / 5.0
                </span>
              </div>
              <div style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Mittleres Energielevel</span>
                <span style={{ fontSize: '1.6rem', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--sage)' }}>
                  {avgEnergy} / 5.0
                </span>
              </div>
            </div>

            {/* Trends Chart */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 10, height: 3, backgroundColor: 'var(--clay)', borderRadius: '1px', display: 'inline-block' }}></span>
                  Stimmung
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 10, height: 3, backgroundColor: 'var(--moss)', borderRadius: '1px', display: 'inline-block' }}></span>
                  Energie
                </span>
              </p>
              <div className="chart-container" style={{ backgroundColor: 'var(--bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '10px' }}>
                {renderSVGChart()}
              </div>
            </div>

            {/* Social Connection Summary */}
            {socialTotal > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={14} color="var(--clay)" />
                  Soziales Befinden
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {socialCounts.restorative > 0 && (
                    <span className="badge badge-energy" style={{ padding: '4px 10px', borderRadius: '8px' }}>
                      {socialCounts.restorative}x Nährend
                    </span>
                  )}
                  {socialCounts.neutral > 0 && (
                    <span className="badge" style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                      {socialCounts.neutral}x Neutral
                    </span>
                  )}
                  {socialCounts.draining > 0 && (
                    <span className="badge badge-mood" style={{ padding: '4px 10px', borderRadius: '8px' }}>
                      {socialCounts.draining}x Zehrend
                    </span>
                  )}
                  {socialCounts.none > 0 && (
                    <span className="badge" style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      {socialCounts.none}x Allein
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Noch keine Einträge vorhanden. Starte deinen Daily Check-in!
          </div>
        )}
      </div>

      {/* --- GOALS CARD --- */}
      <div className="card">
        <h3 className="card-title">
          <Target size={18} color="var(--clay)" />
          Ziele für {formatMonthName()}
        </h3>
        <p className="card-subtitle">Setze und bewerte deine mittelfristigen Ziele.</p>

        {/* Goals list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {monthlyReviewData?.goals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '10px 0' }}>
              Keine Ziele für diesen Monat definiert.
            </p>
          ) : (
            monthlyReviewData?.goals.map((goal) => (
              <div 
                key={goal.id} 
                style={{ 
                  padding: '14px', 
                  backgroundColor: 'var(--bg-color)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: 500,
                    textDecoration: goal.achieved === true ? 'line-through' : 'none',
                    color: goal.achieved === true ? 'var(--text-muted)' : 'var(--text-main)',
                    flex: 1,
                    marginRight: '12px'
                  }}>
                    {goal.text}
                  </span>
                  
                  {isEditingGoals && (
                    <button 
                      onClick={() => handleRemoveGoal(goal.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--alert-red)', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Entfernen
                    </button>
                  )}
                </div>

                {/* Achieved Toggle Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleToggleGoalAchieved(goal.id, true)}
                    className={`bubble-btn ${goal.achieved === true ? 'active' : ''}`}
                    style={{ 
                      padding: '4px 10px', 
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: goal.achieved === true ? 'var(--moss-light)' : '',
                      borderColor: goal.achieved === true ? 'var(--moss)' : '',
                      color: goal.achieved === true ? 'var(--sage)' : ''
                    }}
                  >
                    <CheckCircle2 size={12} />
                    Erreicht
                  </button>
                  <button
                    onClick={() => handleToggleGoalAchieved(goal.id, false)}
                    className={`bubble-btn ${goal.achieved === false ? 'active' : ''}`}
                    style={{ 
                      padding: '4px 10px', 
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: goal.achieved === false ? 'rgba(204, 92, 92, 0.15)' : '',
                      borderColor: goal.achieved === false ? 'var(--alert-red)' : '',
                      color: goal.achieved === false ? 'var(--alert-red)' : ''
                    }}
                  >
                    <XCircle size={12} />
                    Nicht erreicht
                  </button>
                  <button
                    onClick={() => handleToggleGoalAchieved(goal.id, null)}
                    className={`bubble-btn ${goal.achieved === null ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    Offen
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add goal form */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            placeholder="Neues Monatsziel definieren..."
            className="text-input"
            style={{ borderRadius: '12px', fontSize: '0.9rem' }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
          />
          <button 
            onClick={handleAddGoal}
            className="btn btn-primary"
            style={{ width: 'auto', padding: '10px 14px', borderRadius: '12px' }}
          >
            <Plus size={18} />
          </button>
        </div>

        {monthlyReviewData?.goals && monthlyReviewData.goals.length > 0 && (
          <button
            onClick={() => setIsEditingGoals(!isEditingGoals)}
            className="btn btn-secondary"
            style={{ 
              marginTop: '12px', 
              padding: '6px 12px', 
              fontSize: '0.8rem', 
              borderRadius: '8px',
              width: 'auto'
            }}
          >
            {isEditingGoals ? 'Bearbeiten beenden' : 'Ziele aufräumen'}
          </button>
        )}
      </div>

      {/* --- HABIT MANAGER CARD --- */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="card-title" style={{ marginBottom: 0 }}>
            <Heart size={18} color="var(--clay)" />
            Gewohnheiten (Habits)
          </h3>
          <button
            onClick={() => setShowHabitManager(!showHabitManager)}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem' }}
          >
            {showHabitManager ? 'Schließen' : 'Verwalten'}
          </button>
        </div>
        <p className="card-subtitle">Einfluss und Regelmäßigkeit in diesem Monat.</p>

        {/* Habit stats list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {habitStats.map((h) => (
            <div 
              key={h.id}
              style={{ 
                padding: '12px 16px', 
                backgroundColor: 'var(--bg-color)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div className="circular-progress-container" style={{ margin: 0 }}>
                {/* SVG Progress Circle */}
                <svg className="circle-svg">
                  <circle className="circle-bg" cx="24" cy="24" r="20" />
                  <circle 
                    className="circle-progress" 
                    cx="24" 
                    cy="24" 
                    r="20" 
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 * (1 - h.percentage / 100)}
                  />
                </svg>
                <div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 500, display: 'block' }}>{h.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {h.completedCount} von {totalDays} Tagen erledigt
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--clay)', fontFamily: 'var(--font-serif)' }}>
                {h.percentage}%
              </span>
            </div>
          ))}
        </div>

        {/* Expanded Habit Manager */}
        {showHabitManager && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--bg-soft)', borderRadius: '16px', border: '1px solid var(--border-color)' }} className="animate-fade-in">
            <h4 style={{ fontSize: '0.95rem', fontFamily: 'var(--font-serif)', marginBottom: '12px' }}>Habits für zukünftige Monate einrichten</h4>
            
            {/* Add new habit */}
            <form onSubmit={handleAddHabit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Neue Gewohnheit..."
                className="text-input"
                style={{ borderRadius: '12px', fontSize: '0.85rem' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: 'auto', padding: '10px 14px', borderRadius: '12px' }}
              >
                <Plus size={18} />
              </button>
            </form>

            {/* Active & Archived Lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Active */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Aktive Habits</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {allHabits.filter(h => h.active).map(h => (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem' }}>{h.name}</span>
                      <button 
                        onClick={() => onArchiveHabit(h.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Archivieren für zukünftige Monate"
                      >
                        <Archive size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Archived */}
              {allHabits.filter(h => !h.active).length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Archivierte Habits</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {allHabits.filter(h => !h.active).map(h => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px dashed var(--border-color)', opacity: 0.7 }}>
                        <span style={{ fontSize: '0.85rem', textDecoration: 'line-through' }}>{h.name}</span>
                        <button 
                          onClick={() => onReactivateHabit(h.id)} 
                          style={{ background: 'none', border: 'none', color: 'var(--clay)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Reaktivieren"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
