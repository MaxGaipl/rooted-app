import React, { useState } from 'react';
import { Sun, ArrowLeft, Save } from 'lucide-react';
import type { DailyEntry } from '../utils/db';

interface MorningCheckInProps {
  initialEntry: DailyEntry | undefined;
  onSave: (morningData: NonNullable<DailyEntry['morning']>) => void;
  onCancel: () => void;
}

const PHYSICAL_OPTIONS = [
  'Fit',
  'Ausgeruht',
  'Müde',
  'Verspannt',
  'Kopfschmerzen',
  'Rückenschmerzen',
  'Voller Energie',
  'Träge',
  'Entspannt',
  'Unruhig',
];

const ENERGY_LABELS: Record<number, string> = {
  1: 'Erschöpft & leer',
  2: 'Etwas träge / ruhig',
  3: 'Ausgeglichen',
  4: 'Voller Tatendrang',
  5: 'Überströmende Energie',
};

export const MorningCheckIn: React.FC<MorningCheckInProps> = ({
  initialEntry,
  onSave,
  onCancel,
}) => {
  const [energy, setEnergy] = useState<number>(initialEntry?.morning?.energy || 3);
  const [selectedPhysical, setSelectedPhysical] = useState<string[]>(
    initialEntry?.morning?.body || []
  );
  const [intention, setIntention] = useState<string>(
    initialEntry?.morning?.intention || ''
  );

  const togglePhysical = (option: string) => {
    if (selectedPhysical.includes(option)) {
      setSelectedPhysical(selectedPhysical.filter((item) => item !== option));
    } else {
      setSelectedPhysical([...selectedPhysical, option]);
    }
  };

  const handleSave = () => {
    onSave({
      energy,
      body: selectedPhysical,
      intention,
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
            <Sun size={24} color="var(--clay)" />
            Morgen-Check-in
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ausrichtung für den Tag</p>
        </div>
      </div>

      {/* Energy Level Section */}
      <div className="card">
        <h3 className="form-label" style={{ marginBottom: '4px' }}>Wie fühlst du dich energetisch?</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
          Horche kurz in dich hinein. Wie steht es um deine Lebensenergie?
        </p>
        
        <div className="organic-slider-container" style={{ textAlign: 'center' }}>
          <input 
            type="range" 
            min="1" 
            max="5" 
            value={energy} 
            onChange={(e) => setEnergy(parseInt(e.target.value))} 
            className="organic-slider"
          />
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            color: 'var(--clay)', 
            fontFamily: 'var(--font-serif)',
            marginTop: '4px',
            minHeight: '26px'
          }}>
            {ENERGY_LABELS[energy]}
          </div>
        </div>
      </div>

      {/* Physical Feeling Section */}
      <div className="card">
        <h3 className="form-label" style={{ marginBottom: '4px' }}>Körperliches Befinden</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Wie fühlt sich dein Körper heute Morgen an? (Mehrfachauswahl möglich)
        </p>

        <div className="bubbles-container">
          {PHYSICAL_OPTIONS.map((option) => {
            const isActive = selectedPhysical.includes(option);
            return (
              <button
                key={option}
                onClick={() => togglePhysical(option)}
                className={`bubble-btn ${isActive ? 'active' : ''}`}
                style={{ padding: '10px 18px', fontSize: '0.9rem' }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Intention Section */}
      <div className="card">
        <h3 className="form-label" style={{ marginBottom: '4px' }}>Tages-Fokus & Intention</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
          Welcher Leitgedanke oder welche Ausrichtung soll dich heute durch den Tag begleiten?
        </p>
        
        <input 
          type="text" 
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="z. B. Gelassen bleiben, Pausen einlegen, Fokus halten..."
          className="text-input"
          style={{ borderRadius: '12px' }}
        />
      </div>

      {/* Save Button */}
      <button 
        onClick={handleSave}
        className="btn btn-primary"
        style={{ marginTop: '8px' }}
      >
        <Save size={18} />
        Check-in speichern
      </button>
    </div>
  );
};
