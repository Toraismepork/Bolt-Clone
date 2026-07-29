import { useState } from 'react';
import { Sparkles, ArrowUp, Settings, History, Trash2, Github } from 'lucide-react';
import { listProjectMetas, deleteProject } from '@/lib/storage';

interface StartScreenProps {
  onStart: (prompt: string) => void;
  onOpenProject: (id: string) => void;
  onOpenSettings: () => void;
}

export default function StartScreen({ onStart, onOpenProject, onOpenSettings }: StartScreenProps) {
  const [prompt, setPrompt] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const metas = listProjectMetas();

  const handleSubmit = () => {
    if (prompt.trim()) onStart(prompt.trim());
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    setShowHistory(false);
    setTimeout(() => setShowHistory(true), 50);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Floating controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        {metas.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="History"
          >
            <History className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* History drawer */}
      {showHistory && (
        <div className="absolute right-0 top-16 w-80 bg-[#13131a] border border-white/10 rounded-l-xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
          <div className="p-3 border-b border-white/5 text-sm font-medium text-white/60">Recent Projects</div>
          {metas.map((m) => (
            <div
              key={m.id}
              className="group flex items-center gap-2 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5"
              onClick={() => onOpenProject(m.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.title}</div>
                <div className="text-xs text-white/40 truncate">{m.prompt}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-2xl tracking-tight">Bolt Clone</span>
        </div>
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            What do you want to build?
          </h1>
          <p className="text-white/50 text-lg">Describe your app and watch it come to life, powered by Gemini.</p>
        </div>

        {/* Prompt box */}
        <div className="w-full relative">
          <div className="bg-[#13131a] border border-white/10 rounded-2xl shadow-2xl focus-within:border-blue-500/50 transition-colors">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              placeholder="Ask Bolt Clone to build any web app..."
              rows={4}
              className="w-full bg-transparent text-white placeholder-white/30 px-5 pt-4 pb-2 resize-none focus:outline-none text-base"
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-xs text-white/30">⌘+Enter to submit</span>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform"
              >
                <ArrowUp className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
        <span>Powered by Google Gemini</span>
        <a href="https://github.com/Toraismepork/Bolt-Clone" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white/60 transition-colors">
          <Github className="w-4 h-4" /> GitHub
        </a>
      </footer>
    </div>
  );
}
