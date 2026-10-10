import React, { createContext, useContext, useState, useEffect } from 'react';
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

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await api.getProjects();
      setProjects(list);
      if (list.length > 0) {
        // Keep active or set to first (prefer demo if available)
        if (!activeProject || !list.find(p => p.id === activeProject.id)) {
          const demo = list.find(p => p.is_demo === 'true') || list[0];
          setActiveProject(demo);
        } else {
          const updated = list.find(p => p.id === activeProject.id);
          if (updated) setActiveProject(updated);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoProject = async () => {
    try {
      setLoading(true);
      const demo = await api.seedDemoProject();
      await refreshProjects();
      setActiveProject(demo);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo project');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (data: Partial<Project>): Promise<Project> => {
    const created = await api.createProject(data);
    await refreshProjects();
    setActiveProject(created);
    return created;
  };

  useEffect(() => {
    refreshProjects();
  }, []);

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
