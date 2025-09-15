 import React from "react";
import {Node, NodeType} from "@/shared/api/pdp.api";
import {useMantineTheme} from "@mantine/core";
import {
	IconArrowBigLeftLinesFilled,
	IconArrowBigRightLinesFilled
} from "@tabler/icons-react";

// Constants
export const INDENT_NUM = 24;

// Types
export type NodeIconProps = {
	type: string,
	size?: string,
	fontSize?: string,
	style?: React.CSSProperties,
}

export enum AssociationDirection {
	Outgoing = 'outgoing',
	Incoming = 'incoming',
}

// Components
export function AssociationIcon({direction, size = '14px', color = "white"}: {direction: AssociationDirection, size?: string, color?: string}) {
	return (
		<span style={{
			display: 'inline-flex',
			alignItems: 'center',
		}}>
			{direction === 'outgoing' ? (
				<IconArrowBigRightLinesFilled
					size={size} 
					color={color}
					stroke={2}
					style={{ 
					}}
				/>
			) : (
				<IconArrowBigLeftLinesFilled
					size={size} 
					color={color}
					stroke={2}
					style={{ 
					}}
				/>
			)}
		</span>
	);
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
				overflow: 'hidden',
				whiteSpace: 'nowrap',
				minWidth: size,
				flexShrink: 0,
				...style,
			}}
		>
			{type}
		</span>
	);
}

// Utility functions
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
export const shouldShowExpansionIcon = (direction: string, node: TreeNode): boolean => {
	// Container node types that can have children show chevron
	// U and O nodes are leaf nodes and show dot
	return direction === "ascendants" ? (node.type === 'PC' || node.type === 'UA' || node.type === 'OA') : (node.type !== 'PC');
};

// Utility function to truncate text in the middle
export const truncateMiddle = (text: string, maxLength: number = 30) => {
	if (text.length <= maxLength) {
		return text;
	}

	const start = Math.ceil((maxLength - 3) / 2); // Account for "..."
	const end = Math.floor((maxLength - 3) / 2);

	return `${text.substring(0, start)}...${text.substring(text.length - end)}`;
};

export interface TreeNode {
	id: string; // UUID v4
	pmId?: string; // Original Node ID from PDP (int64 as string) - optional for temp nodes
	name: string;
	type: string;
	children?: TreeNode[];
	parent?: string; // Parent tree node ID (UUID)
	expanded?: boolean;
	selected?: boolean;
	isLoading?: boolean;
	isAssociation?: boolean;
	associationDetails?: {
		type: AssociationDirection
		accessRightSet: string[]
	}
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
export function sortTreeNodes(nodes: TreeNode[]): TreeNode[] {
	return [...nodes].sort((a, b) => {
		const aIsAssociation = a.isAssociation;
		const bIsAssociation = b.isAssociation;

		// Associations come first
		if (aIsAssociation && !bIsAssociation) {return -1;}
		if (!aIsAssociation && bIsAssociation) {return 1;}

		// If both are associations, sort by association type (outgoing first, then incoming)
		if (aIsAssociation && bIsAssociation) {
			const aType = a.associationDetails?.type || '';
			const bType = b.associationDetails?.type || '';
			if (aType !== bType) {
				return aType === 'outgoing' ? -1 : 1;
			}
			// Same association type, sort by name
			return a.name.localeCompare(b.name);
		}

		// For non-associations, use type order
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