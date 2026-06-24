import React, { useState, useEffect } from 'react';
import { Moon, ArrowLeft, Save, Check } from 'lucide-react';
import type { DailyEntry, Habit } from '../utils/db';
import { getPromptForDate } from '../utils/prompts';

interface EveningCheckInProps {
  initialEntry: DailyEntry | undefined;
  activeHabits: Habit[];
  onSave: (eveningData: NonNullable<DailyEntry['evening']>) => void;
  onCancel: () => void;
}

const MOODS = [
  { value: 1, emoji: '😢', label: 'Schwer' },
  { value: 2, emoji: '😕', label: 'Trüb' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Gut' },
  { value: 5, emoji: '😁', label: 'Erfüllt' },
];

const SOCIAL_OPTIONS = [
  { value: 'restorative', label: 'Nährend & belebend' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'draining', label: 'Anstrengend / Zehrend' },
  { value: 'none', label: 'Allein verbracht (Ruhe)' },
] as const;

export const EveningCheckIn: React.FC<EveningCheckInProps> = ({
  initialEntry,
  activeHabits,
  onSave,
  onCancel,
}) => {
  const [mood, setMood] = useState<number>(initialEntry?.evening?.mood || 3);
  const [habitState, setHabitState] = useState<Record<string, boolean>>({});
  const [social, setSocial] = useState<typeof SOCIAL_OPTIONS[number]['value']>(
    initialEntry?.evening?.social || 'neutral'
  );
  const [gratitude, setGratitude] = useState<string[]>([
    initialEntry?.evening?.gratitude?.[0] || '',
    initialEntry?.evening?.gratitude?.[1] || '',
    initialEntry?.evening?.gratitude?.[2] || '',
  ]);
  const [notes, setNotes] = useState<string>(initialEntry?.evening?.notes || '');
  const [prompt, setPrompt] = useState({ id: '', question: '', category: '' });

  // Initialize habits state
  useEffect(() => {
    const initialHabits = initialEntry?.evening?.habits || {};
    const defaultState: Record<string, boolean> = {};
    activeHabits.forEach((h) => {
      defaultState[h.id] = initialHabits[h.id] || false;
    });
    setHabitState(defaultState);

    const getLocalDateString = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setPrompt(getPromptForDate(getLocalDateString()));
  }, [activeHabits, initialEntry]);

  const toggleHabit = (id: string) => {
    setHabitState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleGratitudeChange = (index: number, val: string) => {
    const updated = [...gratitude];
    updated[index] = val;
    setGratitude(updated);
  };

  const handleSave = () => {
    onSave({
      mood,
      habits: habitState,
      social,
      // Filter out empty gratitude entries
      gratitude: gratitude.map(g => g.trim()).filter(g => g.length > 0),
      promptId: prompt.id,
      promptQuestion: prompt.question,
      notes,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={onCancel}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Moon size={24} color="var(--sage)" />
            Abend-Check-in
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tag reflektieren & abschließen</p>
        </div>
      </div>

      {/* Mood Selector */}
      <div className="card">
        <h3 className="form-label" style={{ marginBottom: '4px' }}>Wie war dein Tag insgesamt?</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Finde deine ungefähre Stimmung.</p>
        <div className="mood-grid">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={`mood-btn ${mood === m.value ? 'active' : ''}`}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Habits Section */}
      <div className="card">
        <h3 className="form-label" style={{ marginBottom: '4px' }}>Deine täglichen Gewohnheiten</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Was konntest du heute in deinen Tag integrieren?
        </p>
        <div>
          {activeHabits.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Keine aktiven Habits eingerichtet. (Du kannst sie im Monats-Review verwalten).
            </p>
          ) : (
            activeHabits.map((h) => {
              const isCompleted = !!habitState[h.id];
              return (
                <div 
                  key={h.id} 
                  onClick={() => toggleHabit(h.id)}
                  className={`habit-item ${isCompleted ? 'completed' : ''}`}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: 500, color: isCompleted ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {h.name}
                  </span>
                  <div className="habit-checkbox">
                    {isCompleted && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Social Contacts Section */}
      <div className="card">
        <h3 className="form-label" style={{ marginBottom: '4px' }}>Soziale Interaktionen</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Wie haben sich die heutigen Kontakte auf deine Energie ausgewirkt?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {SOCIAL_OPTIONS.map((opt) => {
            const isActive = social === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSocial(opt.value)}
                className={`bubble-btn ${isActive ? 'active' : ''}`}
                style={{ 
                  textAlign: 'left', 
                  borderRadius: '12px', 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  fontSize: '0.95rem'
                }}
              >
                <span>{opt.label}</span>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid var(--border-color)',
                  backgroundColor: isActive ? 'var(--clay)' : 'transparent',
                  borderColor: isActive ? 'var(--clay)' : 'var(--border-color)'
                }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Gratitude Section */}
      <div className="card">
        <h3 className="form-label" style={{ marginBottom: '4px' }}>Dankbarkeit</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Nenne 3 Dinge, für die du heute aufrichtig dankbar bist:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {gratitude.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--clay)', width: '20px' }}>
                {idx + 1}.
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => handleGratitudeChange(idx, e.target.value)}
                placeholder="Ich bin dankbar für..."
                className="text-input"
                style={{ flex: 1 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Free Text & Prompt Section */}
      <div className="card">
        <h3 className="form-label" style={{ marginBottom: '4px' }}>Tagebucheintrag & Reflexion</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
          Beantworte den Gedankenanstoß oder schreibe einfach frei auf, was dich heute beschäftigt.
        </p>

        <div className="prompt-box" style={{ marginBottom: '16px' }}>
          <p className="prompt-category">Gedankenanstoß</p>
          <p className="prompt-question">"{prompt.question}"</p>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Schreibe dich frei... Wie lief dein Tag? Was war besonders? Lass es einfach fließen."
          className="textarea-input"
        />
      </div>

      {/* Save Button */}
      <button 
        onClick={handleSave}
        className="btn btn-primary"
        style={{ marginTop: '8px' }}
      >
        <Save size={18} />
        Abend-Check-in speichern
      </button>
    </div>
  );
};
