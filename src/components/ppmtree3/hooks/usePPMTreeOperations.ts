import { useAtom, PrimitiveAtom } from 'jotai';
import { NodeApi } from 'react-arborist';
import { QueryService } from '@/api/pdp.api';
import { TreeNode, transformNodesToTreeNodes, sortTreeNodes } from '@/utils/tree.utils';
import {updateNodeChildren} from "@/components/ppmtree3/tree-utils";

export type TreeDirection = 'descendants' | 'ascendants';

export function usePPMTreeOperations(
	treeDataAtom: PrimitiveAtom<TreeNode[]>,
	direction: TreeDirection = 'descendants'
) {
	const [treeData, setTreeData] = useAtom(treeDataAtom);

	const fetchAndUpdateChildren = async (node: NodeApi<TreeNode>) => {
		// Fetch children based on direction
		const response = direction === 'descendants'
			? await QueryService.selfComputeAdjacentDescendantPrivileges(node.data.pmId)
			: await QueryService.selfComputeAdjacentAscendantPrivileges(node.data.pmId);

		// Extract nodes
		const nodes = response
			.map(nodePriv => nodePriv.node)
			.filter((node): node is NonNullable<typeof node> => node !== undefined);
		
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