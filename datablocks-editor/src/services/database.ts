import Dexie, { type Table } from 'dexie';
import type { NodeInstance, Connection } from '../types';

// Project data structure for storage
export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  nodes: NodeInstance[];
  connections: Connection[];
  canvasViewport: { x: number; y: number; zoom: number };
  metadata: {
    created: Date;
    modified: Date;
    version: string;
    tags?: string[];
  };
}

// Auto-save snapshot
export interface AutoSaveSnapshot {
  id: string;
  projectId: string;
  timestamp: Date;
  data: ProjectData;
}

// Database schema
export class DataBlocksDatabase extends Dexie {
  projects!: Table<ProjectData>;
  autoSaves!: Table<AutoSaveSnapshot>;

  constructor() {
    super('DataBlocksDatabase');
    
    this.version(1).stores({
      projects: 'id, name, metadata.created, metadata.modified',
      autoSaves: 'id, projectId, timestamp'
    });

    // Hooks for automatic timestamp updates
    this.projects.hook('creating', (_primKey, obj, _trans) => {
      obj.metadata.created = new Date();
      obj.metadata.modified = new Date();
    });

    this.projects.hook('updating', (modifications, _primKey, obj, _trans) => {
      (modifications as any).metadata = {
        ...obj.metadata,
        modified: new Date()
      };
    });
  }

  // Clean up old auto-saves (keep only last 10 per project)
  async cleanupAutoSaves(projectId: string): Promise<void> {
    const autoSaves = await this.autoSaves
      .where('projectId')
      .equals(projectId)
      .toArray();

    // Sort by timestamp manually since orderBy might not work as expected
    autoSaves.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (autoSaves.length > 10) {
      const toDelete = autoSaves.slice(0, autoSaves.length - 10);
      await this.autoSaves.bulkDelete(toDelete.map((save: AutoSaveSnapshot) => save.id));
    }
  }

  // Get recent projects
  async getRecentProjects(limit = 10): Promise<ProjectData[]> {
    return this.projects
      .orderBy('metadata.modified')
      .reverse()
      .limit(limit)
      .toArray();
  }

  // Search projects
  async searchProjects(query: string): Promise<ProjectData[]> {
    const lowerQuery = query.toLowerCase();
    return this.projects
      .filter(project => {
        const nameMatch = project.name.toLowerCase().includes(lowerQuery);
        const descMatch = project.description?.toLowerCase().includes(lowerQuery) || false;
        const tagMatch = project.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) || false;
        return nameMatch || descMatch || tagMatch;
      })
      .toArray();
  }

  // Get auto-save history for a project
  async getAutoSaveHistory(projectId: string, limit = 5): Promise<AutoSaveSnapshot[]> {
    const autoSaves = await this.autoSaves
      .where('projectId')
      .equals(projectId)
      .toArray();
    
    // Sort manually since orderBy might not work as expected
    autoSaves.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return autoSaves.slice(0, limit);
  }
}

// Create database instance
export const db = new DataBlocksDatabase();

// Database service class
export class DatabaseService {
  private static instance: DatabaseService;
  private db: DataBlocksDatabase;

  private constructor() {
    this.db = db;
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Project operations
  async saveProject(projectData: ProjectData): Promise<void> {
    try {
      await this.db.projects.put(projectData);
    } catch (error) {
      throw new Error(`Failed to save project: ${error}`);
    }
  }

  async loadProject(projectId: string): Promise<ProjectData | undefined> {
    try {
      return await this.db.projects.get(projectId);
    } catch (error) {
      throw new Error(`Failed to load project: ${error}`);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.projects, this.db.autoSaves, async () => {
        await this.db.projects.delete(projectId);
        await this.db.autoSaves.where('projectId').equals(projectId).delete();
      });
    } catch (error) {
      throw new Error(`Failed to delete project: ${error}`);
    }
  }

  async getAllProjects(): Promise<ProjectData[]> {
    try {
      return await this.db.projects.toArray();
    } catch (error) {
      throw new Error(`Failed to get projects: ${error}`);
    }
  }

  async getRecentProjects(limit = 10): Promise<ProjectData[]> {
    try {
      return await this.db.getRecentProjects(limit);
    } catch (error) {
      throw new Error(`Failed to get recent projects: ${error}`);
    }
  }

  async searchProjects(query: string): Promise<ProjectData[]> {
    try {
      return await this.db.searchProjects(query);
    } catch (error) {
      throw new Error(`Failed to search projects: ${error}`);
    }
  }

  // Auto-save operations
  async createAutoSave(projectId: string, data: ProjectData): Promise<void> {
    try {
      const autoSave: AutoSaveSnapshot = {
        id: `${projectId}-${Date.now()}`,
        projectId,
        timestamp: new Date(),
        data
      };

      await this.db.autoSaves.add(autoSave);
      await this.db.cleanupAutoSaves(projectId);
    } catch (error) {
      throw new Error(`Failed to create auto-save: ${error}`);
    }
  }

  async getAutoSaveHistory(projectId: string, limit = 5): Promise<AutoSaveSnapshot[]> {
    try {
      return await this.db.getAutoSaveHistory(projectId, limit);
    } catch (error) {
      throw new Error(`Failed to get auto-save history: ${error}`);
    }
  }

  async restoreFromAutoSave(autoSaveId: string): Promise<ProjectData | undefined> {
    try {
      const autoSave = await this.db.autoSaves.get(autoSaveId);
      return autoSave?.data;
    } catch (error) {
      throw new Error(`Failed to restore from auto-save: ${error}`);
    }
  }

  // Import/Export operations
  async exportProject(projectId: string): Promise<string> {
    try {
      const project = await this.loadProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      return JSON.stringify(project, null, 2);
    } catch (error) {
      throw new Error(`Failed to export project: ${error}`);
    }
  }

  async importProject(jsonData: string): Promise<ProjectData> {
    try {
      const projectData = JSON.parse(jsonData) as ProjectData;
      
      // Validate project data structure
      if (!projectData.id || !projectData.name || !Array.isArray(projectData.nodes)) {
        throw new Error('Invalid project data format');
      }

      // Generate new ID to avoid conflicts
      const newProjectData: ProjectData = {
        ...projectData,
        id: `imported-${Date.now()}`,
        name: `${projectData.name} (Imported)`,
        metadata: {
          ...projectData.metadata,
          created: new Date(),
          modified: new Date()
        }
      };

      await this.saveProject(newProjectData);
      return newProjectData;
    } catch (error) {
      throw new Error(`Failed to import project: ${error}`);
    }
  }

  // Database maintenance
  async clearDatabase(): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.projects, this.db.autoSaves, async () => {
        await this.db.projects.clear();
        await this.db.autoSaves.clear();
      });
    } catch (error) {
      throw new Error(`Failed to clear database: ${error}`);
    }
  }

  async getDatabaseStats(): Promise<{
    projectCount: number;
    autoSaveCount: number;
    totalSize: number;
  }> {
    try {
      const projectCount = await this.db.projects.count();
      const autoSaveCount = await this.db.autoSaves.count();
      
      // Estimate size (rough calculation)
      const projects = await this.db.projects.toArray();
      const autoSaves = await this.db.autoSaves.toArray();
      const totalSize = JSON.stringify([...projects, ...autoSaves]).length;

      return {
        projectCount,
        autoSaveCount,
        totalSize
      };
    } catch (error) {
      throw new Error(`Failed to get database stats: ${error}`);
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();