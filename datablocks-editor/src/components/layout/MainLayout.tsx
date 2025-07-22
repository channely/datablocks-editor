import React, { useState, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ProjectToolbar } from './ProjectToolbar';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  onSidebarToggle?: (collapsed: boolean) => void;
  onBottomPanelResize?: (height: number) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sidebar,
  rightPanel,
  bottomPanel,
  onSidebarToggle,
  onBottomPanelResize,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(256); // 16rem in pixels
  const [isResizing, setIsResizing] = useState(false);

  const handleSidebarToggle = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    onSidebarToggle?.(newCollapsed);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newHeight = window.innerHeight - e.clientY;
      const minHeight = 200;
      const maxHeight = window.innerHeight * 0.7;

      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setBottomPanelHeight(clampedHeight);
      onBottomPanelResize?.(clampedHeight);
    },
    [isResizing, onBottomPanelResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSidebarToggle}
            className="p-1"
          >
            {sidebarCollapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5" />
            )}
          </Button>
          <h1 className="text-xl font-semibold">DataBlocks Editor</h1>
        </div>
        
        <ProjectToolbar />
      </header>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar */}
        <aside
          className={cn(
            'bg-gray-800 border-r border-gray-700 transition-all duration-300 flex-shrink-0',
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
          )}
        >
          {sidebar}
        </aside>

        {/* Center content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Main canvas area */}
          <main className="flex-1 bg-gray-900 relative min-h-0">
            {children}
          </main>

          {/* Bottom panel with resize handle */}
          {bottomPanel && (
            <div
              className="bg-gray-800 border-t border-gray-700 flex-shrink-0"
              style={{ height: bottomPanelHeight }}
            >
              {/* Resize handle */}
              <div
                className="h-1 bg-gray-700 hover:bg-gray-600 cursor-row-resize transition-colors"
                onMouseDown={handleMouseDown}
              />
              <div className="h-full overflow-hidden">{bottomPanel}</div>
            </div>
          )}
        </div>

        {/* Right panel */}
        {rightPanel && (
          <aside className="w-80 bg-gray-800 border-l border-gray-700 flex-shrink-0">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
};
