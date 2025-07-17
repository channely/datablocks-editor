import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '../ui/Input';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type {
  NodeDefinition,
  NodeCategory,
  NodeCategoryInfo,
} from '../../types';
import { nodeRegistry } from '../../utils/nodeRegistry';
import { registerExampleNodes } from '../../utils/examples';

interface NodeLibraryPanelProps {
  onNodeDrag?: (nodeType: string, nodeDefinition: NodeDefinition) => void;
}

interface CategoryState {
  [key: string]: boolean; // collapsed state for each category
}

// Initialize example nodes on first load
registerExampleNodes();

export const NodeLibraryPanel: React.FC<NodeLibraryPanelProps> = ({
  onNodeDrag,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryStates, setCategoryStates] = useState<CategoryState>({});
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Get all available nodes and categories from the registry
  const allNodes = useMemo(() => nodeRegistry.getAll(), []);
  const categories = useMemo(() => nodeRegistry.getCategories(), []);

  // Filter nodes based on search term
  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) {
      return allNodes;
    }
    return nodeRegistry.search(searchTerm);
  }, [allNodes, searchTerm]);

  // Group filtered nodes by category
  const categorizedNodes = useMemo(() => {
    const grouped = new Map<NodeCategory, NodeDefinition[]>();

    // Initialize all categories
    categories.forEach(category => {
      grouped.set(category.id, []);
    });

    // Group filtered nodes
    filteredNodes.forEach(node => {
      const categoryNodes = grouped.get(node.category) || [];
      categoryNodes.push(node);
      grouped.set(node.category, categoryNodes);
    });

    return grouped;
  }, [filteredNodes, categories]);

  // Toggle category collapsed state
  const toggleCategory = useCallback((categoryId: string) => {
    setCategoryStates(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  // Handle node drag start
  const handleNodeDragStart = useCallback(
    (event: React.DragEvent, node: NodeDefinition) => {
      // Set drag data for React Flow
      event.dataTransfer.setData('application/reactflow', node.type);
      event.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          nodeType: node.type,
          nodeDefinition: node,
        })
      );
      event.dataTransfer.effectAllowed = 'move';

      // Call optional callback
      onNodeDrag?.(node.type, node);
    },
    [onNodeDrag]
  );

  // Handle node preview (hover)
  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNode(nodeId);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Get category icon
  const getCategoryIcon = (category: NodeCategoryInfo) => {
    return category.icon || '📦';
  };

  // Get node icon
  const getNodeIcon = (node: NodeDefinition) => {
    return node.icon || '⚙️';
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold mb-3 text-gray-100">节点库</h2>

        {/* Search Input */}
        <div className="relative">
          <Input
            placeholder="搜索节点..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-8 bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Summary */}
        {searchTerm && (
          <div className="mt-2 text-xs text-gray-400">
            找到 {filteredNodes.length} 个节点
          </div>
        )}
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto">
        {categories.map(category => {
          const categoryNodes = categorizedNodes.get(category.id) || [];
          const isCollapsed = categoryStates[category.id] || false;
          const hasNodes = categoryNodes.length > 0;

          // Skip empty categories when searching
          if (searchTerm && !hasNodes) {
            return null;
          }

          return (
            <div
              key={category.id}
              className="border-b border-gray-700 last:border-b-0"
            >
              {/* Category Header */}
              <button
                className="w-full px-4 py-3 text-left bg-gray-800 hover:bg-gray-750 flex items-center justify-between transition-colors"
                onClick={() => toggleCategory(category.id)}
                disabled={!hasNodes}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getCategoryIcon(category)}</span>
                  <span className="text-sm font-medium text-gray-300">
                    {category.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                    {categoryNodes.length}
                  </span>
                </div>
                {hasNodes && (
                  <div className="text-gray-400">
                    {isCollapsed ? (
                      <ChevronRightIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </div>
                )}
              </button>

              {/* Category Nodes */}
              {!isCollapsed && hasNodes && (
                <div className="bg-gray-850">
                  {categoryNodes.map(node => (
                    <div
                      key={node.id}
                      className={`relative p-3 mx-2 my-1 bg-gray-800 hover:bg-gray-700 rounded-md cursor-move border transition-all duration-200 ${
                        hoveredNode === node.id
                          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      draggable
                      onDragStart={e => handleNodeDragStart(e, node)}
                      onMouseEnter={() => handleNodeHover(node.id)}
                      onMouseLeave={() => handleNodeHover(null)}
                    >
                      {/* Node Header */}
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 text-lg">
                          {getNodeIcon(node)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-100 text-sm truncate">
                            {node.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {node.description}
                          </div>
                        </div>
                      </div>

                      {/* Node Details (shown on hover) */}
                      {hoveredNode === node.id && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <div className="space-y-2">
                            {/* Inputs */}
                            {node.inputs.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-300 mb-1">
                                  输入 ({node.inputs.length})
                                </div>
                                <div className="space-y-1">
                                  {node.inputs.slice(0, 3).map(input => (
                                    <div
                                      key={input.id}
                                      className="text-xs text-gray-400 flex items-center space-x-2"
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full ${input.required ? 'bg-red-400' : 'bg-gray-500'}`}
                                      />
                                      <span className="truncate">
                                        {input.name}
                                      </span>
                                      <span className="text-gray-500">
                                        ({input.type})
                                      </span>
                                    </div>
                                  ))}
                                  {node.inputs.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                      +{node.inputs.length - 3} 更多...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Outputs */}
                            {node.outputs.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-300 mb-1">
                                  输出 ({node.outputs.length})
                                </div>
                                <div className="space-y-1">
                                  {node.outputs.slice(0, 3).map(output => (
                                    <div
                                      key={output.id}
                                      className="text-xs text-gray-400 flex items-center space-x-2"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-green-400" />
                                      <span className="truncate">
                                        {output.name}
                                      </span>
                                      <span className="text-gray-500">
                                        ({output.type})
                                      </span>
                                    </div>
                                  ))}
                                  {node.outputs.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                      +{node.outputs.length - 3} 更多...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Tags */}
                            {node.tags && node.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {node.tags.slice(0, 3).map(tag => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {node.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{node.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Drag Indicator */}
                      <div className="absolute top-2 right-2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {filteredNodes.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-sm">
              {searchTerm
                ? `未找到匹配 "${searchTerm}" 的节点`
                : '暂无可用节点'}
            </div>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                清除搜索
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
