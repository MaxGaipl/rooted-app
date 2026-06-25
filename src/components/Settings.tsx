import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Lock, 
  Unlock, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Database
} from 'lucide-react';
import { encryptData, decryptData } from '../utils/crypto';
import { 
  getAllEntries, 
  getAllHabits, 
  getAllMonthlyReviews, 
  mergeAndSaveImportedData 
} from '../utils/db';

interface SettingsProps {
  onBack: () => void;
  onImportSuccess: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack, onImportSuccess }) => {
  // Export states
  const [exportPassword, setExportPassword] = useState('');
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Import states
  const [importPassword, setImportPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportPassword || exportPassword.length < 4) {
      setExportStatus({
        type: 'error',
        message: 'Das Passwort muss mindestens 4 Zeichen lang sein.'
      });
      return;
    }

    setIsExporting(true);
    setExportStatus(null);

    try {
      // 1. Daten aus DB holen
      const entries = await getAllEntries();
      const habits = await getAllHabits();
      const goals = await getAllMonthlyReviews();

      const payload = { entries, habits, goals };
      const jsonString = JSON.stringify(payload);

      // 2. Verschlüsseln
      const encryptedData = await encryptData(jsonString, exportPassword);

      // 3. Datei-Name generieren
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `rooted_backup_${dateStr}.json`;

      // 4. File-Objekt für Share oder Download erstellen
      const blob = new Blob([encryptedData], { type: 'application/json' });
      const file = new File([blob], fileName, { type: 'application/json' });

      // Versuche Web Share API (funktioniert super in Capacitor / Mobile Web)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Rooted Backup',
          text: 'Verschlüsseltes Backup deiner Rooted Tagebuchdaten.'
        });
        setExportStatus({
          type: 'success',
          message: 'Backup-Datei erfolgreich exportiert und geteilt.'
        });
      } else {
        // Fallback für Browser / Desktop
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportStatus({
          type: 'success',
          message: 'Verschlüsseltes Backup heruntergeladen.'
        });
      }
      setExportPassword('');
    } catch (error: any) {
      console.error(error);
      setExportStatus({
        type: 'error',
        message: 'Fehler beim Exportieren: ' + (error.message || 'Unbekannter Fehler')
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setImportStatus(null);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setImportStatus({ type: 'error', message: 'Bitte wähle eine Backup-Datei aus.' });
      return;
    }
    if (!importPassword) {
      setImportStatus({ type: 'error', message: 'Bitte gib das Verschlüsselungs-Passwort ein.' });
      return;
    }

    setIsImporting(true);
    setImportStatus(null);

    try {
      // 1. Datei einlesen
      const encryptedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsText(selectedFile);
      });

      // 2. Entschlüsseln
      const decryptedString = await decryptData(encryptedData, importPassword);

      // 3. Parsen und validieren
      const payload = JSON.parse(decryptedString);
      if (!payload || (!payload.entries && !payload.habits && !payload.goals)) {
        throw new Error('Die importierte Datei hat kein gültiges Format.');
      }

      // 4. Mergen
      const result = await mergeAndSaveImportedData(payload);

      setImportStatus({
        type: 'success',
        message: `Import erfolgreich! Zusammengeführt: ${result.entriesMerged} Tage, ${result.habitsMerged} Gewohnheiten, ${result.goalsMerged} Monatsziele.`
      });

      // Inputs zurücksetzen
      setImportPassword('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Daten in App neu laden
      onImportSuccess();
    } catch (error: any) {
      console.error(error);
      setImportStatus({
        type: 'error',
        message: error.message || 'Falsches Passwort oder ungültiges Backup-Format.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={24} color="var(--clay)" />
            Daten-Backup
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Export & Import mit Passwortschutz</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--moss-light)', borderColor: 'var(--moss)' }}>
        <Info size={20} color="var(--sage)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-main)' }}>
          Deine Daten werden <strong>ausschließlich lokal</strong> auf deinem Gerät gespeichert. 
          Durch den Export erstellst du ein passwortgeschütztes Abbild, das du auf ein anderes Gerät übertragen kannst. 
          Beim Import werden Daten intelligent zusammengeführt – es geht nichts verloren.
        </div>
      </div>

      {/* Export Section */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '1.1rem' }}>
          <Download size={18} color="var(--sage)" />
          Daten sichern (Export)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
          Erstelle ein Backup deiner Einträge. Lege ein Passwort fest, um deine privaten Daten zu verschlüsseln.
        </p>

        <form onSubmit={handleExport}>
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>Sicherheits-Passwort</label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input 
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Passwort zum Verschlüsseln festlegen..."
                className="text-input"
                style={{ paddingLeft: '36px', borderRadius: '12px' }}
                required
              />
            </div>
          </div>

          {exportStatus && (
            <div className={`card ${exportStatus.type === 'success' ? 'success' : ''}`} style={{ 
              padding: '10px 14px', 
              fontSize: '0.85rem', 
              marginBottom: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              backgroundColor: exportStatus.type === 'success' ? 'rgba(76, 104, 83, 0.2)' : 'rgba(204, 92, 92, 0.15)',
              borderColor: exportStatus.type === 'success' ? 'var(--moss)' : 'var(--alert-red)'
            }}>
              {exportStatus.type === 'success' ? <CheckCircle size={16} color="var(--sage)" /> : <AlertCircle size={16} color="var(--alert-red)" />}
              <span>{exportStatus.message}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={isExporting}
          >
            {isExporting ? 'Verschlüssele...' : (
              <>
                <Lock size={16} />
                Daten verschlüsselt exportieren
              </>
            )}
          </button>
        </form>
      </div>

      {/* Import Section */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '1.1rem' }}>
          <Upload size={18} color="var(--sage)" />
          Daten wiederherstellen (Import)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
          Wähle eine zuvor exportierte Backup-Datei aus und gib das zugehörige Passwort ein, um die Daten zu entschlüsseln und zu mergen.
        </p>

        <form onSubmit={handleImport}>
          <div style={{ marginBottom: '12px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>Backup-Datei (.json)</label>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              style={{ display: 'none' }}
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bubble-btn"
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '12px', 
                borderStyle: 'dashed',
                color: selectedFile ? 'var(--text-main)' : 'var(--text-muted)',
                backgroundColor: selectedFile ? 'var(--card-active)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Upload size={16} />
              {selectedFile ? selectedFile.name : 'Klicke zum Auswählen einer Backup-Datei'}
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>Verschlüsselungs-Passwort</label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Unlock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input 
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Passwort zum Entschlüsseln eingeben..."
                className="text-input"
                style={{ paddingLeft: '36px', borderRadius: '12px' }}
                required
              />
            </div>
          </div>

          {importStatus && (
            <div className="card" style={{ 
              padding: '10px 14px', 
              fontSize: '0.85rem', 
              marginBottom: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              backgroundColor: importStatus.type === 'success' ? 'rgba(76, 104, 83, 0.2)' : 'rgba(204, 92, 92, 0.15)',
              borderColor: importStatus.type === 'success' ? 'var(--moss)' : 'var(--alert-red)'
            }}>
              {importStatus.type === 'success' ? <CheckCircle size={16} color="var(--sage)" /> : <AlertCircle size={16} color="var(--alert-red)" />}
              <span>{importStatus.message}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-secondary" 
            style={{ 
              width: '100%', 
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              transition: 'var(--transition-smooth)'
            }}
            disabled={isImporting}
          >
            {isImporting ? 'Entschlüssele & Merge...' : (
              <>
                <Unlock size={16} />
                Daten entschlüsseln & importieren
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
