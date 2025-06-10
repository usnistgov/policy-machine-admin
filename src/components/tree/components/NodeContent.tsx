import React from 'react';
import { NodeApi } from 'react-arborist';
import { IconArrowBigRightLines, IconArrowBigLeftLines } from "@tabler/icons-react";
import { NodeIcon } from '@/components/tree/util';
import classes from '@/components/tree/pmtree.module.css';

interface NodeContentProps {
	node: NodeApi;
	isUserTree: boolean;
	isDescendantNode: boolean;
}

export function NodeContent({ node, isUserTree, isDescendantNode }: NodeContentProps) {
	const isAssociation = node.data.properties?.isAssociation === 'true';

	return (
		<>
			{/* Show association icon if this is an association node */}
			{isAssociation && (
				isUserTree ? (
					<IconArrowBigRightLines stroke={2} size={20} style={{ marginRight: '4px', color: 'var(--mantine-color-green-9)' }} />
				) : (
					<IconArrowBigLeftLines stroke={2} size={20} style={{ marginRight: '4px', color: 'var(--mantine-color-green-9)' }} />
				)
			)}

			{/* Only show node type icon for non-association nodes */}
			{!isAssociation && (
				<NodeIcon 
					type={node.data.type} 
					classes={classes} 
					isDescendant={isDescendantNode}
				/>
			)}

			<span style={{ margin: 'auto 5px' }}>{node.data.name}</span>
		</>
	);
} 