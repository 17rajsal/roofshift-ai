import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Project } from '../types/models';
import { api } from '../services/api';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  error: string | null;
  setActiveProject: (p: Project) => void;
  refreshProjects: () => Promise<void>;
  loadDemoProject: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
const ACTIVE_PROJECT_KEY = 'roofshift.activeProjectId';

function storedProjectId(): string | null {
  try { return localStorage.getItem(ACTIVE_PROJECT_KEY); } catch { return null; }
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, updateActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const requestVersion = useRef(0);
  const setActiveProject = useCallback((project: Project) => updateActiveProject(project), []);

  const refreshProjects = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setError(null);
      const list = await api.getProjects();
      if (version !== requestVersion.current) return;
      setProjects(list);
      updateActiveProject(current =>
        list.find(p => p.id === (current?.id || storedProjectId()))
        || list.find(p => p.is_demo === 'true') || list[0] || null
      );
    } catch (err: any) {
      if (version === requestVersion.current) setError(err.message || 'Failed to fetch projects');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  const loadDemoProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const demo = await api.seedDemoProject();
      setActiveProject(demo);
      await refreshProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to load demo project');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (data: Partial<Project>): Promise<Project> => {
    const created = await api.createProject(data);
    setActiveProject(created);
    await refreshProjects();
    return created;
  };

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!activeProject) return;
    try { localStorage.setItem(ACTIVE_PROJECT_KEY, activeProject.id); } catch { /* Private browsing can disable storage. */ }
  }, [activeProject?.id]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        loading,
        error,
        setActiveProject,
        refreshProjects,
        loadDemoProject,
        createProject
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return ctx;
}
