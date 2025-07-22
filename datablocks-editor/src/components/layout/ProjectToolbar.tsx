import React, { useState } from 'react';
import {
  DocumentIcon,
  FolderOpenIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { ProjectDialog } from '../dialogs/ProjectDialog';
import { useProjectManager } from '../../hooks/useProjectManager';

export const ProjectToolbar: React.FC = () => {
  const [dialogMode, setDialogMode] = useState<'open' | 'save' | 'manage' | null>(null);
  const {
    currentProject,
    hasUnsavedChanges,
    loading,
    error,
    createNewProject,
    saveProject,
    exportProject,
    clearError
  } = useProjectManager();

  const handleNewProject = async () => {
    if (hasUnsavedChanges) {
      const confirmed = confirm(
        'You have unsaved changes. Creating a new project will lose these changes. Continue?'
      );
      if (!confirmed) return;
    }
    
    await createNewProject();
  };

  const handleSave = async () => {
    if (currentProject.id) {
      await saveProject();
    } else {
      setDialogMode('save');
    }
  };

  const handleExport = async () => {
    await exportProject();
  };

  const formatProjectName = (name?: string) => {
    if (!name) return 'Untitled Project';
    return name.length > 20 ? `${name.substring(0, 20)}...` : name;
  };

  const formatLastSaved = (lastSaved?: Date) => {
    if (!lastSaved) return 'Never saved';
    
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just saved';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* New Project */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewProject}
          disabled={loading.saving}
          title="New Project (Ctrl+N)"
        >
          <PlusIcon className="w-4 h-4" />
        </Button>

        {/* Open Project */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogMode('open')}
          disabled={loading.loading}
          title="Open Project (Ctrl+O)"
        >
          <FolderOpenIcon className="w-4 h-4" />
        </Button>

        {/* Save Project */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={loading.saving || (!hasUnsavedChanges && currentProject.id)}
          title="Save Project (Ctrl+S)"
          className={hasUnsavedChanges ? 'text-yellow-400' : ''}
        >
          <DocumentIcon className="w-4 h-4" />
        </Button>

        {/* Export Project */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          disabled={loading.exporting || !currentProject.id}
          title="Export Project"
        >
          <DocumentArrowDownIcon className="w-4 h-4" />
        </Button>

        {/* Import Project */}
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const projectManager = useProjectManager();
                await projectManager.importProject(file);
                e.target.value = ''; // Reset file input
              }
            }}
            className="hidden"
            disabled={loading.importing}
          />
          <span
            className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 text-gray-100 focus:ring-gray-500 px-3 py-1.5 text-sm rounded-md"
            title="Import Project"
          >
            <DocumentArrowUpIcon className="w-4 h-4" />
          </span>
        </label>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-600 mx-2" />

        {/* Project Info */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Project Name */}
          <div className="flex items-center gap-2 min-w-0">
            <DocumentIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {formatProjectName(currentProject.name)}
              {hasUnsavedChanges && <span className="text-yellow-400 ml-1">*</span>}
            </span>
          </div>

          {/* Last Saved */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <ClockIcon className="w-3 h-3" />
            <span>{formatLastSaved(currentProject.lastSaved)}</span>
          </div>

          {/* Loading Indicator */}
          {(loading.saving || loading.loading || loading.importing || loading.exporting) && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>
                {loading.saving && 'Saving...'}
                {loading.loading && 'Loading...'}
                {loading.importing && 'Importing...'}
                {loading.exporting && 'Exporting...'}
              </span>
            </div>
          )}

          {/* Error Indicator */}
          {error && (
            <button
              onClick={clearError}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
              title={error}
            >
              <ExclamationTriangleIcon className="w-3 h-3" />
              <span>Error</span>
            </button>
          )}
        </div>

        {/* Manage Projects */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogMode('manage')}
          title="Manage Projects"
          className="ml-2"
        >
          Manage
        </Button>
      </div>

      {/* Project Dialog */}
      {dialogMode && (
        <ProjectDialog
          isOpen={true}
          onClose={() => setDialogMode(null)}
          mode={dialogMode}
          onProjectSelect={(projectId) => {
            // Project loading is handled by the dialog
            setDialogMode(null);
          }}
        />
      )}
    </>
  );
};