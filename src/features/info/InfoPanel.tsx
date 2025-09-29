import React, { useCallback, useEffect, useMemo, useState } from "react";
import {IconArrowLeftCircle, IconPlus, IconSquareRoundedMinus, IconX} from "@tabler/icons-react";
import { NodeApi } from "react-arborist";
import { ActionIcon, Alert, Box, Button, Divider, Group, ScrollArea, Stack, Text, Title, useMantineTheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AccessRightsSelection } from "@/components/access-rights";
import { PMTree } from "@/features/pmtree";
import { fetchAssociationChildren } from "@/features/pmtree/tree-data-fetcher";
import { AssociationDirection, AssociationIcon, NodeIcon, transformNodesToTreeNodes, TreeNode, truncateMiddle } from "@/features/pmtree/tree-utils";
import { AdjudicationService, NODE_TYPES, NodePrivilegeInfo, NodeType, QueryService } from "@/shared/api/pdp.api";


// Helper function to create truncated access rights preview
function createAccessRightsPreview(accessRights: string[], maxLength: number = 50): string {
	if (!accessRights || accessRights.length === 0) {return "No access rights";}

	const preview = accessRights.join(", ");
	if (preview.length <= maxLength) {return preview;}

	return `${preview.substring(0, maxLength - 3)  }...`;
}

// Helper function to transform NodePrivilegeInfo to TreeNode
function transformNodePrivilegeInfoToTreeNodes(privileges: NodePrivilegeInfo[]): TreeNode[] {
	const nodes = privileges
		.map(priv => priv.node)
		.filter((node): node is NonNullable<typeof node> => node !== undefined);

	return transformNodesToTreeNodes(nodes);
}

// Component for association details panel
interface AssociationDetailsPanelProps {
	associationNode: TreeNode;
	rootNode: TreeNode;
	resourceOperations: string[];
	onAssociationUpdated: () => void;
	onClose: () => void;
	style?: React.CSSProperties;
}

function AssociationDetailsPanel({
	associationNode,
	rootNode,
	resourceOperations,
	onAssociationUpdated,
	onClose,
	style
}: AssociationDetailsPanelProps) {
	const theme = useMantineTheme();
	const [editingAccessRights, setEditingAccessRights] = useState<string[]>(
		associationNode.associationDetails?.accessRightSet || []
	);

	// Handle updating an existing association
	const handleUpdateAssociation = useCallback(async () => {
		if (!rootNode?.pmId || !associationNode.pmId) {
			return;
		}

		if (editingAccessRights.length === 0) {
			notifications.show({
				color: 'red',
				title: 'Update Error',
				message: 'At least one access right must be selected',
			});
			return;
		}

		try {
			// Determine source and target based on association direction
			// For outgoing associations: rootNode -> associationNode
			// For incoming associations: associationNode -> rootNode
			const isOutgoing = associationNode.associationDetails?.type === AssociationDirection.Outgoing;
			const sourcePmId = isOutgoing ? rootNode.pmId : associationNode.pmId;
			const targetPmId = isOutgoing ? associationNode.pmId : rootNode.pmId;

			// First dissociate the old association, then create new one with updated access rights
			await AdjudicationService.dissociate(sourcePmId, targetPmId);
			await AdjudicationService.associate(sourcePmId, targetPmId, editingAccessRights);

			// Refresh associations list
			onAssociationUpdated();

			notifications.show({
				color: 'green',
				title: 'Association Updated',
				message: 'Association access rights have been updated successfully',
			});
		} catch (error) {
			notifications.show({
				color: 'red',
				title: 'Update Error',
				message: (error as Error).message,
			});
		}
	}, [rootNode, associationNode, editingAccessRights, onAssociationUpdated]);

	// Handle deleting an association
	const handleDeleteAssociation = useCallback(async () => {
		if (!rootNode?.pmId || !associationNode.pmId) {
			return;
		}

		try {
			// Determine source and target based on association direction
			const isOutgoing = associationNode.associationDetails?.type === AssociationDirection.Outgoing;
			const sourcePmId = isOutgoing ? rootNode.pmId : associationNode.pmId;
			const targetPmId = isOutgoing ? associationNode.pmId : rootNode.pmId;

			await AdjudicationService.dissociate(sourcePmId, targetPmId);

			// Close the panel and refresh associations list
			onClose();
			onAssociationUpdated();

			notifications.show({
				color: 'green',
				title: 'Association Deleted',
				message: 'Association has been deleted successfully',
			});

		} catch (error) {
			notifications.show({
				color: 'red',
				title: 'Delete Error',
				message: (error as Error).message,
			});
		}
	}, [rootNode, associationNode, onClose, onAssociationUpdated]);

	return (
		<Box style={{
			flex: 1,
			display: 'flex',
			flexDirection: 'column',
			height: '100%',
			minWidth: 0,
			...style
		}}>
			<Group justify="space-between" style={{ flex: '0 0 auto' }}>
				<Group gap="xs">
					<AssociationIcon
						direction={associationNode.associationDetails?.type as AssociationDirection}
						size="32"
						color={theme.colors.green[9]}
					/>
					<NodeIcon type={associationNode.type} size="30px" fontSize="22px" />
					<Text size="lg" fw={500}>{truncateMiddle(associationNode.name)}</Text>
				</Group>
				<ActionIcon variant="subtle" onClick={onClose}>
					<IconX size={16} />
				</ActionIcon>
			</Group>

			<Box style={{
				flex: 1,
				minHeight: 0,
				display: 'flex',
				flexDirection: 'column',
				borderRadius: '4px'
			}}>
				<ScrollArea style={{ flex: 1 }}>
					<AccessRightsSelection
						selectedRights={editingAccessRights}
						onRightsChange={setEditingAccessRights}
						resourceOperations={resourceOperations}
					/>
				</ScrollArea>
			</Box>

			<Group gap="xs" justify="center" mt="md" style={{ flex: '0 0 auto' }}>
				<Button
					variant="filled"
					color="blue"
					onClick={handleUpdateAssociation}
				>
					Update
				</Button>
				<Button
					variant="filled"
					color="red"
					onClick={handleDeleteAssociation}
				>
					Delete
				</Button>
			</Group>
		</Box>
	);
}

interface AssociationCreationPanelProps {
	direction: AssociationDirection;
	selectedNode: TreeNode | null;
	selectedAccessRights: string[];
	onRightsChange: (rights: string[]) => void;
	resourceOperations: string[];
	onSubmit: () => void;
	onCancel: () => void;
	onClearSelection: () => void;
	style?: React.CSSProperties;
}

function AssociationCreationPanel({
	direction,
	selectedNode,
	selectedAccessRights,
	onRightsChange,
	resourceOperations,
	onSubmit,
	onCancel,
	onClearSelection,
	style
}: AssociationCreationPanelProps) {
	const theme = useMantineTheme();
	const isNodeSelected = !!selectedNode;
	const instruction = direction === AssociationDirection.Incoming
		? 'Select a node from the main tree to act as the source of this association.'
		: 'Select a node from the main tree to act as the target of this association.';

	const createDisabled = !isNodeSelected || selectedAccessRights.length === 0;

	return (
		<Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
			<Group justify="space-between" align="flex-start" mb="sm">
				<Stack gap={2}>
					<Title order={5}>Creating {direction === AssociationDirection.Incoming ? 'Incoming' : 'Outgoing'} Association</Title>
				</Stack>
			</Group>
			<Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
				<Stack gap={4}>
					<Text size="xs" c="dimmed">{direction === AssociationDirection.Incoming ? 'Selected source' : 'Selected target'}</Text>
					{!selectedNode && (<Alert variant="light" color="blue" mb="sm">
						<Text size="sm">{instruction}</Text>
					</Alert>)}
					{selectedNode && (
						<Box style={{
							border: '1px solid var(--mantine-color-gray-3)',
							borderRadius: '4px',
							padding: '8px 12px',
							backgroundColor: 'white'
						}}>
							<Group justify="space-between" align="center" gap="xs">
								<Group gap="xs" align="center">
									<NodeIcon type={selectedNode.type} size="18px" fontSize="14px" />
									<Text size="sm">{truncateMiddle(selectedNode.name)}</Text>
								</Group>
								<ActionIcon size="sm" variant="subtle" color="gray" onClick={onClearSelection}>
									<IconSquareRoundedMinus color="red" size={14} />
								</ActionIcon>
							</Group>
						</Box>
					)}
				</Stack>

				<Box style={{
					flex: 1,
					minHeight: 0,
					display: 'flex',
					flexDirection: 'column',
					border: '1px solid var(--mantine-color-gray-3)',
					borderRadius: '4px',
					overflow: 'hidden',
					backgroundColor: 'var(--mantine-color-gray-0)'
				}}>
					{!isNodeSelected && (
						<Box style={{ padding: '8px 12px' }}>
							<Text size="xs" c="dimmed">Select a node to configure access rights.</Text>
						</Box>
					)}
					<ScrollArea style={{ flex: 1 }}>
						<AccessRightsSelection
							selectedRights={selectedAccessRights}
							onRightsChange={onRightsChange}
							resourceOperations={resourceOperations}
							readOnly={!isNodeSelected}
						/>
					</ScrollArea>
				</Box>
			</Stack>

			<Group gap="xs" justify="flex-end" mt="md">
				<Button
					variant="filled"
					color="blue"
					onClick={onSubmit}
					disabled={createDisabled}
				>
					Create
				</Button>
				<Button
					variant="default"
					color="gray"
					onClick={onCancel}
				>
					Cancel
				</Button>
			</Group>
		</Box>
	);
}


export interface InfoPanelProps {
	rootNode: TreeNode;
	selectedNodes?: TreeNode[];
}

export function InfoPanel(props: InfoPanelProps) {
	const theme = useMantineTheme();

	const [associationRootNodes, setAssociationRootNodes] = useState<TreeNode[]>([]);
	const [descendantsNodes, setDescendantsNodes] = useState<TreeNode[]>([]);
	const [resourceOperations, setResourceOperations] = useState<string[]>([]);

	// Assignment mode state
	const [isAssignmentMode, setIsAssignmentMode] = useState(false);
	const [assignmentTargets, setAssignmentTargets] = useState<TreeNode[]>([]);

	// Association creation mode state
	const [isAssociationMode, setIsAssociationMode] = useState(false);
	const [associationTarget, setAssociationTarget] = useState<TreeNode | null>(null);
	const [associationDirection, setAssociationDirection] = useState<'outgoing' | 'incoming' | null>(null);
	const [selectedAccessRights, setSelectedAccessRights] = useState<string[]>([]); // No defaults - user must select

	// Descendants tree selection state
	const [selectedDescendantNode, setSelectedDescendantNode] = useState<TreeNode | null>(null);

	// Association selection state
	const [selectedAssociationNode, setSelectedAssociationNode] = useState<TreeNode | null>(null);
	const [selectedAssociationDirection, setSelectedAssociationDirection] = useState<AssociationDirection>(AssociationDirection.Incoming);

	// Handle selection in descendants tree
	const handleDescendantSelection = useCallback((nodeApi: any[]) => {
		if (nodeApi && nodeApi.length > 0) {
			const selectedNode = nodeApi[0].data as TreeNode;
			setSelectedDescendantNode(selectedNode);
		} else {
			setSelectedDescendantNode(null);
		}
	}, []);


	// Check if the selected node is a root node in the descendants tree
	const isSelectedNodeRoot = useMemo(() => {
		if (!selectedDescendantNode) {return false;}
		return descendantsNodes.some(rootNode => rootNode.id === selectedDescendantNode.id);
	}, [selectedDescendantNode, descendantsNodes]);


	// Deassign selected descendant node
	const handleDeassignSelected = useCallback(async () => {
		if (!selectedDescendantNode || !props.rootNode.pmId || !selectedDescendantNode.pmId) {
			return;
		}

		try {
			await AdjudicationService.deassign(props.rootNode.pmId, [selectedDescendantNode.pmId]);

			// Immediately remove the deassigned node from the descendants tree
			setDescendantsNodes(currentNodes =>
				currentNodes.filter(node => node.pmId !== selectedDescendantNode.pmId)
			);

			// Clear selection since the node is no longer assigned
			setSelectedDescendantNode(null);
		} catch (error) {
			console.error('Failed to deassign node:', error);
		}
	}, [selectedDescendantNode, props.rootNode]);

	// Assignment mode handlers
	const handleStartAssignment = useCallback(() => {
		setIsAssignmentMode(true);
		setAssignmentTargets([]); // Start with empty list
	}, []);

	const handleCancelAssignment = useCallback(() => {
		setIsAssignmentMode(false);
		setAssignmentTargets([]);
	}, []);

	const handleSubmitAssignment = useCallback(async () => {
		const descendantIds = assignmentTargets.map(node => node.pmId).filter(id => id !== undefined);

		if (!props.rootNode.pmId || descendantIds.length === 0) {
			return;
		}

		try {
			// Use the assign API to create assignments
			await AdjudicationService.assign(props.rootNode.pmId, descendantIds);

			// Reset assignment mode
			setIsAssignmentMode(false);
			setAssignmentTargets([]);

			// Refresh descendants tree
			const updatedDescendants = await QueryService.selfComputeAdjacentDescendantPrivileges(props.rootNode.pmId);
			const transformedDescendants = transformNodePrivilegeInfoToTreeNodes(updatedDescendants);
			setDescendantsNodes(transformedDescendants);

			// Refresh the associations tree as assignments can affect associations
			const updatedAssociations = await fetchAssociationChildren(
				props.rootNode.pmId,
				{
					nodeTypes: NODE_TYPES,
					showIncomingAssociations: true,
					showOutgoingAssociations: true,
				},
				props.rootNode.id
			);
			setAssociationRootNodes(updatedAssociations);

		} catch (error) {
			notifications.show({
				color: 'red',
				title: 'Assignment Error',
				message: (error as Error).message,
			});
		}
	}, [props.rootNode, assignmentTargets]);

	const handleRemoveAssignmentTarget = useCallback((nodeToRemove: TreeNode) => {
		setAssignmentTargets(prev => prev.filter(node => node.id !== nodeToRemove.id));
	}, []);

	// Association mode handlers
	const handleStartAssociation = useCallback((direction: AssociationDirection) => {
		setIsAssociationMode(true);
		setAssociationDirection(direction);
		setAssociationTarget(null); // Start with no target
		setSelectedAccessRights([]); // Reset to empty - user must select
		setSelectedAssociationNode(null);
		setSelectedAssociationDirection(direction);
	}, []);

	const handleCancelAssociation = useCallback(() => {
		setIsAssociationMode(false);
		setAssociationTarget(null);
		setAssociationDirection(null);
		setSelectedAccessRights([]);
	}, []);

	const handleClearAssociationSelection = useCallback(() => {
		setAssociationTarget(null);
		setSelectedAccessRights([]);
	}, []);

	const handleSubmitAssociation = useCallback(async () => {
		if (!props.rootNode.pmId || !associationTarget?.pmId || !associationDirection) {
			return;
		}

		try {
			// Use the associate API to create associations
			// For outgoing: root -> target, for incoming: target -> root
			let updatedAssociations: TreeNode[] = [];
			if (associationDirection === 'outgoing') {
				await AdjudicationService.associate(props.rootNode.pmId, associationTarget.pmId, selectedAccessRights);
				updatedAssociations = await fetchAssociationChildren(
					props.rootNode.pmId,
					{
						nodeTypes: NODE_TYPES,
						showIncomingAssociations: true,
						showOutgoingAssociations: true,
					},
					props.rootNode.id
				);
			} else {
				await AdjudicationService.associate(associationTarget.pmId, props.rootNode.pmId, selectedAccessRights);
				updatedAssociations = await fetchAssociationChildren(
					props.rootNode.pmId,
					{
						nodeTypes: NODE_TYPES,
						showIncomingAssociations: true,
						showOutgoingAssociations: true,
					},
					props.rootNode.id
				);
			}
			setAssociationRootNodes(updatedAssociations);

			notifications.show({
				color: 'green',
				title: 'Association Created',
				message: `Association successfully created with ${associationDirection === 'outgoing' ? 'target' : 'source'} ${associationTarget.name}`,
			});

			// Reset association mode
			setIsAssociationMode(false);
			setAssociationTarget(null);
			setAssociationDirection(null);
			setSelectedAccessRights([]);

		} catch (error) {
			notifications.show({
				color: 'red',
				title: 'Association Error',
				message: (error as Error).message,
			});
		}
	}, [props.rootNode, associationTarget, associationDirection, selectedAccessRights]);

	// Handle association updates (refresh the associations list)
	const handleAssociationUpdated = useCallback(async () => {
		if (props.rootNode.pmId) {
			const updatedAssociations = await fetchAssociationChildren(
				props.rootNode.pmId,
				{
					nodeTypes: NODE_TYPES,
					showIncomingAssociations: true,
					showOutgoingAssociations: true,
				},
				props.rootNode.id
			);
			setAssociationRootNodes(updatedAssociations);
		}
	}, [props.rootNode.pmId, props.rootNode.id]);

	const handleRemoveAssociationTarget = useCallback(() => {
		setAssociationTarget(null);
	}, []);

	// Accumulate selected nodes when in assignment mode
	useEffect(() => {
		if (isAssignmentMode && props.selectedNodes && props.selectedNodes.length > 0) {
			setAssignmentTargets(prev => {
				// Add any new nodes that aren't already in the assignment targets
				const newNodes = props.selectedNodes!.filter(selectedNode =>
					!prev.some(existingNode => existingNode.id === selectedNode.id)
				);
				return [...prev, ...newNodes];
			});
		}
	}, [props.selectedNodes, isAssignmentMode]);

	// Handle selected nodes when in association mode - restrict based on direction
	useEffect(() => {
		if (isAssociationMode && props.selectedNodes && props.selectedNodes.length > 0) {
			// Filter for allowed node types based on association direction
			let allowedTypes: NodeType[];
			if (associationDirection === 'incoming') {
				// For incoming associations, only UA nodes are valid
				allowedTypes = [NodeType.UA];
			} else {
				// For outgoing associations, UA, OA, and O nodes are valid
				allowedTypes = [NodeType.UA, NodeType.OA, NodeType.O];
			}

			const validNode = props.selectedNodes.find(node =>
				allowedTypes.includes(node.type as NodeType)
			);

			if (validNode) {
				setAssociationTarget(validNode);
			}
		}
	}, [props.selectedNodes, isAssociationMode, associationDirection]);

	// Fetch association nodes for the root node
	useEffect(() => {
		if (props.rootNode.pmId) {
			fetchAssociationChildren(
				props.rootNode.pmId,
				{
					nodeTypes: NODE_TYPES,
					showIncomingAssociations: true,
					showOutgoingAssociations: true,
				},
				props.rootNode.id
			).then(setAssociationRootNodes);
		}
	}, [props.rootNode.pmId, props.rootNode.id]);

	// Fetch descendants nodes for the root node
	useEffect(() => {
		if (props.rootNode.pmId) {
			QueryService.selfComputeAdjacentDescendantPrivileges(props.rootNode.pmId)
				.then(transformNodePrivilegeInfoToTreeNodes)
				.then(setDescendantsNodes);
		}
	}, [props.rootNode.pmId]);

	// Fetch resource operations
	useEffect(() => {
		async function fetchResourceOperations() {
			try {
				const response = await QueryService.getResourceOperations();
				setResourceOperations(response.values || []);
			} catch (error) {
				setResourceOperations([]);
			}
		}
		fetchResourceOperations();
	}, []);

	const handleAssociationSelected = useCallback((node: NodeApi<TreeNode>[]) => {
		if (isAssociationMode) {
			return;
		}
		if (node && node.length > 0) {
			const selectedNode = node[0].data as TreeNode;

			if (!selectedNode.isAssociation) {
				return
			}

			// Only update state if the selected node is actually different
			setSelectedAssociationNode(prev => {
				if (prev?.id === selectedNode.id) {
					return prev; // Don't change state if same node is selected
				}
				return selectedNode;
			});
		} else {
			setSelectedAssociationNode(null);
		}
	}, [isAssociationMode]);

	const associationNodesForDirection = useMemo(
		() => associationRootNodes.filter(node => node.associationDetails?.type === selectedAssociationDirection),
		[associationRootNodes, selectedAssociationDirection]
	);

	// Memoize tree props to prevent unnecessary re-renders
	const associationTreeProps = useMemo(() => ({
		direction: "ascendants" as const,
		rootNodes: associationNodesForDirection,
		showToolbar: true,
		filterConfig: {
			nodeTypes: NODE_TYPES,
			showIncomingAssociations: false,
			showOutgoingAssociations: false,
		},
		clickHandlers: {
			onSelect: handleAssociationSelected
		}
	}), [associationNodesForDirection, handleAssociationSelected]);

	const creationDirection = associationDirection ? associationDirection as AssociationDirection : null;
	const hasAssociationDetails = selectedAssociationNode?.associationDetails?.type === selectedAssociationDirection;
	const activeAssociationNode = hasAssociationDetails ? selectedAssociationNode : null;
	const isCreatingForSelectedDirection = creationDirection !== null && creationDirection === selectedAssociationDirection;
	const showAssociationEmptyState = associationNodesForDirection.length === 0 && !isCreatingForSelectedDirection;
	const isDetailsColumnVisible = Boolean(activeAssociationNode) || isAssociationMode;
	const treeFlexValue = isDetailsColumnVisible ? '1 1 50%' : '1 1 100%';

	return (
		<Stack gap="md" style={{ padding: "0 16px 16px 16px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
			<Box>
				<Stack gap="sm">
					<Group>
						<NodeIcon type={props.rootNode.type} size="40px" fontSize="28px" />
						<Stack gap={0}>
							<Title order={3}>{props.rootNode.name}</Title>
							<Text size="sm" c="dimmed">ID: {props.rootNode.pmId}</Text>
						</Stack>
					</Group>
					{/* TODO <Box>
						<Text size="sm" fw={500} mb="xs">Properties:</Text>
						{renderProperties()}
					</Box>*/}
				</Stack>
			</Box>

			{/* Content sections */}
			<Box style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0, overflow: 'auto' }}>
				{/* Descendants Tree / Assignment Panel */}
				{props.rootNode.type !== "PC" && (
					<Box style={{ flex: 0.4, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
						{!isAssignmentMode ? (
							<>
								<Group gap="xs" align="baseline" mb="xs">
									<Title order={4}>Descendants</Title>
									<Divider orientation="vertical" />
									<Text size="sm" c="dimmed">Select a node from the tree to deassign</Text>
								</Group>
								<Box style={{ flex: 1, backgroundColor: theme.other.intellijContentBg, border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
									<PMTree
										key={`descendants-${descendantsNodes.length}-${descendantsNodes.map(n => n.id).join('-')}`}
										direction="descendants"
										rootNodes={descendantsNodes}
										showToolbar={false}
										filterConfig={{
											nodeTypes: NODE_TYPES,
											showIncomingAssociations: false,
											showOutgoingAssociations: false,
										}}
										clickHandlers={{
											onSelect: handleDescendantSelection
										}}
									/>
								</Box>

								{/* Action Buttons */}
								<Group justify="center" mt="sm" mb="sm" gap="xs">
									<Button
										leftSection={<IconArrowLeftCircle />}
										onClick={() => handleStartAssignment()}>
										Assign To
									</Button>

									{isSelectedNodeRoot && selectedDescendantNode && (
										<Button
											leftSection={<IconX />}
											color="red"
											onClick={handleDeassignSelected} >
											Deassign From
										</Button>
									)}
								</Group>
							</>
						) : (
							<>
								<Title order={4} mb="sm">Assign To</Title>
								<Box style={{
									flex: 1,
									border: '1px solid var(--mantine-color-gray-3)',
									borderRadius: '4px',
									padding: '12px',
									backgroundColor: 'var(--mantine-color-gray-0)',
									overflow: 'auto'
								}}>
									{assignmentTargets.length === 0 && (
										<Alert variant="light" color="blue" mb="sm">
											<Text size="sm">Select nodes from the tree on the left</Text>
										</Alert>
									)}
									{assignmentTargets.length > 0 ? (
										<Stack gap={0}>
											{assignmentTargets.map((node) => (
												<Group key={node.id} justify="space-between" style={{
													padding: '8px 12px',
													border: '1px solid var(--mantine-color-gray-2)',
													borderRadius: '4px',
													backgroundColor: 'white'
												}}>
													<Group gap="xs">
														<NodeIcon type={node.type} size="18px" fontSize="14px" />
														<Text size="sm">{node.name}</Text>
													</Group>
													<ActionIcon
														size="sm"
														variant="subtle"
														color="red"
														onClick={() => handleRemoveAssignmentTarget(node)}
													>
														<IconSquareRoundedMinus size={16} />
													</ActionIcon>
												</Group>
											))}
										</Stack>
									) : null}
								</Box>

								{/* Submit/Cancel Buttons */}
								<Group justify="center" mt="sm" mb="sm" gap="xs">
									<ActionIcon
										variant="filled"
										size="md"
										onClick={handleSubmitAssignment}
										style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
									>
										<Text size="sm" style={{ color: 'white' }}>Submit</Text>
									</ActionIcon>
									<ActionIcon
										variant="outline"
										size="md"
										onClick={handleCancelAssignment}
										style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
									>
										<Text size="sm">Cancel</Text>
									</ActionIcon>
								</Group>
							</>
						)}
					</Box>
				)}

				<Divider orientation="horizontal" />

				{/* Associations Tabs */}
				{(props.rootNode.type !== "PC" && props.rootNode.type !== "U") && (
					<Box style={{ flex: 0.6, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
						<Group gap="xs" align="baseline" mb="xs">
							<Title order={4} mb={0}>Associations</Title>
						<Button.Group>
							<Button
								variant={selectedAssociationDirection === AssociationDirection.Incoming ? "filled" : "default"}
								onClick={() => setSelectedAssociationDirection(AssociationDirection.Incoming)}
								disabled={isAssociationMode}
							>
								Incoming
							</Button>
							<Button
								variant={selectedAssociationDirection === AssociationDirection.Outgoing ? "filled" : "default"}
								onClick={() => setSelectedAssociationDirection(AssociationDirection.Outgoing)}
								disabled={isAssociationMode}
							>
								Outgoing
							</Button>
						</Button.Group>
						</Group>

						<Box
							style={{
								flex: 1,
								minHeight: 0,
								border: '1px solid var(--mantine-color-gray-3)',
								borderRadius: '4px',
								display: 'flex',
								minWidth: 0,
								height: '100%',
								overflow: 'hidden'
							}}
						>
							<Box
								style={{
									flex: treeFlexValue,
									minWidth: 0,
									minHeight: 0,
									display: 'flex',
									flexDirection: 'column',
									backgroundColor: theme.other.intellijContentBg
								}}
							>
								<Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
									{showAssociationEmptyState ? (
										<Alert variant="light" color="gray">
											<Text size="sm" c="dimmed">No {selectedAssociationDirection} associations</Text>
										</Alert>
									) : (
										<PMTree {...associationTreeProps} />
									)}
								</Box>
							</Box>

							{isAssociationMode && creationDirection ? (
								<AssociationCreationPanel
									direction={creationDirection}
									selectedNode={associationTarget}
									selectedAccessRights={selectedAccessRights}
									onRightsChange={setSelectedAccessRights}
									resourceOperations={resourceOperations}
									onSubmit={handleSubmitAssociation}
									onCancel={handleCancelAssociation}
									onClearSelection={handleClearAssociationSelection}
									style={{
										flex: '1 1 50%',
										minWidth: 0,
										padding: '1rem',
										backgroundColor: 'var(--mantine-color-gray-0)',
										borderLeft: '1px solid var(--mantine-color-gray-3)'
									}}
								/>
							) : activeAssociationNode && (
								<AssociationDetailsPanel
									associationNode={activeAssociationNode}
									rootNode={props.rootNode}
									resourceOperations={resourceOperations}
									onAssociationUpdated={handleAssociationUpdated}
									onClose={() => setSelectedAssociationNode(null)}
									style={{
										flex: '1 1 50%',
										minWidth: 0,
										padding: '1rem',
										backgroundColor: 'var(--mantine-color-gray-0)',
										borderLeft: '1px solid var(--mantine-color-gray-3)'
									}}
								/>
							)}
						</Box>

						{!isAssociationMode && (props.rootNode.type === NodeType.UA || props.rootNode.type === NodeType.OA || props.rootNode.type === NodeType.O) && (
							<Group justify="center" style={{ paddingTop: '12px' }}>
								<Button
									leftSection={<IconPlus />}
									onClick={() => handleStartAssociation(selectedAssociationDirection)}>
									Create
								</Button>
							</Group>
						)}

						{/*<Tabs variant="default" defaultValue="incoming" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
							<Tabs.List>
								<Tabs.Tab value="incoming">
									<Text>Incoming ({associationRootNodes.filter(node => node.associationDetails?.type === AssociationDirection.Incoming).length})</Text>
								</Tabs.Tab>
								<Tabs.Tab value="outgoing">
									<Text>Outgoing ({associationRootNodes.filter(node => node.associationDetails?.type === AssociationDirection.Outgoing).length})</Text>
								</Tabs.Tab>
							</Tabs.List>

							<Tabs.Panel value="incoming" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, padding: "4px 0" }}>
								<Box style={{ flex: 1, minHeight: 0, display: 'flex', minWidth: 0 }}>
									<Box
										style={{
											flex: 1,
											minHeight: 0,
											backgroundColor: theme.other.intellijContentBg,
											border: '1px solid var(--mantine-color-gray-3)',
											borderRadius: '4px',
											display: 'flex',
											flexDirection: 'column',
											minWidth: 0 }}
									>
										{associationRootNodes.filter(node => node.associationDetails?.type === AssociationDirection.Incoming).length === 0 && !(isAssociationMode && associationDirection === 'incoming') ? (
											<Alert variant="light" color="gray">
												<Text size="sm" c="dimmed">No incoming associations</Text>
											</Alert>
										) : (
											<PMTree
												key={`incoming-tree-${associationTreeProps.rootNodes.map(n => n.id).join('-')}`}
												{...associationTreeProps}
											/>
										)}
									</Box>
									{selectedAssociationNode && selectedAssociationNode.associationDetails?.type === AssociationDirection.Incoming && (
										<AssociationDetailsPanel
											associationNode={selectedAssociationNode}
											rootNode={props.rootNode}
											resourceOperations={resourceOperations}
											onAssociationUpdated={handleAssociationUpdated}
											onClose={() => setSelectedAssociationNode(null)}
										/>
									)}
								</Box>
								{!isAssociationMode && (props.rootNode.type === NodeType.UA || props.rootNode.type === NodeType.OA || props.rootNode.type === NodeType.O) && (
									<Group justify="center" style={{ paddingTop: '12px' }}>
										<Button
											leftSection={<IconPlus />}
											onClick={() => handleStartAssociation(AssociationDirection.Incoming)}>
											Create
										</Button>
									</Group>
								)}
							</Tabs.Panel>

							<Tabs.Panel value="outgoing" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: '4px' }}>
								<Box style={{ flex: 1, minHeight: 0, display: 'flex' }}>
									<Box
										style={{
											flex: 1,
											minHeight: 0,
											backgroundColor: theme.other.intellijContentBg,
											border: '1px solid var(--mantine-color-gray-3)',
											borderRadius: '4px',
											display: 'flex',
											flexDirection: 'column' }}
									>
										{associationRootNodes.filter(node => node.associationDetails?.type === AssociationDirection.Outgoing).length === 0 && !(isAssociationMode && associationDirection === 'outgoing') ? (
											<Alert variant="light" color="gray">
												<Text size="sm" c="dimmed">No outgoing associations</Text>
											</Alert>
										) : (
											<PMTree
												key={`outgoing-tree-${outgoingTreeProps.rootNodes.map(n => n.id).join('-')}`}
												{...outgoingTreeProps}
											/>
										)}
									</Box>
									{selectedAssociationNode && selectedAssociationNode.associationDetails?.type === AssociationDirection.Outgoing && (
										<AssociationDetailsPanel
											associationNode={selectedAssociationNode}
											rootNode={props.rootNode}
											resourceOperations={resourceOperations}
											onAssociationUpdated={handleAssociationUpdated}
											onClose={() => setSelectedAssociationNode(null)}
										/>
									)}
								</Box>
								{!isAssociationMode && props.rootNode.type === NodeType.UA && (
									<Group justify="center" mt="xs">
										<Button
											leftSection={<IconPlus />}
											onClick={() => handleStartAssociation(AssociationDirection.Outgoing)}>
											Create
										</Button>
									</Group>
								)}
							</Tabs.Panel>
						</Tabs>*/}
					</Box>
				)}
			</Box>

		</Stack>
	)
}
