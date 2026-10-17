import { ProjectData } from '../types';
import { createDefaultProject, TEMPLATE_PROJECTS } from '../data/defaultProjects';

const STORAGE_KEY_CURRENT = 'audio2style_current_project';
const STORAGE_KEY_LIST = 'audio2style_project_list';

export function loadCurrentProject(): ProjectData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id && parsed.sections) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse current project from storage:', err);
  }
  // Fallback to default
  const def = createDefaultProject();
  saveCurrentProject(def);
  return def;
}

export function saveCurrentProject(project: ProjectData): void {
  try {
    const updated = {
      ...project,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updated));

    // Also update project in saved list
    const list = getSavedProjectsList();
    const existingIndex = list.findIndex(p => p.id === updated.id);
    if (existingIndex >= 0) {
      list[existingIndex] = {
        id: updated.id,
        title: updated.title,
        genre: updated.genre,
        tempo: updated.tempo,
        targetKeyboardId: updated.targetKeyboardId,
        updatedAt: updated.updatedAt
      };
    } else {
      list.unshift({
        id: updated.id,
        title: updated.title,
        genre: updated.genre,
        tempo: updated.tempo,
        targetKeyboardId: updated.targetKeyboardId,
        updatedAt: updated.updatedAt
      });
    }
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save current project:', err);
  }
}

export interface ProjectSummary {
  id: string;
  title: string;
  genre: string;
  tempo: number;
  targetKeyboardId: string;
  updatedAt: string;
}

export function getSavedProjectsList(): ProjectSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIST);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}

  // Initial starter list
  return [
    {
      id: 'proj_pop_ballad_s750',
      title: 'Pop Ballad Indonesia S750',
      genre: 'Pop Ballad',
      tempo: 72,
      targetKeyboardId: 'yamaha_psr_s750',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'proj_dangdut_s750',
      title: 'Dangdut Koplo Nusantara S750',
      genre: 'Dangdut Koplo',
      tempo: 135,
      targetKeyboardId: 'yamaha_psr_s750',
      updatedAt: new Date().toISOString()
    }
  ];
}

export function deleteSavedProject(id: string): void {
  const list = getSavedProjectsList().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(list));
  if (localStorage.getItem(STORAGE_KEY_CURRENT)) {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRENT)!);
    if (current.id === id) {
      const next = createDefaultProject();
      saveCurrentProject(next);
    }
  }
}

export function downloadProjectFile(project: ProjectData): void {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.replace(/\s+/g, '_')}_Audio2Style.a2s`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
