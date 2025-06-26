import React, { useEffect, useState } from "react";
import { IconChevronDown, IconChevronRight, IconPoint, IconEye, IconArrowBigRightLines, IconPencil, IconTrash, IconArrowBigRight, IconCircleX, IconHandFinger } from "@tabler/icons-react";
import clsx from "clsx";
import { PrimitiveAtom, useAtom, useSetAtom, useAtomValue } from "jotai";
import { NodeApi, NodeRendererProps, TreeApi } from "react-arborist";
import { ActionIcon, Menu, Portal } from "@mantine/core";
import { NodeType, AdjudicationService } from "@/api/pdp.api";
import { TreeNode } from "@/utils/tree.utils";
import classes from "@/components/tree/pmtree.module.css";
import { TARGET_ALLOWED_TYPES, USER_ALLOWED_TYPES } from "@/components/tree/PMTree";
import { targetTreeDataAtom, userTreeDataAtom, targetTreeFilterAtom, TargetTreeFilter, selectedUserNodeAtom, selectedTargetNodeAtom, activeDescendantsNodeAtom, descendantNodesAtom } from "@/components/tree/tree-atoms";
import { INDENT_NUM, getTypeColor, NodeIcon, isValidAssignment, shouldShowExpansionIcon } from "@/components/tree/util";
import { DescendantsIcon } from "@/components/icons/DescendantsIcon";
import { useTreeOperations } from "./hooks/useTreeOperations";
import { NodeContent, Input } from "./components";
import { AssociationModal } from "./components/AssociationModal";
import { DescendantsPopup } from "./components/DescendantsPopup";

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

export function UserTreeNode({ node, style, tree }: NodeRendererProps<any>) {
	return PMNode({ node, style, tree }, USER_ALLOWED_TYPES, userTreeDataAtom, true)
}

export function TargetTreeNode({ node, style, tree }: NodeRendererProps<any>) {
	const [targetTreeFilter] = useAtom(targetTreeFilterAtom);
	const filteredAllowedTypes = getFilteredAllowedTypes(TARGET_ALLOWED_TYPES, targetTreeFilter);
	return PMNode({ node, style, tree }, filteredAllowedTypes, targetTreeDataAtom, false)
}

function PMNode(
	{ node, style, tree }: NodeRendererProps<any>,
	allowedTypes: NodeType[],
	treeDataAtom: PrimitiveAtom<TreeNode[]>,
	isUserTree: boolean,
) {
	const { fetchAndUpdateChildren, clearNodeChildren, descendantNodes, treeData } = useTreeOperations(treeDataAtom, allowedTypes, isUserTree);
	const setSelectedUserNode = useSetAtom(selectedUserNodeAtom);
	const setSelectedTargetNode = useSetAtom(selectedTargetNodeAtom);
	const setActiveDescendantsNode = useSetAtom(activeDescendantsNodeAtom);
	const setDescendantNodes = useSetAtom(descendantNodesAtom);
	const activeDescendantsNode = useAtomValue(activeDescendantsNodeAtom);
	const [contextMenuOpened, setContextMenuOpened] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
	const [associationModalOpened, setAssociationModalOpened] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [showDescendantsPopup, setShowDescendantsPopup] = useState(false);
	const [descendantsPopupPosition, setDescendantsPopupPosition] = useState({ x: 0, y: 0 });
	const [creatingNodeId, setCreatingNodeId] = useState<string | null>(null);
	const selectedUserNode = useAtomValue(selectedUserNodeAtom);
	const selectedTargetNode = useAtomValue(selectedTargetNodeAtom);
	
	// Check if this node is a descendant node
	const isDescendantNode = descendantNodes.has(node.data.id);
	
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
			await fetchAndUpdateChildren(node, isDescendantNode);
		}
	}

	function handleContextMenu(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		setContextMenuPosition({ x: e.pageX, y: e.pageY });
		setContextMenuOpened(true);
	}

	async function handleCreate(type: NodeType) {
		setContextMenuOpened(false);
		if (!node.isOpen) {
			node.toggle();
		}

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
	}

	const handleDelete = async () => {
		setContextMenuOpened(false);
		try {
			await AdjudicationService.deleteNode(node.data.pmId);
			console.log(`Deleted node: ${node.data.name} (${node.data.pmId})`);
			tree.delete(node.data.id);
		} catch (error) {
			console.error('Failed to delete node:', error);
		}
	};

	const handleSetProperties = async () => {
		setContextMenuOpened(false);
		// This would typically open a dialog for property editing
		// For now, just log the action
		console.log(`Set properties for node: ${node.data.name} (${node.data.id})`);
	};

	const handleViewAssociation = () => {
		setContextMenuOpened(false);
		setAssociationModalOpened(true);
	};

	const handleDeleteAssociation = async () => {
		setContextMenuOpened(false);
		try {
			// Use the stored UA and target IDs from the association properties
			const uaId = node.data.properties?.uaNodeId;
			const targetId = node.data.properties?.targetNodeId;
			
			if (!uaId || !targetId) {
				throw new Error('Association node missing UA or target node information');
			}
			
			await AdjudicationService.dissociate(uaId, targetId);
			console.log(`Dissociated association between UA:${uaId} and Target:${targetId}`);
			
			// Remove the association node from the tree
			tree.delete(node.data.id);
		} catch (error) {
			console.error('Failed to delete association:', error);
			alert(`Failed to delete association: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	};

	const handleCreateAssociation = () => {
		setContextMenuOpened(false);
		// If this is a target tree node, automatically select it as target
		if (!isUserTree) {
			setSelectedTargetNode(node.data);
		}
		setAssociationModalOpened(true);
	};

	const handleAssign = async () => {
		setContextMenuOpened(false);
		if (!selectedNodeForTree) return;
		
		try {
			await AdjudicationService.assign(selectedNodeForTree.pmId, [node.data.pmId]);
			console.log(`Assigned ${selectedNodeForTree.name} to ${node.data.name}`);

			// TODO add new child node here -- same for assign and others
		} catch (error) {
			console.error('Failed to assign node:', error);
			alert(`Failed to assign ${selectedNodeForTree.name} to ${node.data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	};

	const handleDeassign = async () => {
		setContextMenuOpened(false);
		if (!selectedNodeForTree) return;
		
		try {
			await AdjudicationService.deassign(selectedNodeForTree.pmId, [node.data.pmId]);
			console.log(`Deassigned ${selectedNodeForTree.name} from ${node.data.name}`);
		} catch (error) {
			console.error('Failed to deassign node:', error);
			alert(`Failed to deassign ${selectedNodeForTree.name} from ${node.data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	};

	const handleShowDescendants = () => {
		setContextMenuOpened(false);
		
		// Calculate position relative to the context menu position
		const popupWidth = 400;
		const popupHeight = 500;
		const margin = 10;
		
		let x = contextMenuPosition.x + margin;
		let y = contextMenuPosition.y;
		
		// If not enough space on the right, position to the left
		if (x + popupWidth > window.innerWidth - margin) {
			x = Math.max(margin, contextMenuPosition.x - popupWidth - margin);
		}
		
		// Center vertically around the menu position
		y = contextMenuPosition.y - (popupHeight / 2);
		
		// Ensure popup doesn't go off-screen vertically
		if (y + popupHeight > window.innerHeight - margin) {
			y = window.innerHeight - popupHeight - margin;
		}
		if (y < margin) {
			y = margin;
		}
		
		setDescendantsPopupPosition({ x, y });
		setShowDescendantsPopup(true);
	};

	const handleSelectNode = () => {
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
				{shouldShowExpansionIcon(node.data) ? (
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
						onClick={handleSelectNode}
					>
						Select
					</Menu.Item>
					{isAssociation ? (
						// Association nodes: only show View and Delete
						<>
							<Menu.Divider />
							<Menu.Item 
								leftSection={<IconEye size={16} />}
								onClick={handleViewAssociation}
							>
								View
							</Menu.Item>
							<Menu.Item 
								leftSection={<IconTrash size={16} />}
								onClick={handleDeleteAssociation}
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
											onClick={handleShowDescendants}
										>
											Show Descendants
										</Menu.Item>
									)}
									
									{showAssociateOption && (
										<Menu.Item 
											leftSection={<IconArrowBigRightLines size={16} style={{ color: 'var(--mantine-color-green-9)' }} />}
											onClick={handleCreateAssociation}
										>
											<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
												Associate <NodeIcon type={selectedUserNode?.type || ''} /> {selectedUserNode?.name} with
											</span>
										</Menu.Item>
									)}

									{showAssignOption && (
										<Menu.Item 
											leftSection={<IconArrowBigRight size={16} />}
											onClick={handleAssign}
										>
											<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
												Assign <NodeIcon type={selectedNodeForTree?.type || ''} /> {selectedNodeForTree?.name} to
											</span>
										</Menu.Item>
									)}

									{showDeassignOption && (
										<Menu.Item 
											leftSection={<IconCircleX size={16} style={{ color: 'var(--mantine-color-red-6)' }} />}
											onClick={handleDeassign}
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
											leftSection={<NodeIcon type={nodeType} />}
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
								onClick={handleSetProperties}
							>
								Set Properties
							</Menu.Item>
							<Menu.Item 
								leftSection={<IconTrash size={16} />}
								onClick={handleDelete}
								color="red"
							>
								Delete Node
							</Menu.Item>
						</>
					)}
				</Menu.Dropdown>
			</Menu>

			<AssociationModal
				opened={associationModalOpened}
				onClose={() => setAssociationModalOpened(false)}
				mode={isAssociation ? 'view' : 'create'}
				node={node.data}
				selectedUserNode={selectedUserNode}
				selectedTargetNode={selectedTargetNode}
				isUserTree={isUserTree}
			/>

			{showDescendantsPopup && (
				<Portal>
					<DescendantsPopup
						rootNode={node.data}
						isUserTree={isUserTree}
						allowedTypes={allowedTypes}
						initialPosition={descendantsPopupPosition}
						onClose={() => setShowDescendantsPopup(false)}
					/>
				</Portal>
			)}
		</div>
	);
}
