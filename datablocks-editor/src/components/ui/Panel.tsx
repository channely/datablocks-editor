import React from 'react';
import { cn } from '../../utils/cn';

export interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className,
  headerActions,
  collapsible = false,
  defaultCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapsed = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={cn('bg-gray-800 border border-gray-700 rounded-lg', className)}>
      {title && (
        <div
          className={cn(
            'px-4 py-3 border-b border-gray-700 flex items-center justify-between',
            collapsible && 'cursor-pointer hover:bg-gray-750'
          )}
          onClick={toggleCollapsed}
        >
          <h3 className="text-lg font-medium text-gray-100">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            {collapsible && (
              <button
                type="button"
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg
                  className={cn(
                    'w-5 h-5 transition-transform',
                    isCollapsed && 'rotate-180'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      {!isCollapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};