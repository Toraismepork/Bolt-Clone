import { useState } from 'react';
import StartScreen from '@/components/StartScreen';
import BuilderView from '@/components/BuilderView';
import SettingsModal from '@/components/SettingsModal';
import type { Project, ChatMessage } from '@/types';
import { genId, saveProject, loadProject, getApiKey } from '@/lib/storage';
import { generateWithGemini, parseArtifact } from '@/lib/gemini';

type View = 'start' | 'builder';

export default function App() {
  const [view, setView] = useState<View>('start');
  const [project, setProject] = useState<Project | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleStart = async (prompt: string) => {
    const id = genId();
    const now = Date.now();
    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: prompt,
      timestamp: now,
    };
    const newProject: Project = {
      id,
      title: 'New Project',
      prompt,
      messages: [userMsg],
      files: [],
      previewHtml: '',
      createdAt: now,
      updatedAt: now,
    };
    saveProject(newProject);
    setProject(newProject);
    setView('builder');

    // Kick off generation
    const apiKey = getApiKey();
    if (!apiKey) {
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content:
          'No Gemini API key found. Click the Settings icon in the top right and paste your key from Google AI Studio (aistudio.google.com/app/apikey). Then send another message.',
        timestamp: Date.now(),
      };
      const updated = { ...newProject, messages: [...newProject.messages, assistantMsg], updatedAt: Date.now() };
      saveProject(updated);
      setProject(updated);
      setSettingsOpen(true);
      return;
    }

    const res = await generateWithGemini(newProject.messages, apiKey);
    const { title, files, previewHtml, text } = parseArtifact(res.text || res.error || 'No response');
    const assistantMsg: ChatMessage = {
      id: genId(),
      role: 'assistant',
      content: res.error ? res.error : text || (title ? `Built "${title}"` : 'Done!'),
      timestamp: Date.now(),
    };
    const updates: Partial<Project> = { messages: [...newProject.messages, assistantMsg] };
    if (title) updates.title = title;
    if (files.length > 0) updates.files = files;
    if (previewHtml) updates.previewHtml = previewHtml;
    const updated = { ...newProject, ...updates, updatedAt: Date.now() };
    saveProject(updated);
    setProject(updated);
  };

  const handleOpenProject = (id: string) => {
    const p = loadProject(id);
    if (p) {
      setProject(p);
      setView('builder');
    }
  };

  const handleBack = () => {
    setView('start');
    setProject(null);
  };

  return (
    <>
      {view === 'start' && (
        <StartScreen
          onStart={handleStart}
          onOpenProject={handleOpenProject}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {view === 'builder' && project && (
        <BuilderView
          project={project}
          onUpdate={setProject}
          onBack={handleBack}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
