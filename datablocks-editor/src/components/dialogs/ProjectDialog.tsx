import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { projectManager } from '../../services/projectManager';
import type { ProjectData } from '../../services/database';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'open' | 'save' | 'manage';
  onProjectSelect?: (projectId: string) => void;
}

export const ProjectDialog: React.FC<ProjectDialogProps> = ({
  isOpen,
  onClose,
  mode,
  onProjectSelect
}) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAutoSaves, setShowAutoSaves] = useState(false);
  const [autoSaveHistory, setAutoSaveHistory] = useState<Array<{
    id: string;
    timestamp: Date;
    name: string;
  }>>([]);

  // Load projects on open
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      setSearchQuery('');
      setSelectedProject(null);
      setNewProjectName('');
      setShowAutoSaves(false);
    }
  }, [isOpen]);

  // Filter projects based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProjects(
        projects.filter(project =>
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query)
        )
      );
    }
  }, [projects, searchQuery]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const allProjects = await projectManager.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      await projectManager.createNewProject(newProjectName.trim());
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleOpenProject = async (projectId: string) => {
    try {
      await projectManager.loadProject(projectId);
      onProjectSelect?.(projectId);
      onClose();
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await projectManager.deleteProject(projectId);
      await loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleExportProject = async (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await projectManager.exportProject(projectId);
    } catch (error) {
      console.error('Failed to export project:', error);
    }
  };

  const handleImportProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await projectManager.importProject(file);
      await loadProjects();
    } catch (error) {
      console.error('Failed to import project:', error);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleShowAutoSaves = async (projectId: string) => {
    try {
      const history = await projectManager.getAutoSaveHistory(projectId);
      setAutoSaveHistory(history);
      setShowAutoSaves(true);
    } catch (error) {
      console.error('Failed to load auto-save history:', error);
    }
  };

  const handleRestoreAutoSave = async (autoSaveId: string) => {
    try {
      await projectManager.restoreFromAutoSave(autoSaveId);
      onClose();
    } catch (error) {
      console.error('Failed to restore auto-save:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'open' && 'Open Project'}
            {mode === 'save' && 'Save Project'}
            {mode === 'manage' && 'Manage Projects'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Panel */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-700 flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportProject}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm">
                    <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </label>
              </div>
            </div>

            {/* New Project Section (for save mode) */}
            {mode === 'save' && (
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-4">
                  <Input
                    type="text"
                    placeholder="Enter project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateNew()}
                  />
                  <Button
                    onClick={handleCreateNew}
                    disabled={!newProjectName.trim()}
                  >
                    Create New
                  </Button>
                </div>
              </div>
            )}

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-400">Loading projects...</div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-400">
                    {searchQuery ? 'No projects found' : 'No projects yet'}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`
                        bg-gray-700 rounded-lg p-4 cursor-pointer transition-all
                        hover:bg-gray-600 border-2
                        ${selectedProject === project.id ? 'border-blue-500' : 'border-transparent'}
                      `}
                      onClick={() => {
                        setSelectedProject(project.id);
                        if (mode === 'open') {
                          handleOpenProject(project.id);
                        }
                      }}
                    >
                      {/* Project Icon and Name */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <FolderIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <h3 className="font-medium text-white truncate">
                              {project.name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {project.nodes.length} nodes, {project.connections.length} connections
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {project.description && (
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="text-xs text-gray-400 mb-3">
                        <div>Created: {formatDate(project.metadata.created)}</div>
                        <div>Modified: {formatDate(project.metadata.modified)}</div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => handleShowAutoSaves(project.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <ClockIcon className="w-3 h-3" />
                          Auto-saves
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleExportProject(project.id, e)}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Export project"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteProject(project.id, e)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete project"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Auto-save Panel */}
          {showAutoSaves && (
            <div className="w-80 border-l border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-medium text-white">Auto-save History</h3>
                <button
                  onClick={() => setShowAutoSaves(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {autoSaveHistory.length === 0 ? (
                  <div className="text-gray-400 text-sm">No auto-saves found</div>
                ) : (
                  <div className="space-y-2">
                    {autoSaveHistory.map((save) => (
                      <div
                        key={save.id}
                        className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600 transition-colors"
                        onClick={() => handleRestoreAutoSave(save.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <DocumentIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-white font-medium">
                            Auto-save
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(save.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {mode === 'open' && selectedProject && (
              <Button onClick={() => handleOpenProject(selectedProject)}>
                Open Project
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};