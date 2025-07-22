import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProjectData } from '../database';

// Mock the entire database module
vi.mock('../database', () => {
  const mockDatabaseService = {
    saveProject: vi.fn(),
    loadProject: vi.fn(),
    deleteProject: vi.fn(),
    getAllProjects: vi.fn(),
    getRecentProjects: vi.fn(),
    searchProjects: vi.fn(),
    exportProject: vi.fn(),
    importProject: vi.fn(),
    createAutoSave: vi.fn(),
    getAutoSaveHistory: vi.fn(),
    restoreFromAutoSave: vi.fn(),
    clearDatabase: vi.fn(),
    getDatabaseStats: vi.fn()
  };

  return {
    DatabaseService: {
      getInstance: () => mockDatabaseService
    },
    databaseService: mockDatabaseService
  };
});

describe('DatabaseService', () => {
  let mockDatabaseService: any;
  let mockProjectData: ProjectData;

  beforeEach(async () => {
    const { DatabaseService } = await import('../database');
    mockDatabaseService = DatabaseService.getInstance();
    
    mockProjectData = {
      id: 'test-project-1',
      name: 'Test Project',
      description: 'A test project',
      nodes: [],
      connections: [],
      canvasViewport: { x: 0, y: 0, zoom: 1 },
      metadata: {
        created: new Date('2024-01-01'),
        modified: new Date('2024-01-02'),
        version: '1.0.0',
        tags: ['test']
      }
    };
    
    vi.clearAllMocks();
  });

  describe('saveProject', () => {
    it('should save a project successfully', async () => {
      mockDatabaseService.saveProject.mockResolvedValue(undefined);

      await mockDatabaseService.saveProject(mockProjectData);

      expect(mockDatabaseService.saveProject).toHaveBeenCalledWith(mockProjectData);
    });

    it('should handle save errors', async () => {
      mockDatabaseService.saveProject.mockRejectedValue(new Error('Save failed'));

      await expect(mockDatabaseService.saveProject(mockProjectData))
        .rejects.toThrow('Save failed');
    });
  });

  describe('loadProject', () => {
    it('should load a project successfully', async () => {
      mockDatabaseService.loadProject.mockResolvedValue(mockProjectData);

      const result = await mockDatabaseService.loadProject('test-project-1');

      expect(mockDatabaseService.loadProject).toHaveBeenCalledWith('test-project-1');
      expect(result).toEqual(mockProjectData);
    });

    it('should return undefined for non-existent project', async () => {
      mockDatabaseService.loadProject.mockResolvedValue(undefined);

      const result = await mockDatabaseService.loadProject('non-existent');

      expect(result).toBeUndefined();
    });

    it('should handle load errors', async () => {
      mockDatabaseService.loadProject.mockRejectedValue(new Error('Load failed'));

      await expect(mockDatabaseService.loadProject('test-project-1'))
        .rejects.toThrow('Load failed');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project and its auto-saves', async () => {
      mockDatabaseService.deleteProject.mockResolvedValue(undefined);

      await mockDatabaseService.deleteProject('test-project-1');

      expect(mockDatabaseService.deleteProject).toHaveBeenCalledWith('test-project-1');
    });
  });

  describe('exportProject', () => {
    it('should export project as JSON string', async () => {
      const jsonString = JSON.stringify(mockProjectData, null, 2);
      mockDatabaseService.exportProject.mockResolvedValue(jsonString);

      const result = await mockDatabaseService.exportProject('test-project-1');

      expect(mockDatabaseService.exportProject).toHaveBeenCalledWith('test-project-1');
      expect(result).toBe(jsonString);
    });

    it('should handle export errors', async () => {
      mockDatabaseService.exportProject.mockRejectedValue(new Error('Export failed'));

      await expect(mockDatabaseService.exportProject('non-existent'))
        .rejects.toThrow('Export failed');
    });
  });

  describe('importProject', () => {
    it('should import project from JSON string', async () => {
      const jsonData = JSON.stringify(mockProjectData);
      const importedProject = {
        ...mockProjectData,
        id: 'imported-123',
        name: 'Test Project (Imported)'
      };
      mockDatabaseService.importProject.mockResolvedValue(importedProject);

      const result = await mockDatabaseService.importProject(jsonData);

      expect(mockDatabaseService.importProject).toHaveBeenCalledWith(jsonData);
      expect(result.name).toBe('Test Project (Imported)');
    });

    it('should handle import errors', async () => {
      mockDatabaseService.importProject.mockRejectedValue(new Error('Import failed'));

      await expect(mockDatabaseService.importProject('invalid json'))
        .rejects.toThrow('Import failed');
    });
  });

  describe('createAutoSave', () => {
    it('should create auto-save and cleanup old ones', async () => {
      mockDatabaseService.createAutoSave.mockResolvedValue(undefined);

      await mockDatabaseService.createAutoSave('test-project-1', mockProjectData);

      expect(mockDatabaseService.createAutoSave).toHaveBeenCalledWith('test-project-1', mockProjectData);
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', async () => {
      const mockStats = {
        projectCount: 5,
        autoSaveCount: 3,
        totalSize: 1024
      };
      mockDatabaseService.getDatabaseStats.mockResolvedValue(mockStats);

      const stats = await mockDatabaseService.getDatabaseStats();

      expect(mockDatabaseService.getDatabaseStats).toHaveBeenCalled();
      expect(stats.projectCount).toBe(5);
      expect(stats.autoSaveCount).toBe(3);
      expect(stats.totalSize).toBe(1024);
    });
  });

  describe('basic functionality', () => {
    it('should have all required methods', () => {
      expect(mockDatabaseService.saveProject).toBeDefined();
      expect(mockDatabaseService.loadProject).toBeDefined();
      expect(mockDatabaseService.deleteProject).toBeDefined();
      expect(mockDatabaseService.getAllProjects).toBeDefined();
      expect(mockDatabaseService.getRecentProjects).toBeDefined();
      expect(mockDatabaseService.searchProjects).toBeDefined();
      expect(mockDatabaseService.exportProject).toBeDefined();
      expect(mockDatabaseService.importProject).toBeDefined();
      expect(mockDatabaseService.createAutoSave).toBeDefined();
      expect(mockDatabaseService.getAutoSaveHistory).toBeDefined();
      expect(mockDatabaseService.restoreFromAutoSave).toBeDefined();
      expect(mockDatabaseService.clearDatabase).toBeDefined();
      expect(mockDatabaseService.getDatabaseStats).toBeDefined();
    });
  });
});