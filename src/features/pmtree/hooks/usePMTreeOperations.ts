import React from 'react';
import { useAtom, PrimitiveAtom } from 'jotai';
import { NodeApi } from 'react-arborist';
import { NodeType } from '@/shared/api/pdp.types';
import { TreeNode, updateNodeChildren} from "@/features/pmtree/tree-utils";
import { notifications } from '@mantine/notifications';

export type TreeDirection = 'descendants' | 'ascendants';

export interface TreeFilterConfig {
	nodeTypes: NodeType[];
	showOutgoingAssociations: boolean;
	showIncomingAssociations: boolean;
}

export function usePMTreeOperations(
	treeDataAtom: PrimitiveAtom<TreeNode[]>,
	direction: TreeDirection = 'descendants',
	filterConfig?: TreeFilterConfig
) {
	const [treeData, setTreeData] = useAtom(treeDataAtom);

	const fetchAndUpdateChildren = async (node: NodeApi<TreeNode>) => {
		// Use the same data fetching logic as the tree refresh to ensure consistency
		const { fetchAllFilteredChildren } = await import('../tree-data-fetcher');
		
		const effectiveFilterConfig = filterConfig || {
			nodeTypes: [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O],
			showOutgoingAssociations: true,
			showIncomingAssociations: true
		};

		const allChildren = await fetchAllFilteredChildren(node, {
			direction,
			filterConfig: effectiveFilterConfig,
			parentNodeId: node.data.id,
			parentPmId: node.data.pmId!
		});

		// Update tree data
		const updatedTreeData = updateNodeChildren(treeData, node.data.id, allChildren);
		setTreeData(updatedTreeData);

		return allChildren;
	};

	const clearNodeChildren = (nodeId: string) => {
		const updatedTreeData = updateNodeChildren(treeData, nodeId, []);
		setTreeData(updatedTreeData);
	};

	const updateNodeLoadingState = (treeData: TreeNode[], nodeId: string, isLoading: boolean): TreeNode[] => {
		return treeData.map((treeDataNode): TreeNode => {
			if (treeDataNode.id === nodeId) {
				return {
					...treeDataNode,
					isLoading
				};
			} else if (treeDataNode.children) {
				return {
					...treeDataNode,
					children: updateNodeLoadingState(treeDataNode.children, nodeId, isLoading),
				};
			}
			return treeDataNode;
		});
	};

	const toggleNodeWithData = async (node: NodeApi<TreeNode>) => {
		// Don't allow if already loading or request is pending
		if (node.data.isLoading) {
			return;
		}

		// Check if the node is currently open (about to be closed)
		const isClosing = node.isOpen;

		// If closing, clear children and toggle
		if (isClosing) {
			clearNodeChildren(node.data.id);
			node.toggle();
		} else {
			// Set loading state
			setTreeData(prevData => updateNodeLoadingState(prevData, node.data.id, true));

			try {
				await fetchAndUpdateChildren(node);
				// Only toggle after children are loaded
				node.toggle();
			} catch (error) {
				console.error('Failed to fetch node children:', error);
				
				const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
				
				notifications.show({
					color: 'red',
					title: 'Failed to Load Child Nodes',
					message: `Unable to load children for "${node.data.name}". ${errorMessage}`,
					autoClose: 5000,
				});
			}
		}
	};

	return {
		fetchAndUpdateChildren,
		clearNodeChildren,
		toggleNodeWithData,
		treeData,
		setTreeData
	};
}