import { useState, useEffect } from 'react';
import { X, Key, Check, ExternalLink } from 'lucide-react';
import { getApiKey, setApiKey } from '@/lib/storage';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(getApiKey());
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    setApiKey(key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Gemini API Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition"
            />
            <p className="text-xs text-white/40 mt-2">
              Get a free key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
              . Your key is stored locally in your browser only.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 font-medium text-sm hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Saved
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
