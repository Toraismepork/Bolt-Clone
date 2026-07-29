export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface FileNode {
  path: string;
  content: string;
}

export interface Project {
  id: string;
  title: string;
  prompt: string;
  messages: ChatMessage[];
  files: FileNode[];
  previewHtml: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  title: string;
  prompt: string;
  createdAt: number;
  updatedAt: number;
}
