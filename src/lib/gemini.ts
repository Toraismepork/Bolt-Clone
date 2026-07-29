import type { FileNode, ChatMessage } from '@/types';

const SYSTEM_PROMPT = `You are an expert AI web developer inside a Bolt.new-style app builder.
You generate modern Next.js 14 (App Router) applications using React, TypeScript, and Tailwind CSS.

When the user asks you to build or modify an app, respond with a <bolt-artifact> tag containing:
1. A <files> section with individual <file path="..."> blocks — real Next.js source code
2. A <preview> section with a self-contained HTML document that renders the app using React via CDN

SOURCE FILES (in <files>):
- Use Next.js App Router conventions: app/page.tsx, app/layout.tsx, etc.
- Use TypeScript and Tailwind CSS classes
- Use lucide-react for icons (import { IconName } from 'lucide-react')
- Use React hooks (useState, useEffect, etc.)
- Make apps fully responsive, animated, and production-quality
- Beautiful modern design — never use purple/indigo themes unless asked

PREVIEW (in <preview>):
- A COMPLETE standalone HTML document (<!DOCTYPE html>...</html>)
- Include React 18 + ReactDOM via CDN (https://unpkg.com/react@18/umd/react.production.min.js)
- Include Babel standalone (https://unpkg.com/@babel/standalone/babel.min.js)  
- Include Tailwind via CDN (https://cdn.tailwindcss.com)
- Include lucide via CDN (https://unpkg.com/lucide@latest)
- Write the app as a single React component inside <script type="text/babel">
- Use all the same Tailwind classes and design from the source files
- Must be fully functional and interactive

FORMAT:
<bolt-artifact title="App Title">
<files>
<file path="app/page.tsx">
// Next.js page code
</file>
<file path="app/layout.tsx">
// Layout code
</file>
</files>
<preview>
<!DOCTYPE html>
<html>...</html>
</preview>
</bolt-artifact>

Always provide BOTH the source files and the preview. The preview must be a complete working HTML document.`;

interface GeminiResponse {
  text: string;
  error?: string;
}

export async function generateWithGemini(
  messages: ChatMessage[],
  apiKey: string,
  model: string = 'gemini-2.0-flash'
): Promise<GeminiResponse> {
  if (!apiKey) {
    return { text: '', error: 'No Gemini API key provided. Add your key in Settings.' };
  }

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return { text: '', error: `Gemini API error (${res.status}): ${errBody.slice(0, 200)}` };
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') ??
      '';

    if (!text) {
      return { text: '', error: 'Gemini returned an empty response.' };
    }

    return { text };
  } catch (e) {
    return { text: '', error: e instanceof Error ? e.message : 'Unknown network error' };
  }
}

export interface ParsedArtifact {
  title: string;
  files: FileNode[];
  previewHtml: string;
  text: string;
}

export function parseArtifact(response: string): ParsedArtifact {
  const artifactMatch = response.match(/<bolt-artifact\s+title="([^"]*)">([\s\S]*?)<\/bolt-artifact>/);
  const title = artifactMatch?.[1] || 'Untitled App';
  const body = artifactMatch?.[2] || response;

  // Parse files
  const files: FileNode[] = [];
  const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
  let fileMatch: RegExpExecArray | null;
  while ((fileMatch = fileRegex.exec(body)) !== null) {
    files.push({ path: fileMatch[1], content: fileMatch[2].trim() });
  }

  // Parse preview
  let previewHtml = '';
  const previewMatch = body.match(/<preview>([\s\S]*?)<\/preview>/);
  if (previewMatch) {
    previewHtml = previewMatch[1].trim();
  } else {
    // Fallback: look for a full HTML doc
    const htmlMatch = body.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i);
    if (htmlMatch) previewHtml = htmlMatch[1];
  }

  // Text outside the artifact
  const text = response.replace(/<bolt-artifact[\s\S]*?<\/bolt-artifact>/, '').trim();

  return { title, files, previewHtml, text };
}
