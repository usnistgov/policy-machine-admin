import React from 'react';
import { NodeApi } from 'react-arborist';
import {
	IconArrowBigRightLines,
	IconArrowBigLeftLines,
	IconCircleArrowRight,
	IconCircleArrowLeft,
	IconArrowBigLeftLinesFilled, IconArrowBigRightLinesFilled
} from "@tabler/icons-react";
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
		<div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '3px' }}>
			{isAssociation && (
				isUserTree ? (
					<IconArrowBigRightLinesFilled stroke={2} size={18} style={{ color: 'var(--mantine-color-green-9)' }} />
				) : (
					<IconArrowBigLeftLinesFilled stroke={2} size={18} style={{ color: 'var(--mantine-color-green-9)' }} />
				)
			)}

			{!isAssociation && (
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<NodeIcon 
						type={node.data.type} 
						isDescendant={isDescendantNode}
						size="16px"
						fontSize="14px"
					/>
				</div>
			)}

			<span style={{ marginLeft: '5px', fontSize: '16px' }}>{node.data.name}</span>
		</div>
	);
} 