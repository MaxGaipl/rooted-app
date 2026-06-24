import React, { useState } from 'react';
import { Calendar, Sun, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import type { DailyEntry } from '../utils/db';

interface HistoryLogProps {
  entries: DailyEntry[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ entries }) => {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Sort entries descending (newest first)
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const getMoodEmoji = (val: number) => {
    const emojis: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😁' };
    return emojis[val] || '😐';
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px' }}>
      <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Calendar size={22} color="var(--clay)" />
        Deine Reise (Historie)
      </h2>

      {sortedEntries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontStyle: 'italic', marginBottom: '8px' }}>Noch keine Einträge vorhanden.</p>
          <p style={{ fontSize: '0.85rem' }}>Mach heute deinen ersten Check-in, um deine Wurzeln zu schlagen.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sortedEntries.map((entry) => {
            const isExpanded = !!expandedDates[entry.date];
            const hasMorning = !!entry.morning;
            const hasEvening = !!entry.evening;

            return (
              <div 
                key={entry.date} 
                className="history-item"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleExpand(entry.date)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="history-date">{formatDate(entry.date)}</div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Summary Badges */}
                <div className="history-summary">
                  {hasMorning && (
                    <span className="badge badge-energy" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Sun size={10} />
                      Energie: {entry.morning?.energy}
                    </span>
                  )}
                  {hasEvening && (
                    <span className="badge badge-mood" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Moon size={10} />
                      Stimmung: {getMoodEmoji(entry.evening?.mood || 3)}
                    </span>
                  )}
                  {!hasMorning && !hasEvening && (
                    <span className="badge" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                      Leer
                    </span>
                  )}
                </div>

                {/* Short Preview (when collapsed) */}
                {!isExpanded && (
                  <p className="history-text-preview">
                    {entry.evening?.notes 
                      ? entry.evening.notes 
                      : entry.morning?.intention 
                      ? `Fokus: ${entry.morning.intention}` 
                      : 'Klicke zum Ausklappen des Tagesdetails.'}
                  </p>
                )}

                {/* Detailed View (when expanded) */}
                {isExpanded && (
                  <div 
                    className="animate-fade-in" 
                    style={{ 
                      marginTop: '12px', 
                      padding: '16px', 
                      backgroundColor: 'var(--card-bg)', 
                      borderRadius: '16px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent collapsing when clicking inside
                  >
                    {/* Morning details */}
                    {hasMorning && (
                      <div style={{ borderBottom: hasEvening ? '1px solid var(--border-color)' : 'none', paddingBottom: hasEvening ? '12px' : '0' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--clay)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <Sun size={14} />
                          Morgen-Reflexion
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <strong>Körperliches Befinden:</strong> {entry.morning?.body.join(', ') || 'Keine Angaben'}
                        </p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          <strong>Intention:</strong> "{entry.morning?.intention}"
                        </p>
                      </div>
                    )}

                    {/* Evening details */}
                    {hasEvening && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--sage)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Moon size={14} />
                            Abend-Reflexion
                          </h4>
                          
                          {/* Gratitude List */}
                          {entry.evening?.gratitude && entry.evening.gratitude.length > 0 && (
                            <div style={{ marginBottom: '8px' }}>
                              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                Dankbar für:
                              </p>
                              <ul style={{ paddingLeft: '16px', fontSize: '0.85rem', listStyleType: 'circle' }}>
                                {entry.evening.gratitude.map((g, idx) => (
                                  <li key={idx} style={{ color: 'var(--text-main)', fontStyle: 'italic', marginBottom: '2px' }}>
                                    {g}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Social Interaction */}
                          {entry.evening?.social && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                              <strong>Soziale Interaktionen:</strong> {
                                entry.evening.social === 'restorative' ? 'Nährend & belebend' :
                                entry.evening.social === 'neutral' ? 'Neutral' :
                                entry.evening.social === 'draining' ? 'Anstrengend / Kraftraubend' :
                                'Allein verbracht (Ruhe)'
                              }
                            </p>
                          )}
                        </div>

                        {/* Prompt and Notes */}
                        {entry.evening?.promptQuestion && (
                          <div className="prompt-box" style={{ padding: '8px 12px', borderLeftColor: 'var(--sage)' }}>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sage)', display: 'block' }}>
                              Gedankenanstoß
                            </span>
                            <span style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                              "{entry.evening.promptQuestion}"
                            </span>
                          </div>
                        )}

                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Reflexion / Notizen:
                          </p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {entry.evening?.notes || 'Kein Text verfasst.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
