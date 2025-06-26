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
			parent: parentId,
			expanded: false,
			selected: false,
			cachedSecondLevel: undefined,
			hasCachedSecondLevel: false // Let associations get their second level fetched like other nodes
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

		// Fetch second level for each first level child to cache expansion info
		const childrenWithSecondLevel = await Promise.all(
			allChildren.map(async (child) => {
				try {
					// No nodes are skipped - fetch second level for all nodes including associations

					// If we already have cached second level data for this node, reuse it
					// This can happen when the tree is refreshed but the node structure hasn't changed
					const existingNode = treeData.flatMap(n => [n, ...(n.children || [])]).find(n => n.pmId === child.pmId);
					if (existingNode?.hasCachedSecondLevel && existingNode.cachedSecondLevel) {
						return {
							...child,
							cachedSecondLevel: existingNode.cachedSecondLevel,
							hasCachedSecondLevel: true
						};
					}

					// Determine node ID to fetch for this child (handle association nodes)
					let childNodeIdToFetch = child.pmId;
					const childIsAssociation = child.properties?.isAssociation === 'true';
					if (childIsAssociation && isUserTree) {
						const targetNodeId = child.properties?.targetNodeId;
						if (targetNodeId) {
							childNodeIdToFetch = targetNodeId;
						}
					}

					// Fetch second level children
					const secondLevelResponse = isDescendantNode
						? await QueryService.selfComputeAdjacentDescendantPrivileges(childNodeIdToFetch)
						: await QueryService.selfComputeAdjacentAscendantPrivileges(childNodeIdToFetch);

					// Extract and filter second level nodes
					const secondLevelNodes = secondLevelResponse
						.map(nodePriv => nodePriv.node)
						.filter((node): node is NonNullable<typeof node> => node !== undefined)
						.filter(node => {
							// For association nodes in user tree, also allow O and OA types
							if (childIsAssociation && isUserTree) {
								return allowedTypes.includes(node.type) || node.type === 'O' || node.type === 'OA';
							}
							return allowedTypes.includes(node.type);
						});

					const secondLevelTree = transformNodesToTreeNodes(secondLevelNodes, child.id);

					// Fetch associations for second level
					let secondLevelAssociations: Association[] = [];
					if (!childIsAssociation) {
						try {
							if (isUserTree) {
								secondLevelAssociations = await QueryService.getAssociationsWithSource(child.pmId);
							} else {
								secondLevelAssociations = await QueryService.getAssociationsWithTarget(child.pmId);
							}
						} catch (error) {
							console.error('Failed to fetch second level associations:', error);
						}
					}

					const secondLevelAssociationNodes = associationsToTreeNodes(secondLevelAssociations, child.id, isUserTree);
					let secondLevelChildren = sortTreeNodes([...secondLevelAssociationNodes, ...secondLevelTree]);

					// Apply user node filtering to second level if needed
					if (hideUserNodes && !isUserTree) {
						secondLevelChildren = secondLevelChildren.filter(secondLevelChild => {
							const isUserNode = secondLevelChild.type === 'UA' || secondLevelChild.type === 'U';
							const isAssociation = secondLevelChild.properties?.isAssociation === 'true';
							return !isUserNode || isAssociation;
						});
					}

					return {
						...child,
						cachedSecondLevel: secondLevelChildren,
						hasCachedSecondLevel: true
					};
				} catch (error) {
					console.error(`Failed to fetch second level for node ${child.name}:`, error);
					return {
						...child,
						cachedSecondLevel: [],
						hasCachedSecondLevel: true
					};
				}
			})
		);

		// Mark descendants if needed
		if (isDescendantNode) {
			const newDescendantNodes = new Set(descendantNodes);
			// Mark both actual descendants and associations in descendants mode
			childrenWithSecondLevel.forEach(child => {
				newDescendantNodes.add(child.id);
			});
			setDescendantNodes(newDescendantNodes);
		}

		// Update tree data
		const updatedTreeData = updateNodeChildren(treeData, node.data.id, childrenWithSecondLevel);
		setTreeData(updatedTreeData);

		return childrenWithSecondLevel;
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

	const clearNodeChildren = (nodeId: string) => {
		const updatedTreeData = updateNodeChildren(treeData, nodeId, []);
		setTreeData(updatedTreeData);
	};

	return {
		fetchAndUpdateChildren,
		toggleDescendants,
		clearNodeChildren,
		treeData,
		setTreeData,
		descendantNodes
	};
} 