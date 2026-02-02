import React, { useState } from 'react';
import { IconBan, IconCopy, IconInfoSquareRounded, IconPlus, IconTrash } from '@tabler/icons-react';
import { NodeApi } from 'react-arborist';
import {
	Box,
	Button,
	Group,
	Menu,
	Modal,
	Stack,
	Text,
	TextInput,
	useMantineTheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { InfoPanel } from '@/features/info/InfoPanel';
import { PMTree, TreeFilterConfig } from '@/features/pmtree';
import { NodeIcon, TreeNode } from '@/features/pmtree/tree-utils';
import { RightPanel, RightPanelComponent } from '@/pages/dashboard/RightPanel';
import { NodeType } from '@/shared/api/pdp.types';
import * as AdjudicationService from '@/shared/api/pdp_adjudication.api';

// PMTree now manages its own atoms internally - no need to create them here!

export function Dashboard() {
	const theme = useMantineTheme();
	const [rightPanelExpanded, setRightPanelExpanded] = useState(false);
	const [contextMenuOpened, setContextMenuOpened] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
	const [selectedNodeForInfo, setSelectedNodeForInfo] = useState<TreeNode | null>(null);
	const [rightClickedNode, setRightClickedNode] = useState<TreeNode | null>(null);
	const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]);
	const [rightPanelComponent, setRightPanelComponent] = useState<RightPanelComponent | null>(null);
	const [createNodeModalOpened, setCreateNodeModalOpened] = useState(false);
	const [nodeTypeToCreate, setNodeTypeToCreate] = useState<NodeType | null>(null);
	const [newNodeName, setNewNodeName] = useState('');

	// Main dashboard tree filter configuration - PMTree now manages this internally
	const treeFilters: TreeFilterConfig = {
		nodeTypes: [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O],
		showOutgoingAssociations: false,
		showIncomingAssociations: true,
	};

	const handleNodeRightClick = (node: TreeNode, event: React.MouseEvent) => {
		event.preventDefault();
		setRightClickedNode(node);
		setContextMenuPosition({ x: event.clientX, y: event.clientY });
		setContextMenuOpened(true);
	};

	const handleInfoClick = () => {
		if (rightClickedNode) {
			setSelectedNodeForInfo(rightClickedNode);
		}
		setContextMenuOpened(false);
	};

	const handleCopyNodeName = () => {
		if (rightClickedNode) {
			navigator.clipboard.writeText(rightClickedNode.name);
			notifications.show({
				title: 'Copied',
				message: `Node name "${rightClickedNode.name}" copied to clipboard`,
				color: 'green',
			});
		}
		setContextMenuOpened(false);
	};

	const handleCreateProhibitionClick = () => {
		if (rightClickedNode) {
			setSelectedNodes([rightClickedNode]); // Set the right-clicked node as selected
			setRightPanelComponent(RightPanelComponent.CREATE_PROHIBITION);
			setRightPanelExpanded(true);
		}
		setContextMenuOpened(false);
	};

	const handleDeleteNode = async () => {
		if (rightClickedNode && rightClickedNode.pmId) {
			try {
				await AdjudicationService.deleteNode(rightClickedNode.pmId);
				notifications.show({
					title: 'Node Deleted',
					message: `Successfully deleted node "${rightClickedNode.name}"`,
					color: 'green',
				});
			} catch (error) {
				notifications.show({
					title: 'Delete Error',
					message: `Failed to delete node: ${(error as Error).message}`,
					color: 'red',
				});
			}
		}
		setContextMenuOpened(false);
	};

	// Get valid child node types based on parent type
	const getValidChildNodeTypes = (parentType: NodeType): NodeType[] => {
		switch (parentType) {
			case NodeType.PC:
				return [NodeType.UA, NodeType.OA];
			case NodeType.UA:
				return [NodeType.UA, NodeType.U];
			case NodeType.OA:
				return [NodeType.OA, NodeType.O];
			default:
				return [];
		}
	};

	const handleCreateNodeClick = (nodeType: NodeType) => {
		setNodeTypeToCreate(nodeType);
		setNewNodeName('');
		setCreateNodeModalOpened(true);
		setContextMenuOpened(false);
	};

	const handleCreateNodeCancel = () => {
		setCreateNodeModalOpened(false);
		setNodeTypeToCreate(null);
		setNewNodeName('');
	};

	const handleCreateNodeConfirm = async () => {
		try {
			if (nodeTypeToCreate === NodeType.PC) {
				await AdjudicationService.createPolicyClass(newNodeName.trim());
			} else {
				if (!rightClickedNode || !rightClickedNode.pmId || !nodeTypeToCreate || !newNodeName.trim()) {
					return;
				}

				switch (nodeTypeToCreate) {
					case NodeType.UA:
						await AdjudicationService.createUserAttribute(newNodeName.trim(), [
							rightClickedNode.pmId,
						]);
						break;
					case NodeType.OA:
						await AdjudicationService.createObjectAttribute(newNodeName.trim(), [
							rightClickedNode.pmId,
						]);
						break;
					case NodeType.U:
						await AdjudicationService.createUser(newNodeName.trim(), [rightClickedNode.pmId]);
						break;
					case NodeType.O:
						await AdjudicationService.createObject(newNodeName.trim(), [rightClickedNode.pmId]);
						break;
				}
			}

			notifications.show({
				title: 'Node Created',
				message: `Successfully created ${nodeTypeToCreate} "${newNodeName.trim()}"`,
				color: 'green',
			});
		} catch (error) {
			notifications.show({
				title: 'Create Error',
				message: `Failed to create node: ${(error as Error).message}`,
				color: 'red',
			});
		}

		handleCreateNodeCancel();
	};

	const handleComponentClick = (component: RightPanelComponent) => {
		if (rightPanelComponent === component && rightPanelExpanded) {
			// If clicking the same component while expanded, collapse
			setRightPanelExpanded(false);
			setRightPanelComponent(null);
		} else {
			// Expand and set the component
			setRightPanelComponent(component);
			setRightPanelExpanded(true);
		}
	};

	const handleSelect = (nodeApi: NodeApi<TreeNode>[]) => {
		const treeNodes = nodeApi.map((api) => api.data);
		setSelectedNodes(treeNodes);
	};

	const handleRightPanelClose = () => {
		setRightPanelExpanded(false);
		setRightPanelComponent(null);
	};

	const left = (
		<Box style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
			<Box style={{ flex: selectedNodeForInfo ? 0.6 : 1, minHeight: 0, overflow: 'hidden' }}>
				<PMTree
					style={{
						width: '100%',
						height: '100%',
					}}
					direction="ascendants"
					filterConfig={treeFilters}
					clickHandlers={{
						onRightClick: handleNodeRightClick,
						onSelect: handleSelect,
					}}
					showCreatePolicyClass
					onCreatePolicyClass={() => handleCreateNodeClick(NodeType.PC)}
				/>
			</Box>

			{selectedNodeForInfo && (
				<Box
					style={{
						flex: 0.5,
						minHeight: 0,
						width: '100%',
						borderTop: '1px solid var(--mantine-color-gray-3)',
						overflow: 'hidden',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<InfoPanel
						rootNode={selectedNodeForInfo}
						selectedNodes={selectedNodes}
						onClose={() => setSelectedNodeForInfo(null)}
					/>
				</Box>
			)}
		</Box>
	);

	const right = (
		<div
			style={{
				height: '100%',
				width: rightPanelExpanded ? '60%' : '40px',
				flexShrink: 0,
			}}
		>
			<RightPanel
				component={rightPanelComponent}
				isExpanded={rightPanelExpanded}
				onComponentClick={handleComponentClick}
				selectedNodeForInfo={selectedNodeForInfo}
				selectedNodes={selectedNodes}
				onRightPanelClose={handleRightPanelClose}
			/>
		</div>
	);

	return (
		<>
			<div style={{ display: 'flex', height: '100%', gap: 0, width: '100%', minHeight: 0 }}>
				<div style={{ flex: 1, minWidth: 0 }}>{left}</div>
				{right}
			</div>

			<Menu
				opened={contextMenuOpened}
				onClose={() => setContextMenuOpened(false)}
				position="bottom-start"
				withArrow={false}
				shadow="md"
			>
				<Menu.Target>
					<div
						style={{
							position: 'fixed',
							left: contextMenuPosition.x,
							top: contextMenuPosition.y,
							width: 1,
							height: 1,
						}}
					/>
				</Menu.Target>
				<Menu.Dropdown>
					{/* Info section */}
					<Menu.Item
						onClick={handleInfoClick}
						leftSection={<IconInfoSquareRounded size={16} />}
						style={{
							backgroundColor: `var(--mantine-color-${theme.primaryColor}-0)`,
							borderLeft: `3px solid ${theme.colors[theme.primaryColor][6]}`
						}}
					>
						Info
					</Menu.Item>

					{/* Copy Node Name */}
					<Menu.Item onClick={handleCopyNodeName} leftSection={<IconCopy size={16} />}>
						Copy Node Name
					</Menu.Item>

					{/* Create nodes section */}
					{rightClickedNode &&
						getValidChildNodeTypes(rightClickedNode.type as NodeType).length > 0 && (
							<>
								<Menu.Divider />
								<Menu.Label>Create Node</Menu.Label>
								{getValidChildNodeTypes(rightClickedNode.type as NodeType).map((nodeType) => (
									<Menu.Item
										key={nodeType}
										leftSection={<NodeIcon type={nodeType} size={16} />}
										rightSection={<IconPlus size={16} />}
										onClick={() => handleCreateNodeClick(nodeType)}
									>
										Create {nodeType}
									</Menu.Item>
								))}
							</>
						)}

					{/* Additional actions section */}
					{rightClickedNode &&
						(rightClickedNode.type === NodeType.U || rightClickedNode.type === NodeType.UA) && (
							<>
								<Menu.Divider />
								<Menu.Label>Prohibition</Menu.Label>
								<Menu.Item
									onClick={handleCreateProhibitionClick}
									leftSection={<IconBan size={16} />}
								>
									Create Prohibition
								</Menu.Item>
							</>
						)}

					{/* Delete section */}
					{rightClickedNode && rightClickedNode.pmId && (
						<>
							<Menu.Divider />
							<Menu.Label>Delete</Menu.Label>
							<Menu.Item
								onClick={handleDeleteNode}
								leftSection={<IconTrash size={16} />}
								color="red"
							>
								Delete Node
							</Menu.Item>
						</>
					)}
				</Menu.Dropdown>
			</Menu>

			{/* Create Node Modal */}
			<Modal
				opened={createNodeModalOpened}
				onClose={handleCreateNodeCancel}
				title={
					<Group gap="sm">
						<Text size="lg" fw={600}>
							Create New Node
						</Text>
					</Group>
				}
				size="sm"
			>
				<Stack gap="md">
					{/* Parent Node Information */}
					{rightClickedNode && nodeTypeToCreate !== NodeType.PC && (
						<Group
							gap="sm"
							p="sm"
							style={{
								backgroundColor: 'var(--mantine-color-gray-0)',
								borderRadius: '8px',
								overflowX: 'auto',
								overflowY: 'hidden',
								minWidth: 0,
							}}
						>
							<Group gap="xs" wrap="nowrap">
								<NodeIcon
									type={rightClickedNode.type}
									size={18}
									style={{ flexShrink: 0 }}
								/>
								<Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
									{rightClickedNode.name}
								</Text>
							</Group>
						</Group>
					)}

					{/* Name Input */}
					<TextInput
						label="Name"
						placeholder="Name"
						value={newNodeName}
						onChange={(e) => setNewNodeName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && newNodeName.trim()) {
								handleCreateNodeConfirm();
							}
						}}
						data-autofocus
						required
						leftSection={
							nodeTypeToCreate && <NodeIcon type={nodeTypeToCreate} size={20} />
						}
					/>

					{/* Action Buttons */}
					<Group justify="flex-end" gap="sm" mt="md">
						<Button variant="outline" onClick={handleCreateNodeCancel}>
							Cancel
						</Button>
						<Button onClick={handleCreateNodeConfirm} disabled={!newNodeName.trim()}>
							Create
						</Button>
					</Group>
				</Stack>
			</Modal>
		</>
	);
}