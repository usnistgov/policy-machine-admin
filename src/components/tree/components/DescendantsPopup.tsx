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

// Create a popup-specific node renderer
function PopupNode(
	{ node, style, tree }: NodeRendererProps<any>,
	allowedTypes: NodeType[],
	treeDataAtom: PrimitiveAtom<TreeNode[]>,
	isUserTree: boolean,
	loadingNodes: Set<string>,
	setLoadingNodes: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
	const { fetchAndUpdateChildren, descendantNodes } = useTreeOperations(treeDataAtom, allowedTypes, isUserTree);
	const setSelectedUserNode = useSetAtom(selectedUserNodeAtom);
	const setSelectedTargetNode = useSetAtom(selectedTargetNodeAtom);
	const selectedUserNode = useAtomValue(selectedUserNodeAtom);
	const selectedTargetNode = useAtomValue(selectedTargetNodeAtom);
	
	const [isHovered, setIsHovered] = useState(false);
	const [contextMenuOpened, setContextMenuOpened] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
	
	// Check if this node is a descendant node
	const isDescendantNode = descendantNodes.has(node.data.id);
	const isLoading = loadingNodes.has(node.data.id);
	
	// Context menu logic (copied from PMNode but without Show Descendants)
	const color = getTypeColor(node.data.type);
	const isAssociation = node.data.properties?.isAssociation === 'true';
	
	// Show associate option for OA/O nodes in target tree when user node is selected
	const showAssociateOption = !isUserTree && 
		(node.data.type === 'OA' || node.data.type === 'O' || node.data.type === 'UA') && 
		selectedUserNode && 
		selectedUserNode.type === 'UA' && // UA can only be associated
		(node.data.type === 'UA' || node.data.type === 'OA') && // UA can associate with UA and OA
		!isAssociation;

	// Assignment logic - show assign option if there's a selected node from the same tree
	const selectedNodeForTree = isUserTree ? selectedUserNode : selectedTargetNode;
	const showAssignOption = selectedNodeForTree && 
		selectedNodeForTree.id !== node.data.id && 
		!isAssociation &&
		selectedNodeForTree.properties?.isAssociation !== 'true' && // Don't show assign for association nodes
		isValidAssignment(selectedNodeForTree.type, node.data.type) &&
		!node.data.children?.some((child: TreeNode) => child.id === selectedNodeForTree.id);

	// Deassignment logic - show deassign option if the right-clicked node has the selected node as a child
	const showDeassignOption = selectedNodeForTree && 
		selectedNodeForTree.id !== node.data.id &&
		node.data.children?.some((child: TreeNode) => child.id === selectedNodeForTree.id) &&
		!isAssociation &&
		selectedNodeForTree.properties?.isAssociation !== 'true'; // Don't show deassign for association nodes

	// Determine allowed node types for creation based on current node type
	const nodeType = node.data.type;
	let allowedNodeTypes: NodeType[] = [];
	const canCreateChildren = nodeType !== "O" && nodeType !== "U";
	
	if (canCreateChildren) {
		switch (nodeType) {
			case "PC": {
				allowedNodeTypes = [NodeType.UA, NodeType.OA, NodeType.O];
				break;
			}
			case "OA": {
				allowedNodeTypes = [NodeType.OA, NodeType.O];
				break;
			}
			case "UA": {
				allowedNodeTypes = [NodeType.UA, NodeType.U];
				break;
			}
		}
		
		// Filter out O and OA for user tree
		if (isUserTree) {
			allowedNodeTypes = allowedNodeTypes.filter(type => type !== NodeType.O && type !== NodeType.OA);
		}
	}


	// Context menu handlers (copied from PMNode)
	function handleContextMenu(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		
		// Estimate menu height based on number of visible menu items
		const estimatedMenuHeight = 300; // Conservative estimate for menu height
		const margin = 10; // Safety margin from screen edges
		
		let x = e.pageX;
		let y = e.pageY;
		
		// Check if menu would go off-screen vertically
		if (y + estimatedMenuHeight > window.innerHeight - margin) {
			// Position menu above the click point
			y = Math.max(margin, y - estimatedMenuHeight);
		}
		
		// Check if menu would go off-screen horizontally
		const estimatedMenuWidth = 250; // Conservative estimate for menu width
		if (x + estimatedMenuWidth > window.innerWidth - margin) {
			// Position menu to the left of the click point
			x = Math.max(margin, x - estimatedMenuWidth);
		}
		
		setContextMenuPosition({ x, y });
		setContextMenuOpened(true);
	}

	const handleDelete = async (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);
		try {
			await AdjudicationService.deleteNode(node.data.pmId);
			tree.delete(node.data.id);
			notifications.show({
				title: 'Node Deleted',
				message: `Successfully deleted ${node.data.name}`,
				color: 'green',
			});
		} catch (error) {
			console.error('Failed to delete node:', error);
			notifications.show({
				title: 'Delete Failed',
				message: `Failed to delete ${node.data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
				color: 'red',
			});
		}
	};

	const handleSetProperties = async (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);
		// This would typically open a dialog for property editing
		// For now, just log the action
		console.log(`Set properties for node: ${node.data.name} (${node.data.id})`);
	};

	const handleSelectNode = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);
		// Select the node based on tree type
		if (isUserTree) {
			setSelectedUserNode(node.data);
		} else {
			setSelectedTargetNode(node.data);
		}
	};

	const handleNodeClick = async (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		
		// Don't allow click if already loading
		if (isLoading) return;
		
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
			
			// Set loading state
			setLoadingNodes(prev => new Set(prev).add(node.data.id));
			
			try {
				await fetchAndUpdateChildren(node, shouldFetchDescendants);
			} finally {
				// Clear loading state
				setLoadingNodes(prev => {
					const next = new Set(prev);
					next.delete(node.data.id);
					return next;
				});
			}
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
			onContextMenu={handleContextMenu}
		>
			<MantineActionIcon
				size={25}
				variant="transparent"
				style={{marginRight: '0'}}
				c="black"
			>
				{isLoading ? (
					<Loader size={16} />
				) : shouldShowExpansionIcon(node.data) ? (
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

			<Menu 
				opened={contextMenuOpened} 
				onClose={() => setContextMenuOpened(false)}
				position="bottom-start"
				shadow="md"
				withinPortal
				styles={{
					dropdown: {
						position: 'fixed',
						left: contextMenuPosition.x,
						top: contextMenuPosition.y,
						zIndex: 9999
					}
				}}
			>
				<Menu.Target>
					<div style={{ display: 'none' }} />
				</Menu.Target>
				<Menu.Dropdown>
					<Menu.Item 
						leftSection={<IconHandFinger size={16} />}
						onClick={(e) => handleSelectNode(e)}
					>
						Select
					</Menu.Item>
					{isAssociation ? (
						// Association nodes: only show View and Delete
						<>
							<Menu.Divider />
							<Menu.Item 
								leftSection={<IconEye size={16} />}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setContextMenuOpened(false);
									console.log('View association:', node.data);
								}}
							>
								View
							</Menu.Item>
							<Menu.Item 
								leftSection={<IconTrash size={16} />}
								onClick={(e) => handleDelete(e)}
								color="red"
							>
								Delete
							</Menu.Item>
						</>
					) :
						// Non-association nodes: show regular menu (but NO Show Descendants)
						<>
							{canCreateChildren && allowedNodeTypes.length > 0 && (
								<>
									<Menu.Divider />
									<Menu.Label>Create</Menu.Label>
									{allowedNodeTypes.map((nodeType) => (
										<Menu.Item 
											key={nodeType}
											leftSection={<NodeIcon size="20px" fontSize="16px" type={nodeType} />}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setContextMenuOpened(false);
												console.log('Create node:', nodeType);
											}}
										>
										</Menu.Item>
									))}
								</>
							)}
							<Menu.Divider />
							<Menu.Label>Update</Menu.Label>
							<Menu.Item 
								leftSection={<IconPencil size={16} />}
								onClick={(e) => handleSetProperties(e)}
							>
								Set Properties
							</Menu.Item>
							<Menu.Item 
								leftSection={<IconTrash size={16} />}
								onClick={(e) => handleDelete(e)}
								color="red"
							>
								Delete Node
							</Menu.Item>
						</>
					}
				</Menu.Dropdown>
			</Menu>
		</div>
	);
}

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