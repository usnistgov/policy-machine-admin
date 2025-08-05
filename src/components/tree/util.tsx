import {v4 as uuidv4} from "uuid";
import {TreeNode, sortTreeNodes} from "@/utils/tree.utils";
import {Node, NodeType} from "@/api/pdp.api";
import {DescendantsIcon} from "@/components/icons/DescendantsIcon";
import {px, useMantineTheme} from "@mantine/core";

export const INDENT_NUM = 30;

export type NodeIconProps = {
	type: string,
	size?: string,
	fontSize?: string,
	style?: React.CSSProperties,
}

export function NodeIcon({type, size = '16px', fontSize = '11px', style}: NodeIconProps) {
	const color = getTypeColor(type);

	return (
		<span
			style={{
				borderRadius: '30%',
				color,
				fontSize,
				fontWeight: 'bold',
				width: size,
				height: size,
				display: 'inline-flex',
				textAlign: 'center',
				justifyContent: 'center',
				alignItems: 'center',
				...style,
			}}

		>
			{type}
		</span>
	);
}

export function getTypeColor(type: string) {
	const theme = useMantineTheme();

	switch (type) {
		case NodeType.PC:
			return theme.colors.green[9];
		case NodeType.UA:
			return theme.colors.red[6];
		case NodeType.OA:
			return theme.colors.blue[6];
		case NodeType.U:
			return theme.colors.red[3];
		case NodeType.O:
			return theme.colors.blue[3];
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

export const isValidAscendant = (nodeTypeToCreate: string, ascendantType: string): boolean => {
	// Define which node types can serve as ascendants for each node type being created
	const validAscendants: Record<string, string[]> = {
		[NodeType.PC]: [], // PC has no ascendants
		[NodeType.UA]: [NodeType.PC, NodeType.UA],
		[NodeType.OA]: [NodeType.PC, NodeType.OA],
		[NodeType.O]: [NodeType.PC, NodeType.OA],
		[NodeType.U]: [NodeType.UA]
	};
	
	return validAscendants[nodeTypeToCreate]?.includes(ascendantType) || false;
};

export const getValidationErrorMessage = (nodeTypeToCreate: string, ascendantType: string): string => {
	const nodeTypeNames: Record<string, string> = {
		[NodeType.PC]: 'Policy Class',
		[NodeType.UA]: 'User Attribute',
		[NodeType.OA]: 'Object Attribute',
		[NodeType.U]: 'User',
		[NodeType.O]: 'Object'
	};

	const createTypeName = nodeTypeNames[nodeTypeToCreate] || nodeTypeToCreate;
	const ascendantTypeName = nodeTypeNames[ascendantType] || ascendantType;

	if (nodeTypeToCreate === NodeType.PC) {
		return `${createTypeName} nodes cannot have ascendants - they are root nodes in the policy hierarchy.`;
	}

	switch (nodeTypeToCreate) {
		case NodeType.UA:
			return `${createTypeName} nodes can only be assigned to Policy Class or other User Attribute nodes, not ${ascendantTypeName} nodes.`;
		case NodeType.OA:
			return `${createTypeName} nodes can only be assigned to Policy Class or other Object Attribute nodes, not ${ascendantTypeName} nodes.`;
		case NodeType.U:
			return `${createTypeName} nodes can only be assigned to User Attribute nodes, not ${ascendantTypeName} nodes.`;
		case NodeType.O:
			return `${createTypeName} nodes can only be assigned to Policy Class or Object Attribute nodes, not ${ascendantTypeName} nodes.`;
		default:
			return `Invalid node type combination: ${createTypeName} cannot be assigned to ${ascendantTypeName}.`;
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