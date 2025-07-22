import { useState, useEffect, useCallback, useMemo } from 'react';
import { projectManager } from '../services/projectManager';
import { useAppStore } from '../stores/appStore';
import type { ProjectData } from '../services/database';

export interface UseProjectManagerReturn {
  // Project state
  currentProject: {
    id?: string;
    name?: string;
    lastSaved?: Date;
  };
  hasUnsavedChanges: boolean;
  isAutoSaveEnabled: boolean;
  
  // Project operations
  createNewProject: (name?: string) => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: (name: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  // Project listing
  getAllProjects: () => Promise<ProjectData[]>;
  getRecentProjects: (limit?: number) => Promise<ProjectData[]>;
  searchProjects: (query: string) => Promise<ProjectData[]>;
  
  // Import/Export
  exportProject: (projectId?: string) => Promise<void>;
  importProject: (file: File) => Promise<void>;
  
  // Auto-save
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveInterval: (intervalMs: number) => void;
  getAutoSaveHistory: (projectId?: string) => Promise<Array<{
    id: string;
    timestamp: Date;
    name: string;
  }>>;
  restoreFromAutoSave: (autoSaveId: string) => Promise<void>;
  
  // Database management
  clearAllData: () => Promise<void>;
  getDatabaseStats: () => Promise<{
    projectCount: number;
    autoSaveCount: number;
    totalSize: number;
  }>;
  
  // Loading states
  loading: {
    saving: boolean;
    loading: boolean;
    deleting: boolean;
    importing: boolean;
    exporting: boolean;
  };
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

export const useProjectManager = (): UseProjectManagerReturn => {
  const [loading, setLoading] = useState({
    saving: false,
    loading: false,
    deleting: false,
    importing: false,
    exporting: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabledState] = useState(true);

  // Get current project info from store with individual selectors to avoid object recreation
  const projectId = useAppStore(state => state.projectId);
  const projectName = useAppStore(state => state.projectName);
  const lastSaved = useAppStore(state => state.lastSaved);
  
  // Memoize the current project object
  const currentProject = useMemo(() => ({
    id: projectId,
    name: projectName,
    lastSaved: lastSaved
  }), [projectId, projectName, lastSaved]);
  
  const hasUnsavedChanges = useAppStore(state => state.isDirty);

  // Helper to handle async operations with loading states
  const withLoading = useCallback(
    async <T>(
      operation: () => Promise<T>,
      loadingKey: keyof typeof loading
    ): Promise<T | undefined> => {
      try {
        setLoading(prev => ({ ...prev, [loadingKey]: true }));
        setError(null);
        const result = await operation();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        console.error(`Project operation failed:`, err);
        return undefined;
      } finally {
        setLoading(prev => ({ ...prev, [loadingKey]: false }));
      }
    },
    []
  );

  // Project operations
  const createNewProject = useCallback(
    (name?: string) => withLoading(
      () => projectManager.createNewProject(name),
      'saving'
    ),
    [withLoading]
  );

  const saveProject = useCallback(
    () => withLoading(
      () => projectManager.saveProject(),
      'saving'
    ),
    [withLoading]
  );

  const saveProjectAs = useCallback(
    (name: string) => withLoading(
      () => projectManager.saveProjectAs(name),
      'saving'
    ),
    [withLoading]
  );

  const loadProject = useCallback(
    (projectId: string) => withLoading(
      () => projectManager.loadProject(projectId),
      'loading'
    ),
    [withLoading]
  );

  const deleteProject = useCallback(
    (projectId: string) => withLoading(
      () => projectManager.deleteProject(projectId),
      'deleting'
    ),
    [withLoading]
  );

  // Project listing
  const getAllProjects = useCallback(
    () => projectManager.getAllProjects(),
    []
  );

  const getRecentProjects = useCallback(
    (limit?: number) => projectManager.getRecentProjects(limit),
    []
  );

  const searchProjects = useCallback(
    (query: string) => projectManager.searchProjects(query),
    []
  );

  // Import/Export
  const exportProject = useCallback(
    (projectId?: string) => withLoading(
      () => projectManager.exportProject(projectId),
      'exporting'
    ),
    [withLoading]
  );

  const importProject = useCallback(
    (file: File) => withLoading(
      () => projectManager.importProject(file),
      'importing'
    ),
    [withLoading]
  );

  // Auto-save
  const setAutoSaveEnabled = useCallback((enabled: boolean) => {
    setIsAutoSaveEnabledState(enabled);
    projectManager.setAutoSaveEnabled(enabled);
  }, []);

  const setAutoSaveInterval = useCallback((intervalMs: number) => {
    projectManager.setAutoSaveInterval(intervalMs);
  }, []);

  const getAutoSaveHistory = useCallback(
    (projectId?: string) => projectManager.getAutoSaveHistory(projectId),
    []
  );

  const restoreFromAutoSave = useCallback(
    (autoSaveId: string) => withLoading(
      () => projectManager.restoreFromAutoSave(autoSaveId),
      'loading'
    ),
    [withLoading]
  );

  // Database management
  const clearAllData = useCallback(
    () => withLoading(
      () => projectManager.clearAllData(),
      'deleting'
    ),
    [withLoading]
  );

  const getDatabaseStats = useCallback(
    () => projectManager.getDatabaseStats(),
    []
  );

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + S for save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (currentProject.id) {
          saveProject();
        }
      }
      
      // Ctrl/Cmd + Shift + S for save as
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        // This would need to trigger a save as dialog
        console.log('Save As shortcut triggered');
      }
      
      // Ctrl/Cmd + O for open
      if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
        event.preventDefault();
        // This would need to trigger an open dialog
        console.log('Open shortcut triggered');
      }
      
      // Ctrl/Cmd + N for new
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        if (!hasUnsavedChanges || confirm('You have unsaved changes. Create new project anyway?')) {
          createNewProject();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject.id, hasUnsavedChanges, saveProject, createNewProject]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    currentProject,
    hasUnsavedChanges,
    isAutoSaveEnabled,
    
    createNewProject,
    saveProject,
    saveProjectAs,
    loadProject,
    deleteProject,
    
    getAllProjects,
    getRecentProjects,
    searchProjects,
    
    exportProject,
    importProject,
    
    setAutoSaveEnabled,
    setAutoSaveInterval,
    getAutoSaveHistory,
    restoreFromAutoSave,
    
    clearAllData,
    getDatabaseStats,
    
    loading,
    error,
    clearError
  };
};