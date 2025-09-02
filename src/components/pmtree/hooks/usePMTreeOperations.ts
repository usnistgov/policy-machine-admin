import { useAtom, PrimitiveAtom } from 'jotai';
import { NodeApi } from 'react-arborist';
import { QueryService, NodeType } from '@/api/pdp.api';
import { TreeNode, transformNodesToTreeNodes, sortTreeNodes } from '@/utils/tree.utils';
import {updateNodeChildren} from "@/components/pmtree/tree-utils";

export type TreeDirection = 'descendants' | 'ascendants';

export function usePMTreeOperations(
	treeDataAtom: PrimitiveAtom<TreeNode[]>,
	direction: TreeDirection = 'descendants',
	nodeTypeFilter?: NodeType[]
) {
	const [treeData, setTreeData] = useAtom(treeDataAtom);

	const fetchAndUpdateChildren = async (node: NodeApi<TreeNode>) => {
		// Fetch children based on direction
		const response = direction === 'descendants'
			? await QueryService.selfComputeAdjacentDescendantPrivileges(node.data.pmId)
			: await QueryService.selfComputeAdjacentAscendantPrivileges(node.data.pmId);

		// Extract nodes
		let nodes = response
			.map(nodePriv => nodePriv.node)
			.filter((node): node is NonNullable<typeof node> => node !== undefined);
		
		// Apply node type filter if provided
		if (nodeTypeFilter) {
			nodes = nodes.filter(node => nodeTypeFilter.includes(node.type));
		}
		
		const childrenTree = transformNodesToTreeNodes(nodes, node.data.id);
		const sorted = sortTreeNodes(childrenTree);

		// Update tree data
		const updatedTreeData = updateNodeChildren(treeData, node.data.id, sorted);
		setTreeData(updatedTreeData);

		return sorted;
	};

	const clearNodeChildren = (nodeId: string) => {
		const updatedTreeData = updateNodeChildren(treeData, nodeId, []);
		setTreeData(updatedTreeData);
	};

	return {
		fetchAndUpdateChildren,
		clearNodeChildren,
		treeData,
		setTreeData
	};
}