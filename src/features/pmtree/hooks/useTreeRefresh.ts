import { PrimitiveAtom, useAtom } from 'jotai';
import { TreeApi, NodeApi } from 'react-arborist';
import {TreeNode, updateNodeChildren} from '@/features/pmtree/tree-utils';
import { TreeDirection, TreeFilterConfig } from './usePMTreeOperations';
import { fetchAllFilteredChildren } from '../tree-data-fetcher';
import { NodeType } from '@/shared/api/pdp.api';

/**
 * Hook for refreshing tree nodes with filtered data while preserving expansion state
 */
export function useTreeRefresh(
  treeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null>,
  treeDataAtom: PrimitiveAtom<TreeNode[]>,
  direction: TreeDirection = 'descendants'
) {
  const [treeApi] = useAtom(treeApiAtom);
  const [, setTreeData] = useAtom(treeDataAtom);

  /**
   * Refreshes a single node's children with new filter config
   * Fetches fresh data from API without merging with existing children
   */
  const refreshNodeChildren = async (
    node: NodeApi<TreeNode>, 
    filterConfig: TreeFilterConfig
  ): Promise<void> => {
    if (!node.data.pmId || !node.isOpen) return;

    try {
      // Fetch new filtered children - fresh data from API
      const newFilteredChildren = await fetchAllFilteredChildren(node, {
        direction,
        filterConfig,
        parentNodeId: node.data.id,
        parentPmId: node.data.pmId
      });

      // Replace children completely with fresh filtered data
      setTreeData(currentTreeData => {
        return updateNodeChildren(currentTreeData, node.data.id, newFilteredChildren);
      });
    } catch (error) {
      console.error(`Failed to refresh children for node ${node.data.name}:`, error);
    }
  };

  /**
   * Gets all currently open nodes in the tree
   */
  const getAllOpenNodes = (): NodeApi<TreeNode>[] => {
    if (!treeApi) return [];
    return treeApi.visibleNodes.filter(node => node.isOpen);
  };

  /**
   * Recursively apply filters to existing tree data by marking nodes as hidden/visible
   * This preserves the complete tree structure while controlling visibility
   */
  const applyFiltersToExistingData = (nodes: TreeNode[], filterConfig: TreeFilterConfig): TreeNode[] => {
    return nodes.map(node => {
      const shouldBeVisible = !filterConfig?.nodeTypes?.length ||
          node.isAssociation ||
        filterConfig.nodeTypes.includes(node.type as NodeType);

      // Recursively apply filters to children if they exist
      const processedChildren = node.children && node.children.length > 0
        ? applyFiltersToExistingData(node.children, filterConfig)
        : node.children;

      return {
        ...node,
        hidden: !shouldBeVisible,
        children: processedChildren
      };
    });
  };

  /**
   * Refreshes all currently open nodes with new filter config
   * Uses a gentle approach that filters existing data without structural changes
   */
  const refreshAllOpenNodes = async (filterConfig: TreeFilterConfig): Promise<void> => {
    // Simply apply filters to existing tree data without fetching new data
    // This should preserve expansion state since we're not changing node IDs or structure dramatically
    setTreeData(currentTreeData => {
      return applyFiltersToExistingData(currentTreeData, filterConfig);
    });
  };

  return {
    refreshNodeChildren,
    refreshAllOpenNodes,
    getAllOpenNodes
  };
}