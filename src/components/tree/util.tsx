import {v4 as uuidv4} from "uuid";
import {TreeNode, sortTreeNodes} from "@/utils/tree.utils";
import {Node, NodeType} from "@/api/pdp.api";
import {DescendantsIcon} from "@/components/icons/DescendantsIcon";
import {px, useMantineTheme} from "@mantine/core";

export const INDENT_NUM = 30;

export type NodeIconProps = {
	type: string,
	isDescendant?: boolean,
	size?: string,
	fontSize?: string,
	style?: React.CSSProperties,
}

export function NodeIcon({type, isDescendant = false, size = '16px', fontSize = '11px', style}: NodeIconProps) {
	const color = getTypeColor(type);
	const numericSize = parseInt(size);

	return (
		<>
			{isDescendant ?
				<>
					<DescendantsIcon stroke={2} color={color} size={numericSize} style={{marginRight: "8px"}} />
				</>
				:
				<></>
			}
			<div
				style={{
					borderRadius: '30%',
					color,
					fontSize,
					fontWeight: 'bold',
					width: size,
					height: size,
					display: 'flex',
					textAlign: 'center',
					justifyContent: 'center',
					alignItems: 'center',
					...style,
				}}
				
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
			cachedSecondLevel: undefined,
			hasCachedSecondLevel: false,
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

export const isValidAssignment = (selectedType: string, targetType: string): boolean => {
	switch (selectedType) {
		case 'PC': return false; // PC cannot be assigned to anything
		case 'OA': return targetType === 'OA' || targetType === 'PC';
		case 'UA': return targetType === 'UA' || targetType === 'PC';
		case 'O': return targetType === 'OA' || targetType === 'PC';
		case 'U': return targetType === 'UA';
		default: return false;
	}
};

/**
 * Determines if a node should show expansion icon (chevron) or leaf icon (dot)
 * Based on cached second level children
 */
export const shouldShowExpansionIcon = (node: TreeNode): boolean => {
	// If we have cached second level data, use it to determine icon
	if (node.hasCachedSecondLevel && node.cachedSecondLevel !== undefined) {
		return node.cachedSecondLevel.length > 0;
	}
	
	// If no cached data and this is a container type (PC, UA, OA), show chevron
	// This maintains backward compatibility for nodes without cached data
	// U and O nodes without cached data default to dot (no expansion)
	return node.type === 'PC' || node.type === 'UA' || node.type === 'OA';
};