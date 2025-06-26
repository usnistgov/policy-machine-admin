import React, { useRef, useEffect, useState } from 'react';
import { Paper, Title, ActionIcon, Group, Stack } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { Tree } from 'react-arborist';
import { useElementSize, useMergedRef } from '@mantine/hooks';
import { NodeApi, TreeApi, NodeRendererProps } from 'react-arborist';
import { PrimitiveAtom, atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { NodeType } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import { INDENT_NUM, getTypeColor, NodeIcon, isValidAssignment, shouldShowExpansionIcon } from '../util';
import classes from '../pmtree.module.css';
import { useTreeOperations } from '../hooks/useTreeOperations';
import { NodeContent } from './';
import { IconChevronDown, IconChevronRight, IconPoint } from "@tabler/icons-react";
import { ActionIcon as MantineActionIcon, Menu } from "@mantine/core";
import { AdjudicationService } from '@/api/pdp.api';
import clsx from "clsx";

interface DescendantsPopupProps {
	rootNode: TreeNode;
	isUserTree: boolean;
	allowedTypes: NodeType[];
	initialPosition?: { x: number; y: number };
	onClose: () => void;
}

// Create local atoms for this popup's tree data
const createPopupTreeAtom = (rootNode: TreeNode) => atom<TreeNode[]>([{
	...rootNode,
	children: [],
	// Root node in descendants popup defaults to showing chevron
	cachedSecondLevel: [{ id: 'placeholder' }] as any, // Placeholder to indicate expandable
	hasCachedSecondLevel: true
}]);

// Create a popup-specific node renderer
function PopupNode(
	{ node, style, tree }: NodeRendererProps<any>,
	allowedTypes: NodeType[],
	treeDataAtom: PrimitiveAtom<TreeNode[]>,
	isUserTree: boolean,
) {
	const { fetchAndUpdateChildren, descendantNodes } = useTreeOperations(treeDataAtom, allowedTypes, isUserTree);
	const [isHovered, setIsHovered] = useState(false);
	
	// Check if this node is a descendant node
	const isDescendantNode = descendantNodes.has(node.data.id);


	const handleNodeClick = async (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		
		// Check if the node is currently closed (about to be opened)
		const isExpanding = !node.isOpen;
		
		node.toggle();
		
		// Only fetch data if we're expanding the node
		if (isExpanding) {
			// Check if this is an association node
			const isAssociation = node.data.properties?.isAssociation === 'true';
			
			// Associations in descendants popup should show ascendants (regular direction)
			// Regular nodes in descendants popup should show descendants
			const shouldFetchDescendants = !isAssociation;
			
			await fetchAndUpdateChildren(node, shouldFetchDescendants);
		}
	};

	return (
		<div 
			style={style} 
			className={clsx(
				classes.node, 
				node.state,
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={handleNodeClick}
		>
			<MantineActionIcon
				size={25}
				variant="transparent"
				style={{marginRight: '0'}}
				c="black"
			>
				{shouldShowExpansionIcon(node.data) ? (
					node.isOpen ? (
						<IconChevronDown stroke={2} size={18}/>
					) : (
						<IconChevronRight stroke={2} size={18}/>
					)
				) : (
					<IconPoint stroke={2} size={18}/>
				)}
			</MantineActionIcon>

			<NodeContent 
				node={node} 
				isUserTree={isUserTree} 
				isDescendantNode={isDescendantNode}
			/>
		</div>
	);
}

export function DescendantsPopup({ rootNode, isUserTree, allowedTypes, initialPosition, onClose }: DescendantsPopupProps) {

	const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	
	// Create popup-specific tree data atom
	const [treeDataAtom] = useState(() => createPopupTreeAtom(rootNode));
	const [treeData, setTreeData] = useAtom(treeDataAtom);
	const { fetchAndUpdateChildren } = useTreeOperations(treeDataAtom, allowedTypes, isUserTree);
	
	const popupRef = useRef<HTMLDivElement>(null);
	const treeContainerRef = useRef<HTMLDivElement>(null);
	const treeApiRef = useRef<TreeApi<TreeNode> | null>(null);
	
	const { ref: sizeRef, width, height } = useElementSize();
	const mergedRef = useMergedRef(treeContainerRef, sizeRef);
	
	// Static theme colors to avoid hooks
	const colors = {
		user: {
			border: '#e22862',      // red[6]
			headerBg: '#ffeaf3',    // red[0]
			headerBorder: '#f4a7bf', // red[3]
			titleColor: '#c91a52'   // red[7]
		},
		target: {
			border: '#0969ff',      // blue[6]
			headerBg: '#e5f3ff',    // blue[0]
			headerBorder: '#9ac2ff', // blue[3]
			titleColor: '#0058e4'   // blue[7]
		}
	};
	
	const currentColors = isUserTree ? colors.user : colors.target;

	// Mouse event handlers for dragging
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging) {
				setPosition({
					x: e.clientX - dragOffset.x,
					y: e.clientY - dragOffset.y,
				});
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, dragOffset]);

	const handleHeaderMouseDown = (e: React.MouseEvent) => {
		const rect = popupRef.current?.getBoundingClientRect();
		if (rect) {
			setDragOffset({
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			});
			setIsDragging(true);
		}
	};

	// Node renderer function for this popup
	const renderNode = React.useCallback((props: any) => {
		return PopupNode(props, allowedTypes, treeDataAtom, isUserTree);
	}, [allowedTypes, treeDataAtom, isUserTree]);

	// Track if we've already initialized to prevent infinite loops
	const [hasInitialized, setHasInitialized] = useState(false);
	
	// Automatically expand the root node and fetch its descendants
	useEffect(() => {
		if (hasInitialized) return; // Prevent re-running
		
		const expandRoot = async () => {
			const rootNodeData = treeData[0];
			if (rootNodeData && treeApiRef.current) {
				const rootNodeApi = treeApiRef.current.get(rootNodeData.id);
				if (rootNodeApi && !rootNodeApi.isOpen) {
					// Fetch descendants and their second level children for proper icon display
					await fetchAndUpdateChildren(rootNodeApi, true); // true for descendant mode
					rootNodeApi.toggle();
					setHasInitialized(true); // Mark as initialized
				}
			}
		};

		// Delay to ensure tree is mounted
		setTimeout(expandRoot, 100);
	}, [fetchAndUpdateChildren, hasInitialized]); // Removed treeData from dependencies

	return (
		<Paper
			ref={popupRef}
			shadow="xl"
			radius="md"
			style={{
				position: 'fixed',
				left: position.x,
				top: position.y,
				width: 400,
				height: 500,
				zIndex: 1000,
				border: `2px solid ${currentColors.border}`,
				overflow: 'hidden',
			}}

		>
			<Stack gap={0} h="100%">
				{/* Header */}
				<Group
					justify="space-between"
					p="sm"
					style={{
						backgroundColor: currentColors.headerBg,
						borderBottom: `1px solid ${currentColors.headerBorder}`,
						cursor: 'move',
						userSelect: 'none',
					}}
					onMouseDown={handleHeaderMouseDown}
				>
					<Title order={5} style={{ color: currentColors.titleColor }}>
						<span style={{ color: 'black', fontWeight: 'normal' }}>Descendants of </span>
						{rootNode.name}
					</Title>
					<ActionIcon 
						variant="subtle" 
						size="sm" 
						style={{ color: currentColors.border }}
						onClick={onClose}
					>
						<IconX size={16} />
					</ActionIcon>
				</Group>

				{/* Tree Container */}
				<div 
					ref={mergedRef} 
					style={{ 
						flex: 1, 
						overflow: 'hidden',
						backgroundColor: '#f8f9fa', // gray[0] from theme
					}}
				>
					{width && height && (
						<Tree
							data={treeData}
							disableDrag
							disableDrop
							disableEdit
							openByDefault={false}
							width={width}
							height={height}
							indent={INDENT_NUM}
							ref={treeApiRef}
							className={classes.tree}
							rowHeight={22}
							disableMultiSelection={false}
							overscanCount={20}
						>
							{renderNode}
						</Tree>
					)}
				</div>
			</Stack>
		</Paper>
	);
}