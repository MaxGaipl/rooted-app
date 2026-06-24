import React, { useEffect, useState } from 'react';
import { Sun, Moon, Flame, Sparkles, CheckCircle2 } from 'lucide-react';
import type { DailyEntry } from '../utils/db';
import { getPromptForDate } from '../utils/prompts';

interface DashboardProps {
  todayEntry: DailyEntry | undefined;
  streak: number;
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  todayEntry,
  streak,
  onNavigate,
}) => {
  const [greeting, setGreeting] = useState('Guten Tag');
  const [todayPrompt, setTodayPrompt] = useState({ question: '', category: '' });

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting('Guten Morgen');
    else if (hour < 18) setGreeting('Hallo');
    else setGreeting('Guten Abend');

    const prompt = getPromptForDate(getLocalDateString());
    setTodayPrompt(prompt);
  }, []);

  const hasMorning = !!todayEntry?.morning;
  const hasEvening = !!todayEntry?.evening;

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    };
    return new Date().toLocaleDateString('de-DE', options);
  };

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>
          {formatDate()}
        </p>
        <h2 style={{ fontSize: '2rem', color: 'var(--text-main)', marginBottom: '8px' }}>
          {greeting}, Max
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="streak-badge">
            <Flame size={16} fill="var(--clay)" />
            <span>{streak} Tage Streak</span>
          </div>
          {hasMorning && hasEvening && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--moss-light)',
              border: '1px solid var(--moss)',
              color: 'var(--sage)',
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <CheckCircle2 size={16} />
              <span>Tag ausgeglichen</span>
            </div>
          )}
        </div>
      </div>

      {/* Check-In Action Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        {/* Morning Card */}
        <div className={`card ${hasMorning ? 'completed' : ''}`} style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderLeft: hasMorning ? '4px solid var(--moss)' : '4px solid var(--border-color)',
          background: hasMorning ? 'linear-gradient(135deg, var(--card-bg), rgba(76, 104, 83, 0.08))' : 'var(--card-bg)'
        }}>
          <div>
            <h3 className="card-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sun size={20} color="var(--clay)" />
              Morgen-Check-in
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              {hasMorning 
                ? `Erledigt • Intention: "${todayEntry.morning?.intention.substring(0, 30)}${todayEntry.morning?.intention && todayEntry.morning.intention.length > 30 ? '...' : ''}"`
                : 'Energie ausrichten & Intention setzen'}
            </p>
          </div>
          <div>
            {hasMorning ? (
              <button 
                onClick={() => onNavigate('morning')}
                className="btn btn-secondary" 
                style={{ padding: '8px 16px', borderRadius: '12px', width: 'auto', fontSize: '0.85rem' }}
              >
                Ansehen
              </button>
            ) : (
              <button 
                onClick={() => onNavigate('morning')}
                className="btn btn-primary" 
                style={{ padding: '10px 18px', borderRadius: '12px', width: 'auto', fontSize: '0.85rem' }}
              >
                Starten
              </button>
            )}
          </div>
        </div>

        {/* Evening Card */}
        <div className={`card ${hasEvening ? 'completed' : ''}`} style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderLeft: hasEvening ? '4px solid var(--clay)' : '4px solid var(--border-color)',
          background: hasEvening ? 'linear-gradient(135deg, var(--card-bg), rgba(214, 116, 81, 0.08))' : 'var(--card-bg)'
        }}>
          <div>
            <h3 className="card-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Moon size={20} color="var(--sage)" />
              Abend-Check-in
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              {hasEvening 
                ? 'Erledigt • Tag reflektiert & ausgespeichert' 
                : 'Mood, Gewohnheiten & Dankbarkeit tracken'}
            </p>
          </div>
          <div>
            {hasEvening ? (
              <button 
                onClick={() => onNavigate('evening')}
                className="btn btn-secondary" 
                style={{ padding: '8px 16px', borderRadius: '12px', width: 'auto', fontSize: '0.85rem' }}
              >
                Ansehen
              </button>
            ) : (
              <button 
                onClick={() => onNavigate('evening')}
                className="btn btn-primary" 
                style={{ padding: '10px 18px', borderRadius: '12px', width: 'auto', fontSize: '0.85rem' }}
              >
                Starten
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Daily Reflection Prompt Box (only shown if evening check-in is complete) */}
      {hasEvening && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '12px' }}>
            <Sparkles size={18} color="var(--clay)" />
            Deine heutige Reflexion
          </h3>
          <div className="prompt-box">
            <p className="prompt-category">
              {todayEntry?.evening?.promptQuestion ? 'Gedankenanstoß' : 'Reflexion'}
            </p>
            <p className="prompt-question">
              "{todayEntry?.evening?.promptQuestion || todayPrompt.question}"
            </p>
          </div>
          
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Deine Gedanken:</p>
            <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
              {todayEntry?.evening?.notes || 'Keine Notizen hinzugefügt.'}
            </p>
          </div>
        </div>
      )}

      {/* Organic Vibe Quote */}
      <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.6 }}>
        <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          "Wurzeln brauchen Zeit, um zu wachsen. Sei geduldig mit deinem Weg."
        </p>
      </div>
    </div>
  );
};
