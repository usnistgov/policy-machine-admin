import React from 'react';
import { ActionIcon } from '@mantine/core';
import { NodeApi, TreeApi } from 'react-arborist';
import { PrimitiveAtom, useAtomValue } from 'jotai';
import { NodeType } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import { DescendantsIcon } from '@/components/icons/DescendantsIcon';
import { getTypeColor } from '@/components/tree/util';
import { useTreeOperations } from '../hooks/useTreeOperations';
import { activeDescendantsNodeAtom } from '../tree-atoms';
import classes from '@/components/tree/pmtree.module.css';

interface ShowDescendantsProps {
	type: NodeType;
	node: NodeApi;
	treeApi: TreeApi<any>;
	allowedTypes: NodeType[];
	treeDataAtom: PrimitiveAtom<TreeNode[]>;
	isDescendantNode: boolean;
	isUserTree: boolean;
	hasDescendantChildren: boolean;
	isHovered: boolean;
}

export function ShowDescendants({ 
	type, 
	node, 
	treeApi, 
	allowedTypes, 
	treeDataAtom,
	isDescendantNode,
	isUserTree,
	hasDescendantChildren,
	isHovered
}: ShowDescendantsProps) {
	const { toggleDescendants } = useTreeOperations(treeDataAtom, allowedTypes, isUserTree);
	const activeDescendantsNode = useAtomValue(activeDescendantsNodeAtom);
	const color = getTypeColor(type);
	
	// Check if this is an association node
	const isAssociation = node.data.properties?.isAssociation === 'true';
	
	// Show button if:
	// 1. Node is hovered, OR
	// 2. This node has active descendants
	const shouldShowButton = isHovered || activeDescendantsNode === node.data.id;
	
	// Style for the button when descendants are being shown
	const activeStyle = hasDescendantChildren ? {
		background: `${color}20`, // Transparent version of the color
		border: `1px solid ${color}`,
	} : {};
	
	// Use the regular node row item class, but keep the active style
	const buttonClassName = classes.nodeRowItem;
	
	async function handleToggleDescendants(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		await toggleDescendants(node);
	}

	// Only show for non-PC nodes, non-descendant nodes, and non-association nodes
	return (type !== "PC" && !isDescendantNode && !isAssociation && shouldShowButton) ? (
		<ActionIcon
			size={25}
			variant="subtle"
			color={color}
			className={buttonClassName}
			onClick={handleToggleDescendants}
			style={activeStyle}
		>
			<DescendantsIcon stroke={2} size={20} />
		</ActionIcon>
	): null;
} 