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

export function updateNodeChildren(treeData: TreeNode[], nodeId: string, children: TreeNode[]): TreeNode[] {	
	// Sort the children before updating
	const sortedChildren = sortTreeNodes(children);
	
	return treeData.map((treeDataNode): TreeNode => {
		if (treeDataNode.id === nodeId) {
			return {
				...treeDataNode,
				children: sortedChildren
			};
		} else if (treeDataNode.children) {
			return {
				...treeDataNode,
				children: updateNodeChildren(treeDataNode.children, nodeId, children),
			};
		}
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
 * Based on node type - container types (PC, UA, OA) can have children
 */
export const shouldShowExpansionIcon = (node: TreeNode): boolean => {
	// Container node types that can have children show chevron
	// U and O nodes are leaf nodes and show dot
	return node.type === 'PC' || node.type === 'UA' || node.type === 'OA';
};