import React, { useState } from 'react';
import { 
  TableCellsIcon, 
  ExclamationTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { DataPreviewPanel } from './DataPreviewPanel';
import { ErrorLogPanel } from './ErrorLogPanel';
import { useAppStore } from '../../stores/appStore';
import type { NodeInstance } from '../../types';

interface BottomPanelProps {
  selectedNode?: NodeInstance | null;
  className?: string;
}

type TabType = 'data' | 'errors';

export const BottomPanel: React.FC<BottomPanelProps> = ({
  selectedNode,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('data');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { errors } = useAppStore();

  const tabs = [
    {
      id: 'data' as TabType,
      name: 'Data Preview',
      icon: TableCellsIcon,
      count: selectedNode ? 1 : 0,
    },
    {
      id: 'errors' as TabType,
      name: 'Error Log',
      icon: ExclamationTriangleIcon,
      count: errors.length,
    },
  ];

  const renderTabContent = () => {
    if (isCollapsed) return null;

    switch (activeTab) {
      case 'data':
        // Check if selectedNode has output data
        const nodeData = selectedNode?.outputs?.data;
        if (nodeData && nodeData.columns && nodeData.rows) {
          return <DataPreviewPanel data={nodeData} />;
        } else {
          return (
            <div className="flex items-center justify-center h-32 text-gray-400">
              {selectedNode ? 'No data available for this node' : 'Select a node to view data'}
            </div>
          );
        }
      case 'errors':
        return <ErrorLogPanel className="flex-1" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex flex-col bg-gray-900 border-t border-gray-700', className)}>
      {/* Tab Header */}
      <div className="flex items-center justify-between bg-gray-800 border-b border-gray-700">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isCollapsed) {
                    setIsCollapsed(false);
                  }
                }}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 text-sm font-medium border-r border-gray-700 transition-colors',
                  isActive
                    ? 'text-white bg-gray-900'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs rounded-full',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0">
          {renderTabContent()}
        </div>
      )}
    </div>
  );
};