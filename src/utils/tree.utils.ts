import { Node } from '@/api/pdp.api';

export interface TreeNode {
  id: string; // UUID v4
  pmId: string; // Original Node ID from PDP (int64 as string)
  name: string;
  type: string;
  properties: Record<string, string>;
  children?: TreeNode[];
  parent?: string; // Parent tree node ID (UUID)
  expanded?: boolean;
  selected?: boolean;
}

/**
 * Define the hierarchical ordering of node types
 * Lower numbers come first in the sort order
 */
const NODE_TYPE_ORDER = new Map([
  ['PC', 1],  // Policy Class
  ['UA', 2],  // User Attribute  
  ['OA', 3],  // Object Attribute
  ['U', 4],   // User
  ['O', 5],   // Object
]);

/**
 * Sorts tree nodes according to hierarchical type order with associations first
 * Order: Associations, then UA/OA, then U/O
 * and then alphabetically by name within each type group
 * @param nodes - Array of nodes to sort
 * @returns Sorted array of nodes
 */
export function sortTreeNodes<T extends { type: string; name: string; properties?: Record<string, string> }>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    // Check if nodes are associations
    const aIsAssociation = a.properties?.isAssociation === 'true';
    const bIsAssociation = b.properties?.isAssociation === 'true';
    
    // Associations always come first
    if (aIsAssociation && !bIsAssociation) return -1;
    if (!aIsAssociation && bIsAssociation) return 1;
    
    // If both are associations, sort by underlying type then name
    if (aIsAssociation && bIsAssociation) {
      const typeOrderA = NODE_TYPE_ORDER.get(a.type)!;
      const typeOrderB = NODE_TYPE_ORDER.get(b.type)!;
      
      if (typeOrderA !== typeOrderB) {
        return typeOrderA - typeOrderB;
      }
      
      return a.name.localeCompare(b.name);
    }
    
    // For non-associations, use regular type hierarchy
    const typeOrderA = NODE_TYPE_ORDER.get(a.type)!;
    const typeOrderB = NODE_TYPE_ORDER.get(b.type)!;
    
    if (typeOrderA !== typeOrderB) {
      return typeOrderA - typeOrderB;
    }
    
    // If same type, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Transforms a Node from the PDP API into a TreeNode structure
 * @param node - The Node object from the PDP API
 * @param parentId - Optional parent tree node ID (UUID)
 * @returns TreeNode with UUID as id and Node.id as pmId
 */
export function transformNodeToTreeNode(
  node: Node, 
  parentId?: string
): TreeNode {
  return {
    id: crypto.randomUUID(),
    pmId: node.id,
    name: node.name,
    type: node.type,
    properties: node.properties,
    children: [],
    parent: parentId,
    expanded: false,
    selected: false,
  };
}

/**
 * Transforms multiple Nodes into TreeNodes with proper sorting
 * @param nodes - Array of Node objects from the PDP API
 * @param parentId - Optional parent tree node ID (UUID)
 * @returns Sorted array of TreeNodes
 */
export function transformNodesToTreeNodes(
  nodes: Node[], 
  parentId?: string
): TreeNode[] {
  // First transform all nodes, then sort them
  const treeNodes = nodes.map(node => transformNodeToTreeNode(node, parentId));
  return sortTreeNodes(treeNodes);
}

/**
 * Finds a tree node by its pmId (original PDP Node ID)
 * @param treeNodes - Array of tree nodes to search
 * @param pmId - The original Node ID from PDP (string)
 * @returns TreeNode if found, undefined otherwise
 */
export function findTreeNodeByPmId(
  treeNodes: TreeNode[], 
  pmId: string
): TreeNode | undefined {
  for (const node of treeNodes) {
    if (node.pmId === pmId) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findTreeNodeByPmId(node.children, pmId);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Finds a tree node by its UUID
 * @param treeNodes - Array of tree nodes to search
 * @param id - The UUID of the tree node
 * @returns TreeNode if found, undefined otherwise
 */
export function findTreeNodeById(
  treeNodes: TreeNode[], 
  id: string
): TreeNode | undefined {
  for (const node of treeNodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findTreeNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Updates a tree node's properties by its UUID
 * @param treeNodes - Array of tree nodes to update
 * @param id - The UUID of the tree node to update
 * @param updates - Partial TreeNode object with updates
 * @returns boolean indicating if the update was successful
 */
export function updateTreeNodeById(
  treeNodes: TreeNode[], 
  id: string, 
  updates: Partial<TreeNode>
): boolean {
  for (const node of treeNodes) {
    if (node.id === id) {
      Object.assign(node, updates);
      return true;
    }
    if (node.children && node.children.length > 0) {
      const updated = updateTreeNodeById(node.children, id, updates);
      if (updated) return true;
    }
  }
  return false;
}

/**
 * Finds the correct insertion index for a new tree node to maintain sorted order
 * @param children - Array of existing child nodes
 * @param newNode - The new node to insert
 * @returns Index where the new node should be inserted
 */
export function findInsertionIndex(children: TreeNode[], newNode: TreeNode): number {
  const newNodeIsAssociation = newNode.properties?.isAssociation === 'true';
  const newNodeTypeOrder = NODE_TYPE_ORDER.get(newNode.type)!;
  
  for (let i = 0; i < children.length; i++) {
    const childIsAssociation = children[i].properties?.isAssociation === 'true';
    const childTypeOrder = NODE_TYPE_ORDER.get(children[i].type)!;
    
    // If new node is association and child is not, insert before child
    if (newNodeIsAssociation && !childIsAssociation) {
      return i;
    }
    
    // If new node is not association but child is, continue to next child
    if (!newNodeIsAssociation && childIsAssociation) {
      continue;
    }
    
    // If both are associations or both are non-associations, compare by type then name
    if (newNodeIsAssociation === childIsAssociation) {
      // If new node should come before this child by type
      if (newNodeTypeOrder < childTypeOrder) {
        return i;
      }
      
      // If same type, compare by name
      if (newNodeTypeOrder === childTypeOrder) {
        if (newNode.name.localeCompare(children[i].name) < 0) {
          return i;
        }
      }
    }
  }
  
  // If we get here, the new node should go at the end
  return children.length;
}

/**
 * Adds a child node to a parent tree node at the correct sorted position
 * @param treeNodes - Array of tree nodes
 * @param parentId - UUID of the parent tree node
 * @param childNode - The child TreeNode to add (or Node to transform)
 * @returns boolean indicating if the child was added successfully
 */
export function addChildToTreeNode(
  treeNodes: TreeNode[], 
  parentId: string, 
  childNode: TreeNode | Node
): boolean {
  const parent = findTreeNodeById(treeNodes, parentId);
  if (!parent) return false;

  const child = 'pmId' in childNode 
    ? childNode 
    : transformNodeToTreeNode(childNode as Node, parentId);

  if (!parent.children) {
    parent.children = [];
  }
  
  // Find the correct insertion index to maintain sorting
  const insertIndex = findInsertionIndex(parent.children, child);
  parent.children.splice(insertIndex, 0, child);
  
  return true;
}

/**
 * Removes a tree node by its UUID
 * @param treeNodes - Array of tree nodes
 * @param id - UUID of the tree node to remove
 * @returns boolean indicating if the node was removed successfully
 */
export function removeTreeNodeById(
  treeNodes: TreeNode[], 
  id: string
): boolean {
  for (let i = 0; i < treeNodes.length; i++) {
    if (treeNodes[i].id === id) {
      treeNodes.splice(i, 1);
      return true;
    }
    if (treeNodes[i].children && treeNodes[i].children!.length > 0) {
      const removed = removeTreeNodeById(treeNodes[i].children!, id);
      if (removed) return true;
    }
  }
  return false;
}

/**
 * Flattens a tree structure into a flat array of tree nodes
 * @param treeNodes - Array of tree nodes
 * @returns Flat array of all tree nodes
 */
export function flattenTreeNodes(treeNodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  
  for (const node of treeNodes) {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenTreeNodes(node.children));
    }
  }
  
  return result;
}

/**
 * Gets all ancestor tree nodes for a given tree node
 * @param treeNodes - Array of tree nodes to search
 * @param id - UUID of the tree node
 * @returns Array of ancestor TreeNodes from root to immediate parent
 */
export function getTreeNodeAncestors(
  treeNodes: TreeNode[], 
  id: string
): TreeNode[] {
  const ancestors: TreeNode[] = [];
  
  function findPath(nodes: TreeNode[], targetId: string, path: TreeNode[]): boolean {
    for (const node of nodes) {
      if (node.id === targetId) {
        ancestors.push(...path);
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (findPath(node.children, targetId, [...path, node])) {
          return true;
        }
      }
    }
    return false;
  }
  
  findPath(treeNodes, id, []);
  return ancestors;
} 