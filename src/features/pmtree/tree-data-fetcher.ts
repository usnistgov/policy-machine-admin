import { NodeApi } from 'react-arborist';
import { sortTreeNodes, transformNodesToTreeNodes, TreeNode, AssociationDirection } from "@/features/pmtree/tree-utils";
import * as QueryService from '@/shared/api/pdp_query.api';
import { TreeDirection, TreeFilterConfig } from './hooks/usePMTreeOperations';
import { withCriticalRetry } from '@/lib/retry-utils';


/**
 * Pure data fetching utilities for tree nodes
 */

export interface FetchChildrenOptions {
  direction: TreeDirection;
  filterConfig: TreeFilterConfig;
  parentNodeId: string;
  parentPmId: string;
}

/**
 * Fetches and transforms regular node children based on direction and filters
 */
export const fetchRegularChildren = async (
    parentPmId: string,
    direction: TreeDirection,
    filterConfig: TreeFilterConfig,
    parentNodeId: string
): Promise<TreeNode[]> => {
  try {
    // Fetch children based on direction (temporarily without retry for debugging)
    const response = direction === 'descendants'
        ? await QueryService.selfComputeAdjacentDescendantPrivileges(parentPmId)
        : await QueryService.selfComputeAdjacentAscendantPrivileges(parentPmId);

    // Extract and filter nodes
    let nodes = response
        .map(nodePriv => nodePriv.node)
        .filter((node): node is NonNullable<typeof node> => node !== undefined);

    // Apply node type filter from filterConfig
    if (filterConfig?.nodeTypes && filterConfig.nodeTypes.length > 0) {
      nodes = nodes.filter(node => filterConfig.nodeTypes.includes(node.type));
    }

    return transformNodesToTreeNodes(nodes, parentNodeId);
  } catch (error) {
    console.error('Failed to fetch regular children:', error);
    // Re-throw the error so parent components can handle it
    throw new Error(`Failed to load child nodes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Fetches association nodes (outgoing and incoming) based on filter config
 */
export const fetchAssociationChildren = async (
    parentPmId: string,
    filterConfig: TreeFilterConfig,
    parentNodeId: string
): Promise<TreeNode[]> => {
  const associationNodes: TreeNode[] = [];

  try {
    // Fetch outgoing associations only if enabled
    const shouldShowOutgoing = filterConfig?.showOutgoingAssociations ?? true;
    if (shouldShowOutgoing) {
      try {
        const outgoingAssociations = await QueryService.getAssociationsWithSource(parentPmId);
        for (const assoc of outgoingAssociations) {
          if (assoc.target) {
            associationNodes.push({
              id: crypto.randomUUID(),
              pmId: assoc.target.id,
              name: assoc.target.name,
              type: assoc.target.type,
              children: [],
              parent: parentNodeId,
              isAssociation: true,
              associationDetails: {
                type: AssociationDirection.Outgoing,
                accessRightSet: assoc.accessRights,
              },
            });
          }
        }
      } catch (error) {
        console.warn('Failed to fetch outgoing associations:', error);
        // Don't throw - associations are supplementary data
      }
    }

    // Fetch incoming associations only if enabled
    const shouldShowIncoming = filterConfig?.showIncomingAssociations ?? true;
    if (shouldShowIncoming) {
      try {
        const incomingAssociations = await QueryService.getAssociationsWithTarget(parentPmId);
        for (const assoc of incomingAssociations) {
          if (assoc.ua) {
            // Association nodes are not filtered by node type - they show regardless of type filters
            associationNodes.push({
              id: crypto.randomUUID(),
              pmId: assoc.ua.id,
              name: assoc.ua.name,
              type: assoc.ua.type,
              isAssociation: true,
              children: [],
              parent: parentNodeId,
              associationDetails: {
                type: AssociationDirection.Incoming,
                accessRightSet: assoc.accessRights
              }
            });
          }
        }
      } catch (error) {
        console.warn('Failed to fetch incoming associations:', error);
        // Don't throw - associations are supplementary data
      }
    }
  } catch (error) {
    console.error('Failed to fetch associations:', error);
    // Don't throw for associations - they're supplementary data
  }

  return associationNodes;
};

/**
 * Fetches all children (regular + associations) for a node with given filter config
 */
export const fetchAllFilteredChildren = async (
    node: NodeApi<TreeNode>,
    options: FetchChildrenOptions
): Promise<TreeNode[]> => {
  const { direction, filterConfig, parentNodeId, parentPmId } = options;

  // Fetch regular children and associations with graceful error handling
  const results = await Promise.allSettled([
    fetchRegularChildren(parentPmId, direction, filterConfig, parentNodeId),
    fetchAssociationChildren(parentPmId, filterConfig, parentNodeId)
  ]);

  // Extract successful results
  const regularChildren = results[0].status === 'fulfilled' ? results[0].value : [];
  const associationChildren = results[1].status === 'fulfilled' ? results[1].value : [];

  // Log any failures for debugging
  if (results[0].status === 'rejected') {
    console.error('Failed to fetch regular children:', results[0].reason);
    // Re-throw for regular children as they are critical
    throw new Error(`Failed to load node children: ${results[0].reason?.message || 'Unknown error'}`);
  }
  
  if (results[1].status === 'rejected') {
    console.warn('Failed to fetch associations (continuing without them):', results[1].reason);
    // Don't throw for associations - they're supplementary
  }

  // Combine and sort all children
  const allChildren = [...regularChildren, ...associationChildren];
  return sortTreeNodes(allChildren);
};