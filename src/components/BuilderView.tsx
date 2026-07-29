import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  Eye,
  Code2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Download,
  Settings,
  Sparkles,
  User,
  FileCode,
  ChevronRight,
  ChevronDown,
  Folder,
} from 'lucide-react';
import type { Project, ChatMessage, FileNode } from '@/types';
import { generateWithGemini, parseArtifact } from '@/lib/gemini';
import { saveProject, getApiKey, genId } from '@/lib/storage';

interface BuilderViewProps {
  project: Project;
  onUpdate: (p: Project) => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

type Tab = 'preview' | 'code';

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: FileNode;
}

function buildTree(files: FileNode[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isDir: true, children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path,
          isDir: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: dirs first, then files, alphabetically
  const sortTree = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  };
  sortTree(root);

  return root;
}

function getLanguage(path: string): string {
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'tsx';
  if (path.endsWith('.ts') || path.endsWith('.js')) return 'ts';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.html')) return 'html';
  return 'text';
}

function FileTree({
  node,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  node: TreeNode;
  selectedPath: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  return (
    <>
      {node.children.map((child) => (
        <TreeItem key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth} />
      ))}
    </>
  );
}

function TreeItem({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: TreeNode;
  selectedPath: string;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-2 py-1 text-sm text-white/60 hover:bg-white/5 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          <Folder className="w-3.5 h-3.5 shrink-0 text-blue-400/60" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && <FileTree node={node} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-sm transition-colors ${
        selectedPath === node.path ? 'bg-blue-500/15 text-blue-300' : 'text-white/60 hover:bg-white/5'
      }`}
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      <FileCode className="w-3.5 h-3.5 shrink-0 text-white/40" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function BuilderView({ project, onUpdate, onBack, onOpenSettings }: BuilderViewProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('preview');
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const tree = buildTree(project.files);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [project.messages, loading]);

  useEffect(() => {
    if (project.files.length > 0 && !selectedFile) {
      setSelectedFile(project.files[0].path);
    }
  }, [project.files, selectedFile]);

  const updateProject = (updates: Partial<Project>) => {
    const updated = { ...project, ...updates, updatedAt: Date.now() };
    saveProject(updated);
    onUpdate(updated);
  };

  const runGeneration = async (messages: ChatMessage[]) => {
    setLoading(true);
    setError('');
    const apiKey = getApiKey();
    const res = await generateWithGemini(messages, apiKey);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    const { title, files, previewHtml, text } = parseArtifact(res.text);
    const assistantMsg: ChatMessage = {
      id: genId(),
      role: 'assistant',
      content: text || (title ? `Built "${title}"` : 'Done!'),
      timestamp: Date.now(),
    };
    const newMessages = [...messages, assistantMsg];
    const updates: Partial<Project> = { messages: newMessages };
    if (title) updates.title = title;
    if (files.length > 0) updates.files = files;
    if (previewHtml) updates.previewHtml = previewHtml;
    updateProject(updates);
    setIframeKey((k) => k + 1);
    if (files.length > 0) setSelectedFile(files[0].path);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    const newMessages = [...project.messages, userMsg];
    updateProject({ messages: newMessages });
    setInput('');
    await runGeneration(newMessages);
  };

  const handleCopy = () => {
    const file = project.files.find((f) => f.path === selectedFile);
    navigator.clipboard.writeText(file?.content || project.previewHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([project.previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '-').toLowerCase() || 'app'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentFile = project.files.find((f) => f.path === selectedFile);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 transition" title="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium truncate max-w-[200px]">{project.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIframeKey((k) => k + 1)} className="p-2 rounded-lg hover:bg-white/10 transition" title="Refresh preview">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-white/10 transition" title="Download">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onOpenSettings} className="p-2 rounded-lg hover:bg-white/10 transition" title="Settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className="w-[340px] shrink-0 flex flex-col border-r border-white/5">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {project.messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                    m.role === 'user' ? 'bg-white/10' : 'bg-gradient-to-br from-blue-500 to-cyan-400'
                  }`}
                >
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-white" />}
                </div>
                <div
                  className={`max-w-[240px] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-500/20'
                      : 'bg-white/[0.03] border border-white/5'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-3.5 py-2.5 text-sm text-white/50">
                  Building your app...
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/5">
            <div className="bg-[#13131a] border border-white/10 rounded-xl focus-within:border-blue-500/50 transition">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
                }}
                placeholder="Ask for changes..."
                rows={2}
                className="w-full bg-transparent text-white placeholder-white/30 px-3 pt-2.5 pb-1 resize-none focus:outline-none text-sm"
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[10px] text-white/20">⌘+Enter</span>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center disabled:opacity-30 hover:scale-105 active:scale-95 transition"
                >
                  <ArrowUp className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview / Code panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <div className="flex gap-1">
              <button
                onClick={() => setTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  tab === 'preview' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={() => setTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  tab === 'code' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Code2 className="w-4 h-4" /> Code
                {project.files.length > 0 && (
                  <span className="text-xs text-white/30 ml-1">{project.files.length}</span>
                )}
              </button>
            </div>
            {tab === 'code' && (
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-[#0a0a0f]">
            {tab === 'preview' ? (
              project.previewHtml ? (
                <iframe
                  key={iframeKey}
                  srcDoc={project.previewHtml}
                  title="Preview"
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                  Your preview will appear here once the app is generated.
                </div>
              )
            ) : project.files.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                Source files will appear here once the app is generated.
              </div>
            ) : (
              <div className="flex h-full">
                {/* File tree */}
                <div className="w-[220px] shrink-0 border-r border-white/5 overflow-y-auto py-2">
                  <div className="px-3 py-1 text-xs font-medium text-white/30 uppercase tracking-wide">Files</div>
                  <FileTree node={tree} selectedPath={selectedFile} onSelect={setSelectedFile} />
                </div>

                {/* Code view */}
                <div className="flex-1 flex flex-col min-w-0">
                  {currentFile ? (
                    <>
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 text-xs text-white/40">
                        <FileCode className="w-3.5 h-3.5" />
                        <span className="font-mono">{currentFile.path}</span>
                        <span className="ml-auto text-[10px] uppercase">{getLanguage(currentFile.path)}</span>
                      </div>
                      <pre className="flex-1 overflow-auto p-4 text-xs text-white/70 font-mono leading-relaxed">
                        <code>{currentFile.content}</code>
                      </pre>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
                      Select a file to view its code.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
