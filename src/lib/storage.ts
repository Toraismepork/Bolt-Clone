import type { Project, ProjectMeta } from '@/types';

const PREFIX = 'bolt-clone:';

export function saveProject(project: Project): void {
  try {
    localStorage.setItem(`${PREFIX}project:${project.id}`, JSON.stringify(project));
    updateMetaList(project);
  } catch (e) {
    console.error('Failed to save project', e);
  }
}

export function loadProject(id: string): Project | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}project:${id}`);
    return raw ? (JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}

export function deleteProject(id: string): void {
  localStorage.removeItem(`${PREFIX}project:${id}`);
  const metas = listProjectMetas().filter((m) => m.id !== id);
  localStorage.setItem(`${PREFIX}meta-list`, JSON.stringify(metas));
}

function updateMetaList(project: Project): void {
  const metas = listProjectMetas();
  const idx = metas.findIndex((m) => m.id === project.id);
  const meta: ProjectMeta = {
    id: project.id,
    title: project.title,
    prompt: project.prompt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  if (idx >= 0) metas[idx] = meta;
  else metas.unshift(meta);
  localStorage.setItem(`${PREFIX}meta-list`, JSON.stringify(metas));
}

export function listProjectMetas(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}meta-list`);
    return raw ? (JSON.parse(raw) as ProjectMeta[]) : [];
  } catch {
    return [];
  }
}

export function getApiKey(): string {
  return localStorage.getItem(`${PREFIX}gemini-key`) || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(`${PREFIX}gemini-key`, key);
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
