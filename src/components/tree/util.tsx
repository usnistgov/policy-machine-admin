import {v4 as uuidv4} from "uuid";
import {TreeNode, sortTreeNodes} from "@/utils/tree.utils";
import {Node, NodeType} from "@/api/pdp.api";
import {DescendantsIcon} from "@/components/icons/DescendantsIcon";
import {useMantineTheme} from "@mantine/core";

export const INDENT_NUM = 30;

export type NodeIconProps = {
	type: string,
	classes: any,
	isDescendant?: boolean,
}

export function NodeIcon({type, classes, isDescendant = false}: NodeIconProps) {
	const color = getTypeColor(type);

	return (
		<>
			{isDescendant ?
				<>
					<DescendantsIcon stroke={2} size={20} />
				</>
				:
				<></>
			}
			<div
				style={{
					borderRadius: '30%',
					color,
					//border: `solid 2px ${color}`,
				}}
				className={classes.nodeRowItem}
			>
				{type}
			</div>
		</>
	);
}

export function getTypeColor(type: string) {
	const theme = useMantineTheme();

	switch (type) {
		case NodeType.PC:
			return theme.colors.green[9];
		case NodeType.UA:
			return theme.colors.red[9];
		case NodeType.OA:
			return theme.colors.blue[9];
		case NodeType.U:
			return theme.colors.red[4];
		case NodeType.O:
			return theme.colors.blue[4];
		default:
			return theme.colors.gray[5];
	}
}

// Legacy function kept for backward compatibility, but recommend using transformNodesToTreeNodes from utils/tree.utils.ts
export function toTreeNodes(parentId: string, pmNodes: any[], allowedTypes: NodeType[], sortByType: boolean = false): TreeNode[] {
	console.warn('toTreeNodes is deprecated. Use transformNodesToTreeNodes from utils/tree.utils.ts instead');
	
	const treeNodes: TreeNode[] = [];

	// Use sortTreeNodes from utils if sorting is requested
	const nodesToProcess = sortByType ? sortTreeNodes([...pmNodes]) : pmNodes;

	for (const node of nodesToProcess) {
		if(!allowedTypes.includes(node.type)){
			continue;
		}

		treeNodes.push({
			id: uuidv4(),
			pmId: node.id,
			name: node.name,
			type: node.type,
			properties: node.properties || {},
			children: [],
			parent: parentId,
			expanded: false,
			selected: false,
		});
	}

	return treeNodes;
}

export function updateNodeChildren(treeData: TreeNode[], nodeId: string, children: TreeNode[]): TreeNode[] {
	console.log(nodeId, children)
	console.log(treeData);
	
	// Sort the children before updating
	const sortedChildren = sortTreeNodes(children);
	
	return treeData.map((treeDataNode): TreeNode => {
		console.log(treeDataNode)
		if (treeDataNode.id === nodeId) {
			console.log(1);
			return {
				...treeDataNode,
				children: sortedChildren
			};
		} else if (treeDataNode.children) {
			console.log(2);
			return {
				...treeDataNode,
				children: updateNodeChildren(treeDataNode.children, nodeId, children),
			};
		}
		console.log(3);
		return treeDataNode;
	});
}