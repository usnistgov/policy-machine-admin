import React, { useEffect, useState } from "react";
import { IconChevronDown, IconChevronRight, IconPoint, IconEye, IconArrowBigRightLines, IconPencil, IconTrash, IconArrowBigRight, IconCircleX, IconHandFinger } from "@tabler/icons-react";
import clsx from "clsx";
import { PrimitiveAtom, atom, useAtom, useSetAtom, useAtomValue } from "jotai";
import { NodeApi, NodeRendererProps, TreeApi } from "react-arborist";
import { ActionIcon, Menu, Loader, Group, Text } from "@mantine/core";
import { notifications } from '@mantine/notifications';
import { NodeType, AdjudicationService } from "@/api/pdp.api";
import { TreeNode } from "@/utils/tree.utils";
import classes from "@/components/tree/pmtree.module.css";
import { TARGET_ALLOWED_TYPES, USER_ALLOWED_TYPES } from "@/components/tree/PMTree";
import { targetTreeDataAtom, userTreeDataAtom, targetTreeFilterAtom, TargetTreeFilter, selectedUserNodeAtom, selectedTargetNodeAtom, activeDescendantsNodeAtom, descendantNodesAtom, onOpenDescendantsAtom, onOpenAssociationAtom } from "@/components/tree/tree-atoms";
import { INDENT_NUM, getTypeColor, NodeIcon, isValidAssignment, shouldShowExpansionIcon } from "@/components/tree/util";
import { DescendantsIcon } from "@/components/icons/DescendantsIcon";
import { useTreeOperations } from "./hooks/useTreeOperations";
import { NodeContent, Input } from "./components";

// Helper function to filter allowed types based on target tree filter
function getFilteredAllowedTypes(baseAllowedTypes: NodeType[], filter: TargetTreeFilter): NodeType[] {
	if (filter === 'users') {
		// Show only PC, UA, U (hide O, OA)
		return baseAllowedTypes.filter(type => ![NodeType.O, NodeType.OA].includes(type));
	} else if (filter === 'objects') {
		// Show only PC, OA, O (hide U, UA)
		return baseAllowedTypes.filter(type => ![NodeType.U, NodeType.UA].includes(type));
	}
	// Default 'both' - show all types
	return baseAllowedTypes;
}

// Create shared loading state atoms for each tree
const userTreeLoadingNodesAtom = atom<Set<string>>(new Set<string>());
const targetTreeLoadingNodesAtom = atom<Set<string>>(new Set<string>());

export function UserTreeNode({ node, style, tree }: NodeRendererProps<any>) {
	return PMNode({ node, style, tree }, USER_ALLOWED_TYPES, userTreeDataAtom, true, userTreeLoadingNodesAtom)
}

export function TargetTreeNode({ node, style, tree }: NodeRendererProps<any>) {
	const [targetTreeFilter] = useAtom(targetTreeFilterAtom);
	const filteredAllowedTypes = getFilteredAllowedTypes(TARGET_ALLOWED_TYPES, targetTreeFilter);
	return PMNode({ node, style, tree }, filteredAllowedTypes, targetTreeDataAtom, false, targetTreeLoadingNodesAtom)
}

function PMNode(
	{ node, style, tree }: NodeRendererProps<any>,
	allowedTypes: NodeType[],
	treeDataAtom: PrimitiveAtom<TreeNode[]>,
	isUserTree: boolean,
	loadingNodesAtom: PrimitiveAtom<Set<string>>,
) {
	const { fetchAndUpdateChildren, clearNodeChildren, descendantNodes, treeData } = useTreeOperations(treeDataAtom, allowedTypes, isUserTree);
	const setSelectedUserNode = useSetAtom(selectedUserNodeAtom);
	const setSelectedTargetNode = useSetAtom(selectedTargetNodeAtom);
	const setActiveDescendantsNode = useSetAtom(activeDescendantsNodeAtom);
	const setDescendantNodes = useSetAtom(descendantNodesAtom);
	const activeDescendantsNode = useAtomValue(activeDescendantsNodeAtom);
	const [loadingNodes, setLoadingNodes] = useAtom(loadingNodesAtom);
	
	const [contextMenuOpened, setContextMenuOpened] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
	const [isHovered, setIsHovered] = useState(false);
	const [creatingNodeId, setCreatingNodeId] = useState<string | null>(null);
	const selectedUserNode = useAtomValue(selectedUserNodeAtom);
	const selectedTargetNode = useAtomValue(selectedTargetNodeAtom);
	const onOpenDescendants = useAtomValue(onOpenDescendantsAtom);
	const onOpenAssociation = useAtomValue(onOpenAssociationAtom);

	// Check if this node is a descendant node
	const isDescendantNode = descendantNodes.has(node.data.id);
	const isLoading = loadingNodes.has(node.data.id);
	
	// Check if this node has descendant children currently showing
	const hasDescendantChildren = node.data.children?.some((child: TreeNode) => 
		descendantNodes.has(child.id)
	) || false;
	
	// NodeMenu logic
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

	// Handle node selection - for user tree and target tree
	useEffect(() => {
		if (node.isSelected) {
			if (isUserTree) {
				setSelectedUserNode(node.data);
			} else {
				setSelectedTargetNode(node.data);
			}
		}
	}, [node.isSelected, isUserTree, node.data, setSelectedUserNode, setSelectedTargetNode]);
	
	async function handleClick(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();

		// Don't allow click if already loading
		if (isLoading) return;

		// Check if this is an association node
		const isAssociation = node.data.properties?.isAssociation === 'true';

		// Check if we're in descendant mode (any descendants are active)
		const inDescendantMode = activeDescendantsNode !== null;

		// Check if the node is currently open (about to be closed)
		const isClosing = node.isOpen;

		// If closing, clear children to prevent flash effect
		if (isClosing) {
			// Clear all children from the tree data to prevent showing old nested children
			clearNodeChildren(node.data.id);
			
			// If this node has active descendants, reset the descendants state
			if (activeDescendantsNode === node.data.id) {
				// Clear all descendant nodes
				const newDescendantNodes = new Set<string>();
				setDescendantNodes(newDescendantNodes);
				// Clear active descendants node
				setActiveDescendantsNode(null);
			}
		}

		node.toggle();

		console.log(node.data)
		
		// Only fetch data if we're expanding the node AND it's not an association in descendant mode
		if (!isClosing && !(isAssociation && inDescendantMode)) {
			// Set loading state
			setLoadingNodes(prev => new Set(prev).add(node.data.id));
			
			try {
				await fetchAndUpdateChildren(node, isDescendantNode);
			} finally {
				// Clear loading state
				setLoadingNodes(prev => {
					const next = new Set(prev);
					next.delete(node.data.id);
					return next;
				});
			}
		}
	}

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

	async function handleCreate(type: NodeType) {
		setContextMenuOpened(false);
		if (!node.isOpen) {
			node.toggle();
		}

		// Set loading state
		setLoadingNodes(prev => new Set(prev).add(node.data.id));

		try {
			// Fetch and update children
			await fetchAndUpdateChildren(node, false);

			// Create a new input node in the tree at the correct sorted position
			// Use a longer delay to ensure the DOM is fully updated and the Input component can auto-focus
			setTimeout(() => {
				tree?.create({ 
					type: type as any, 
					parentId: node.id
				});

				// Focus the input field after creation
				setTimeout(() => {
					// Target the input with empty value (the newly created one)
					const inputElement = document.querySelector('input[type="text"][value=""]') as HTMLInputElement;
					if (inputElement) {
						inputElement.focus();
						inputElement.select();
					}
				}, 100);
			}, 200); // Increased delay to ensure DOM updates and autoFocus works
		} finally {
			// Clear loading state
			setLoadingNodes(prev => {
				const next = new Set(prev);
				next.delete(node.data.id);
				return next;
			});
		}
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

	const handleViewAssociation = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);

		// Use the callback to open the association tab in the side panel
		if (onOpenAssociation) {
			onOpenAssociation(node.data, selectedUserNode, selectedTargetNode, isUserTree);
		}
	};

	const handleDeleteAssociation = async (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);
		try {
			// Use the stored UA and target IDs from the association properties
			const uaId = node.data.properties?.uaNodeId;
			const targetId = node.data.properties?.targetNodeId;

			if (!uaId || !targetId) {
				throw new Error('Association node missing UA or target node information');
			}

			await AdjudicationService.dissociate(uaId, targetId);

			// Remove the association node from the tree
			tree.delete(node.data.id);

			notifications.show({
				title: 'Association Deleted',
				message: `Successfully deleted association`,
				color: 'green',
			});
		} catch (error) {
			console.error('Failed to delete association:', error);
			notifications.show({
				title: 'Delete Association Failed',
				message: `Failed to delete association: ${error instanceof Error ? error.message : 'Unknown error'}`,
				color: 'red',
			});
		}
	};

	const handleCreateAssociation = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);

		// Use the callback to open the association tab in the side panel
		if (onOpenAssociation) {
			// If this is a target tree node, automatically select it as target
			let targetNode = selectedTargetNode;
			if (!isUserTree) {
				targetNode = node.data;
				setSelectedTargetNode(node.data);
			}
			onOpenAssociation(node.data, selectedUserNode, targetNode, isUserTree);
		}
	};

	const handleAssign = async (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);
		if (!selectedNodeForTree) return;
		
		try {
			await AdjudicationService.assign(selectedNodeForTree.pmId, [node.data.pmId]);
			
			notifications.show({
				title: 'Assignment Successful',
				message: `Successfully assigned ${selectedNodeForTree.name} to ${node.data.name}`,
				color: 'green',
			});

			// TODO add new child node here -- same for assign and others
		} catch (error) {
			console.error('Failed to assign node:', error);
			notifications.show({
				title: 'Assignment Failed',
				message: `Failed to assign ${selectedNodeForTree.name} to ${node.data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
				color: 'red',
			});
		}
	};

	const handleDeassign = async (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);
		if (!selectedNodeForTree) return;
		
		try {
			await AdjudicationService.deassign(selectedNodeForTree.pmId, [node.data.pmId]);
			
			notifications.show({
				title: 'Deassignment Successful',
				message: `Successfully deassigned ${selectedNodeForTree.name} from ${node.data.name}`,
				color: 'green',
			});
		} catch (error) {
			console.error('Failed to deassign node:', error);
			notifications.show({
				title: 'Deassignment Failed',
				message: `Failed to deassign ${selectedNodeForTree.name} from ${node.data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
				color: 'red',
			});
		}
	};

	const handleShowDescendants = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);
		
		// Use the callback to open the descendants tab in the side panel
		if (onOpenDescendants) {
			onOpenDescendants(node.data, isUserTree);
		}
	};

	const handleSelectNode = (e?: React.MouseEvent) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setContextMenuOpened(false);
		// Select the node - this will trigger the useEffect that handles selection
		node.select();
	};

	const renderGuideLines = () => {
		const lines = [];
		let depth = node.level;
		
		if (depth > 0) {
			// Add vertical lines for each level except the current node
			for (let i = 0; i < depth; i++) {
				// Position the line to align with parent nodes (adjust position to match parent's icon)
				const left = i * INDENT_NUM + 12; // Align with parent node icon center
				
				lines.push(
					<div 
						key={`guideline-${node.data.id}-${i}`}
						className={classes.guideLine} 
						style={{ 
							left: `${left}px`,
							top: 0,
							height: '100%'
						}} 
					/>
				);
			}
			
			// Add the horizontal connector line from the vertical line to the current node
			// Only if this is not a root node
			lines.push(
				<div
					key={`horizontal-${node.data.id}`}
					className={classes.horizontalLine}
					style={{
						left: `${(depth - 1) * INDENT_NUM + 12}px`,
						width: `${22}px`,
						top: 'calc(50% - 0.5px)'
					}}
				/>
			);
		}
		
		return lines;
	};

	return (
		<div 
			style={style} 
			className={clsx(
				classes.node, 
				node.state, 
				isDescendantNode ? (isUserTree ? classes.descendantNodeUserTree : classes.descendantNode) : '',
				node.isSelected && isUserTree ? 'userTreeSelected' : '',
				node.isSelected && !isUserTree ? 'targetTreeSelected' : ''
			)}
			onContextMenu={handleContextMenu}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={handleClick}
		>
			{renderGuideLines()}
			
			<ActionIcon
				size={25}
				variant="transparent"
				style={{marginRight: '0'}}
				c="black"
			>
				{isLoading ? (
					<Loader size={16} color="black" />
				) : shouldShowExpansionIcon(node.data) ? (
					node.isOpen ? (
						<IconChevronDown stroke={2} size={16}/>
					) : (
						<IconChevronRight stroke={2} size={16}/>
					)
				) : (
					// Show point icon for leaf nodes or nodes with no cached children
					<IconPoint stroke={2} size={16}/>
				)}
			</ActionIcon>

			{node.data.name === "" ? (
				<Input node={node} tree={tree}/>
			) : (
				<>
					<NodeContent 
						node={node} 
						isUserTree={isUserTree} 
						isDescendantNode={isDescendantNode}
					/>

				</>
			)}

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
								onClick={(e) => handleViewAssociation(e)}
							>
								View
							</Menu.Item>
							<Menu.Item
								leftSection={<IconTrash size={16} />}
								onClick={(e) => handleDeleteAssociation(e)}
								color="red"
							>
								Delete
							</Menu.Item>
						</>
					) : (
						// Non-association nodes: show regular menu
						<>
							{/* Relations section */}
							{(showAssociateOption || showAssignOption || showDeassignOption || (node.data.type !== "PC" && !isDescendantNode && !isAssociation)) && (
								<>
									<Menu.Divider />
									<Menu.Label>Relations</Menu.Label>

									{(node.data.type !== "PC" && !isDescendantNode && !isAssociation) && (
																			<Menu.Item 
										leftSection={<DescendantsIcon size={16} />}
										onClick={(e) => handleShowDescendants(e)}
									>
										Show Descendants
									</Menu.Item>
									)}
									
									{showAssociateOption && (
																			<Menu.Item
										leftSection={<IconArrowBigRightLines size={16} style={{ color: 'var(--mantine-color-green-9)' }} />}
										onClick={(e) => handleCreateAssociation(e)}
									>
										<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
											Associate <NodeIcon type={selectedUserNode?.type || ''} /> {selectedUserNode?.name} with
										</span>
									</Menu.Item>
									)}

									{showAssignOption && (
																			<Menu.Item 
										leftSection={<IconArrowBigRight size={16} />}
										onClick={(e) => handleAssign(e)}
									>
										<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
											Assign <NodeIcon type={selectedNodeForTree?.type || ''} /> {selectedNodeForTree?.name} to
										</span>
									</Menu.Item>
									)}

									{showDeassignOption && (
																			<Menu.Item 
										leftSection={<IconCircleX size={16} style={{ color: 'var(--mantine-color-red-6)' }} />}
										onClick={(e) => handleDeassign(e)}
										color="red"
									>
										<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
											Deassign <NodeIcon type={selectedNodeForTree?.type || ''} /> {selectedNodeForTree?.name} from
										</span>
									</Menu.Item>
									)}
								</>
							)}
							
							{canCreateChildren && allowedNodeTypes.length > 0 && (
								<>
									<Menu.Divider />
									<Menu.Label>Create</Menu.Label>
									{allowedNodeTypes.map((nodeType) => (
										<Menu.Item 
											key={nodeType}
											leftSection={<NodeIcon size="20px" fontSize="16px" type={nodeType} />}
											onClick={async () => {
												await handleCreate(nodeType);
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
					)}
				</Menu.Dropdown>
			</Menu>

		</div>
	);
}
