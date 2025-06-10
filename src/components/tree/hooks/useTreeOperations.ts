import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { PrimitiveAtom } from 'jotai';
import { NodeApi } from 'react-arborist';
import { QueryService, Association, NodeType } from '@/api/pdp.api';
import { TreeNode, transformNodesToTreeNodes, sortTreeNodes } from '@/utils/tree.utils';
import { updateNodeChildren } from '@/components/tree/util';
import { descendantNodesAtom, activeDescendantsNodeAtom, hideUserNodesAtom } from '@/components/tree/tree-atoms';
import { v4 as uuidv4 } from 'uuid';

// Helper function to convert associations to tree nodes
function associationsToTreeNodes(associations: Association[], parentId: string, isUserTree: boolean): TreeNode[] {
	return associations.map(association => {
		// For user tree, use the target node; for target tree, use the ua node
		const displayNode = isUserTree ? association.target : association.ua;
		if (!displayNode) return null;
		
		return {
			id: uuidv4(),
			name: displayNode.name,
			type: displayNode.type,
			pmId: displayNode.id,
			properties: {
				...displayNode.properties,
				isAssociation: 'true',
				accessRights: association.accessRights.join(', '),
				// Store both sides of the association for display purposes
				uaNodeId: association.ua?.id || '',
				uaNodeName: association.ua?.name || '',
				targetNodeId: association.target?.id || '',
				targetNodeName: association.target?.name || ''
			},
			children: [],
			parent: parentId
		} as TreeNode;
	}).filter((node): node is TreeNode => node !== null);
}

export function useTreeOperations(
	treeDataAtom: PrimitiveAtom<TreeNode[]>,
	allowedTypes: NodeType[],
	isUserTree: boolean
) {
	const [treeData, setTreeData] = useAtom(treeDataAtom);
	const descendantNodes = useAtomValue(descendantNodesAtom);
	const setDescendantNodes = useSetAtom(descendantNodesAtom);
	const setActiveDescendantsNode = useSetAtom(activeDescendantsNodeAtom);
	const hideUserNodes = useAtomValue(hideUserNodesAtom);

	const fetchAndUpdateChildren = async (node: NodeApi, isDescendantNode: boolean) => {
		// Check if this is an association node
		const isAssociationNode = node.data.properties?.isAssociation === 'true';
		
		// For association nodes in user tree, fetch children of the target node
		let nodeIdToFetch = node.data.pmId;
		if (isAssociationNode && isUserTree) {
			// Use the target node ID stored in the association properties
			const targetNodeId = node.data.properties?.targetNodeId;
			if (targetNodeId) {
				nodeIdToFetch = targetNodeId;
			}
		}

		// Fetch children based on whether this is a descendant node
		const response = isDescendantNode
			? await QueryService.selfComputeAdjacentDescendantPrivileges(nodeIdToFetch)
			: await QueryService.selfComputeAdjacentAscendantPrivileges(nodeIdToFetch);

		// Extract and filter nodes
		const nodes = response
			.map(nodePriv => nodePriv.node)
			.filter((node): node is NonNullable<typeof node> => node !== undefined)
			.filter(node => {
				// For association nodes in user tree, also allow O and OA types
				if (isAssociationNode && isUserTree) {
					return allowedTypes.includes(node.type) || node.type === 'O' || node.type === 'OA';
				}
				return allowedTypes.includes(node.type);
			});
		
		const childrenTree = transformNodesToTreeNodes(nodes, node.data.id);

		// Fetch associations only if this is not an association node
		let associations: Association[] = [];
		if (!isAssociationNode) {
			try {
				if (isUserTree) {
					associations = await QueryService.getAssociationsWithSource(node.data.pmId);
				} else {
					associations = await QueryService.getAssociationsWithTarget(node.data.pmId);
				}
			} catch (error) {
				console.error('Failed to fetch associations:', error);
			}
		}

		// Convert associations to tree nodes
		const associationNodes = associationsToTreeNodes(associations, node.data.id, isUserTree);
		
		// Combine and sort all children
		let allChildren = sortTreeNodes([...associationNodes, ...childrenTree]);
		
		// Filter out UA and U nodes if hideUserNodes is active and not user tree
		if (hideUserNodes && !isUserTree) {
			allChildren = allChildren.filter(child => {
				// Keep the node if:
				// 1. It's not a UA or U node, OR
				// 2. It's an association (has isAssociation property)
				const isUserNode = child.type === 'UA' || child.type === 'U';
				const isAssociation = child.properties?.isAssociation === 'true';
				return !isUserNode || isAssociation;
			});
		}

		// Mark descendants if needed
		if (isDescendantNode) {
			const newDescendantNodes = new Set(descendantNodes);
			// Mark both actual descendants and associations in descendants mode
			allChildren.forEach(child => {
				newDescendantNodes.add(child.id);
			});
			setDescendantNodes(newDescendantNodes);
		}

		// Update tree data
		const updatedTreeData = updateNodeChildren(treeData, node.data.id, allChildren);
		setTreeData(updatedTreeData);

		return allChildren;
	};

	const toggleDescendants = async (node: NodeApi) => {
		const newDescendantNodes = new Set(descendantNodes);
		
		// Check if this node has descendant children currently showing
		const hasDescendantChildren = node.data.children?.some((child: TreeNode) => 
			descendantNodes.has(child.id)
		) || false;
		
		if (hasDescendantChildren) {
			// Turn off descendants mode
			const removeDescendants = (nodeId: string) => {
				const nodeToCheck = treeData.find(n => n.id === nodeId) || 
					treeData.flatMap(n => n.children || []).find(n => n.id === nodeId);
				
				if (nodeToCheck && nodeToCheck.children) {
					nodeToCheck.children.forEach((child: TreeNode) => {
						newDescendantNodes.delete(child.id);
						removeDescendants(child.id);
					});
				}
			};
			
			if (node.data.children) {
				node.data.children.forEach((child: TreeNode) => {
					newDescendantNodes.delete(child.id);
					removeDescendants(child.id);
				});
			}
			
			setDescendantNodes(newDescendantNodes);
			setActiveDescendantsNode(null); // Clear active descendants node
			await fetchAndUpdateChildren(node, false);
		} else {
			// Turn on descendants mode
			if (!node.isOpen) {
				node.toggle();
			}
			
			await fetchAndUpdateChildren(node, true);
			setActiveDescendantsNode(node.data.id); // Set this node as having active descendants
		}
	};

	return {
		fetchAndUpdateChildren,
		toggleDescendants,
		treeData,
		setTreeData,
		descendantNodes
	};
} 