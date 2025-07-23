import React, { useRef, useEffect, useState } from 'react';
import { Paper, Title, ActionIcon, Group, Stack, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import { Tree } from 'react-arborist';
import { useElementSize, useMergedRef } from '@mantine/hooks';
import { NodeApi, TreeApi, NodeRendererProps } from 'react-arborist';
import { PrimitiveAtom, atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { NodeType } from '@/api/pdp.api';
import { selectedUserNodeAtom, selectedTargetNodeAtom } from '../tree-atoms';
import { TreeNode } from '@/utils/tree.utils';
import { INDENT_NUM, getTypeColor, NodeIcon, isValidAssignment, shouldShowExpansionIcon } from '../util';
import classes from '../pmtree.module.css';
import { useTreeOperations } from '../hooks/useTreeOperations';
import { NodeContent } from './';
import { PopupNode } from './PopupNode';
import { IconChevronDown, IconChevronRight, IconPoint, IconEye, IconArrowBigRightLines, IconPencil, IconTrash, IconArrowBigRight, IconCircleX, IconHandFinger } from "@tabler/icons-react";
import { ActionIcon as MantineActionIcon, Menu, Portal } from "@mantine/core";
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
	children: []
}]);


export function DescendantsPopup({ rootNode, isUserTree, allowedTypes, initialPosition, onClose }: DescendantsPopupProps) {

	const [position, setPosition] = useState(initialPosition || { x: 100, y: 100 });
	const [size, setSize] = useState({ width: 400, height: 500 });
	const [isDragging, setIsDragging] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const [resizeType, setResizeType] = useState<'corner' | 'edge' | null>(null);
	const [resizeDirection, setResizeDirection] = useState<string>('');
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [resizeStartState, setResizeStartState] = useState({ 
		position: { x: 0, y: 0 }, 
		size: { width: 0, height: 0 }, 
		mouse: { x: 0, y: 0 } 
	});
	const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
	
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

	// Mouse event handlers for dragging and resizing
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging) {
				setPosition({
					x: e.clientX - dragOffset.x,
					y: e.clientY - dragOffset.y,
				});
			} else if (isResizing) {
				const deltaX = e.clientX - resizeStartState.mouse.x;
				const deltaY = e.clientY - resizeStartState.mouse.y;
				
				let newPosition = { ...resizeStartState.position };
				let newSize = { ...resizeStartState.size };
				
				// Handle different resize directions
				if (resizeDirection.includes('right')) {
					newSize.width = Math.max(300, resizeStartState.size.width + deltaX);
				}
				if (resizeDirection.includes('left')) {
					const widthChange = -deltaX;
					newSize.width = Math.max(300, resizeStartState.size.width + widthChange);
					newPosition.x = resizeStartState.position.x - (newSize.width - resizeStartState.size.width);
				}
				if (resizeDirection.includes('bottom')) {
					newSize.height = Math.max(200, resizeStartState.size.height + deltaY);
				}
				if (resizeDirection.includes('top')) {
					const heightChange = -deltaY;
					newSize.height = Math.max(200, resizeStartState.size.height + heightChange);
					newPosition.y = resizeStartState.position.y - (newSize.height - resizeStartState.size.height);
				}
				
				// Enforce maximum sizes
				newSize.width = Math.min(1200, newSize.width);
				newSize.height = Math.min(800, newSize.height);
				
				setSize(newSize);
				setPosition(newPosition);
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			setIsResizing(false);
			setResizeType(null);
			setResizeDirection('');
		};

		if (isDragging || isResizing) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, isResizing, dragOffset, resizeStartState, resizeDirection]);

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

	const handleResizeStart = (e: React.MouseEvent, direction: string) => {
		e.preventDefault();
		e.stopPropagation();
		
		setIsResizing(true);
		setResizeDirection(direction);
		setResizeStartState({
			position: { ...position },
			size: { ...size },
			mouse: { x: e.clientX, y: e.clientY }
		});
	};

	// Node renderer function for this popup
	const renderNode = React.useCallback((props: any) => {
		return PopupNode(props, allowedTypes, treeDataAtom, isUserTree, loadingNodes, setLoadingNodes);
	}, [allowedTypes, treeDataAtom, isUserTree, loadingNodes]);

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
					// Set loading state for root node
					setLoadingNodes(prev => new Set(prev).add(rootNodeData.id));
					
					try {
						// Fetch descendants for this node
						await fetchAndUpdateChildren(rootNodeApi, true); // true for descendant mode
						rootNodeApi.toggle();
						setHasInitialized(true); // Mark as initialized
					} finally {
						// Clear loading state for root node
						setLoadingNodes(prev => {
							const next = new Set(prev);
							next.delete(rootNodeData.id);
							return next;
						});
					}
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
				width: size.width,
				height: size.height,
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
							rowHeight={28}
							disableMultiSelection={false}
							overscanCount={20}
						>
							{renderNode}
						</Tree>
					)}
				</div>
			</Stack>

			{/* Resize handles */}
			{/* Corner handles */}
			<div
				style={{
					position: 'absolute',
					top: -5,
					left: -5,
					width: 10,
					height: 10,
					cursor: 'nw-resize',
					backgroundColor: 'transparent'
				}}
				onMouseDown={(e) => handleResizeStart(e, 'top-left')}
			/>
			<div
				style={{
					position: 'absolute',
					top: -5,
					right: -5,
					width: 10,
					height: 10,
					cursor: 'ne-resize',
					backgroundColor: 'transparent'
				}}
				onMouseDown={(e) => handleResizeStart(e, 'top-right')}
			/>
			<div
				style={{
					position: 'absolute',
					bottom: -5,
					left: -5,
					width: 10,
					height: 10,
					cursor: 'sw-resize',
					backgroundColor: 'transparent'
				}}
				onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
			/>
			<div
				style={{
					position: 'absolute',
					bottom: -5,
					right: -5,
					width: 10,
					height: 10,
					cursor: 'se-resize',
					backgroundColor: 'transparent'
				}}
				onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
			/>

			{/* Edge handles */}
			<div
				style={{
					position: 'absolute',
					top: -5,
					left: 10,
					right: 10,
					height: 10,
					cursor: 'n-resize',
					backgroundColor: 'transparent'
				}}
				onMouseDown={(e) => handleResizeStart(e, 'top')}
			/>
			<div
				style={{
					position: 'absolute',
					bottom: -5,
					left: 10,
					right: 10,
					height: 10,
					cursor: 's-resize',
					backgroundColor: 'transparent'
				}}
				onMouseDown={(e) => handleResizeStart(e, 'bottom')}
			/>
			<div
				style={{
					position: 'absolute',
					top: 10,
					bottom: 10,
					left: -5,
					width: 10,
					cursor: 'w-resize',
					backgroundColor: 'transparent'
				}}
				onMouseDown={(e) => handleResizeStart(e, 'left')}
			/>
			<div
				style={{
					position: 'absolute',
					top: 10,
					bottom: 10,
					right: -5,
					width: 10,
					cursor: 'e-resize',
					backgroundColor: 'transparent'
				}}
				onMouseDown={(e) => handleResizeStart(e, 'right')}
			/>
		</Paper>
	);
}