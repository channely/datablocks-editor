import { databaseService, type ProjectData } from './database';
import { useAppStore } from '../stores/appStore';
import type { AppError, ErrorType } from '../types';

// Project manager service
export class ProjectManager {
  private static instance: ProjectManager;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private autoSaveEnabled = true;
  private autoSaveIntervalMs = 30000; // 30 seconds

  private constructor() {
    this.startAutoSave();
  }

  static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  // Generate unique project ID
  private generateProjectId(): string {
    return `project-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // Get current project data from store
  private getCurrentProjectData(): ProjectData {
    const store = useAppStore.getState();
    
    return {
      id: store.projectId || this.generateProjectId(),
      name: store.projectName || 'Untitled Project',
      description: '',
      nodes: store.nodes,
      connections: store.connections,
      canvasViewport: store.canvasViewport,
      metadata: {
        created: new Date(),
        modified: new Date(),
        version: '1.0.0'
      }
    };
  }

  // Create new project
  async createNewProject(name?: string): Promise<void> {
    try {
      const store = useAppStore.getState();
      const projectId = this.generateProjectId();
      
      // Reset store to initial state
      store.reset();
      
      // Set project info
      store.setProjectId(projectId);
      store.setProjectName(name || 'New Project');
      store.markClean();

      // Save empty project
      const projectData = this.getCurrentProjectData();
      await databaseService.saveProject(projectData);

    } catch (error) {
      this.handleError('Failed to create new project', error);
    }
  }

  // Save current project
  async saveProject(): Promise<void> {
    try {
      const store = useAppStore.getState();
      const projectData = this.getCurrentProjectData();
      
      await databaseService.saveProject(projectData);
      store.markClean();

    } catch (error) {
      this.handleError('Failed to save project', error);
    }
  }

  // Save project with new name (Save As)
  async saveProjectAs(name: string): Promise<void> {
    try {
      const store = useAppStore.getState();
      const newProjectId = this.generateProjectId();
      
      // Update project info
      store.setProjectId(newProjectId);
      store.setProjectName(name);
      
      const projectData = this.getCurrentProjectData();
      await databaseService.saveProject(projectData);
      store.markClean();

    } catch (error) {
      this.handleError('Failed to save project as', error);
    }
  }

  // Load project
  async loadProject(projectId: string): Promise<void> {
    try {
      const projectData = await databaseService.loadProject(projectId);
      
      if (!projectData) {
        throw new Error('Project not found');
      }

      const store = useAppStore.getState();
      
      // Reset store
      store.reset();
      
      // Load project data
      store.setProjectId(projectData.id);
      store.setProjectName(projectData.name);
      store.setCanvasViewport(projectData.canvasViewport);
      
      // Load nodes and connections
      projectData.nodes.forEach(node => store.addNode(node));
      projectData.connections.forEach(connection => store.addConnection(connection));
      
      store.markClean();

    } catch (error) {
      this.handleError('Failed to load project', error);
    }
  }

  // Delete project
  async deleteProject(projectId: string): Promise<void> {
    try {
      await databaseService.deleteProject(projectId);
    } catch (error) {
      this.handleError('Failed to delete project', error);
    }
  }

  // Get all projects
  async getAllProjects(): Promise<ProjectData[]> {
    try {
      return await databaseService.getAllProjects();
    } catch (error) {
      this.handleError('Failed to get projects', error);
      return [];
    }
  }

  // Get recent projects
  async getRecentProjects(limit = 10): Promise<ProjectData[]> {
    try {
      return await databaseService.getRecentProjects(limit);
    } catch (error) {
      this.handleError('Failed to get recent projects', error);
      return [];
    }
  }

  // Search projects
  async searchProjects(query: string): Promise<ProjectData[]> {
    try {
      return await databaseService.searchProjects(query);
    } catch (error) {
      this.handleError('Failed to search projects', error);
      return [];
    }
  }

  // Export project
  async exportProject(projectId?: string): Promise<void> {
    try {
      const id = projectId || useAppStore.getState().projectId;
      if (!id) {
        throw new Error('No project to export');
      }

      const jsonData = await databaseService.exportProject(id);
      const projectData = JSON.parse(jsonData) as ProjectData;
      
      // Create download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      this.handleError('Failed to export project', error);
    }
  }

  // Import project
  async importProject(file: File): Promise<void> {
    try {
      const text = await file.text();
      const projectData = await databaseService.importProject(text);
      
      // Load the imported project
      await this.loadProject(projectData.id);

    } catch (error) {
      this.handleError('Failed to import project', error);
    }
  }

  // Auto-save functionality
  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      if (!this.autoSaveEnabled) return;

      const store = useAppStore.getState();
      if (!store.isDirty || !store.projectId) return;

      try {
        const projectData = this.getCurrentProjectData();
        await databaseService.createAutoSave(store.projectId, projectData);
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }, this.autoSaveIntervalMs);
  }

  // Enable/disable auto-save
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    if (enabled) {
      this.startAutoSave();
    } else if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Set auto-save interval
  setAutoSaveInterval(intervalMs: number): void {
    this.autoSaveIntervalMs = Math.max(5000, intervalMs); // Minimum 5 seconds
    if (this.autoSaveEnabled) {
      this.startAutoSave();
    }
  }

  // Get auto-save history
  async getAutoSaveHistory(projectId?: string): Promise<Array<{
    id: string;
    timestamp: Date;
    name: string;
  }>> {
    try {
      const id = projectId || useAppStore.getState().projectId;
      if (!id) return [];

      const history = await databaseService.getAutoSaveHistory(id);
      return history.map(save => ({
        id: save.id,
        timestamp: save.timestamp,
        name: `Auto-save ${save.timestamp.toLocaleString()}`
      }));
    } catch (error) {
      this.handleError('Failed to get auto-save history', error);
      return [];
    }
  }

  // Restore from auto-save
  async restoreFromAutoSave(autoSaveId: string): Promise<void> {
    try {
      const projectData = await databaseService.restoreFromAutoSave(autoSaveId);
      if (!projectData) {
        throw new Error('Auto-save not found');
      }

      const store = useAppStore.getState();
      
      // Reset store
      store.reset();
      
      // Load project data
      store.setProjectId(projectData.id);
      store.setProjectName(projectData.name);
      store.setCanvasViewport(projectData.canvasViewport);
      
      // Load nodes and connections
      projectData.nodes.forEach(node => store.addNode(node));
      projectData.connections.forEach(connection => store.addConnection(connection));
      
      store.markDirty(); // Mark as dirty since it's restored from auto-save

    } catch (error) {
      this.handleError('Failed to restore from auto-save', error);
    }
  }

  // Check if current project has unsaved changes
  hasUnsavedChanges(): boolean {
    return useAppStore.getState().isDirty;
  }

  // Get current project info
  getCurrentProjectInfo(): { id?: string; name?: string; lastSaved?: Date } {
    const store = useAppStore.getState();
    return {
      id: store.projectId,
      name: store.projectName,
      lastSaved: store.lastSaved
    };
  }

  // Database management
  async clearAllData(): Promise<void> {
    try {
      await databaseService.clearDatabase();
      const store = useAppStore.getState();
      store.reset();
    } catch (error) {
      this.handleError('Failed to clear all data', error);
    }
  }

  async getDatabaseStats(): Promise<{
    projectCount: number;
    autoSaveCount: number;
    totalSize: number;
  }> {
    try {
      return await databaseService.getDatabaseStats();
    } catch (error) {
      this.handleError('Failed to get database stats', error);
      return { projectCount: 0, autoSaveCount: 0, totalSize: 0 };
    }
  }

  // Error handling
  private handleError(message: string, error: any): void {
    console.error(message, error);
    
    const store = useAppStore.getState();
    const appError: AppError = {
      type: 'configuration_error' as ErrorType,
      message: `${message}: ${error.message || error}`,
      timestamp: new Date(),
      details: { originalError: error }
    };
    
    store.addError(appError);
  }

  // Cleanup
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

// Export singleton instance
export const projectManager = ProjectManager.getInstance();