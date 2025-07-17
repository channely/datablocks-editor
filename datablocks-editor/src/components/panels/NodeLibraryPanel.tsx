import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface NodeCategory {
  id: string;
  name: string;
  nodes: NodeType[];
  collapsed?: boolean;
}

interface NodeType {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Mock data for demonstration
const mockCategories: NodeCategory[] = [
  {
    id: 'input',
    name: 'INPUT',
    nodes: [
      { id: 'file', name: 'File', description: 'Upload CSV, JSON, Excel files', category: 'input' },
      { id: 'paste', name: 'Paste', description: 'Paste table or JSON data', category: 'input' },
      { id: 'http', name: 'HTTP Request', description: 'Fetch data from API', category: 'input' },
      { id: 'example', name: 'Example Data', description: 'Use preset sample data', category: 'input' }
    ]
  },
  {
    id: 'transform',
    name: 'TRANSFORM',
    nodes: [
      { id: 'filter', name: 'Filter', description: 'Filter rows by conditions', category: 'transform' },
      { id: 'sort', name: 'Sort', description: 'Sort data by columns', category: 'transform' },
      { id: 'group', name: 'Group', description: 'Group and aggregate data', category: 'transform' },
      { id: 'merge', name: 'Merge', description: 'Combine multiple datasets', category: 'transform' }
    ]
  },
  {
    id: 'visualization',
    name: 'VISUALIZATION',
    nodes: [
      { id: 'chart', name: 'Chart', description: 'Create bar, line, scatter plots', category: 'visualization' },
      { id: 'table', name: 'Table', description: 'Display data in table format', category: 'visualization' }
    ]
  }
];

export const NodeLibraryPanel: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState(mockCategories);

  const filteredCategories = categories.map(category => ({
    ...category,
    nodes: category.nodes.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0);

  const toggleCategory = (categoryId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, collapsed: !cat.collapsed } : cat
    ));
  };

  const handleNodeDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4">
        <h2 className="text-lg font-medium mb-3 text-gray-100">Node Library</h2>
        <div className="relative">
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredCategories.map(category => (
          <div key={category.id} className="border border-gray-700 rounded-lg">
            <button
              className="w-full px-3 py-2 text-left bg-gray-750 hover:bg-gray-700 rounded-t-lg border-b border-gray-700 flex items-center justify-between"
              onClick={() => toggleCategory(category.id)}
            >
              <span className="text-sm font-medium text-gray-300">{category.name}</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  category.collapsed ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {!category.collapsed && (
              <div className="p-2 space-y-1">
                {category.nodes.map(node => (
                  <div
                    key={node.id}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-md cursor-move border border-gray-600 hover:border-gray-500 transition-colors"
                    draggable
                    onDragStart={(e) => handleNodeDragStart(e, node)}
                  >
                    <div className="font-medium text-gray-100 text-sm">{node.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{node.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};