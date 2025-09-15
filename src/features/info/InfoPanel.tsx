import React, {useCallback, useEffect, useMemo, useState} from "react";
import {IconSquareRoundedMinus} from "@tabler/icons-react";
import {
	Accordion,
	ActionIcon,
	Alert,
	Box,
	Center,
	Checkbox, Divider,
	Grid,
	Group, Space,
	Stack,
	Text,
	Title,
	useMantineTheme
} from "@mantine/core";
import {PMTree} from "@/features/pmtree";
import {
	AssociationDirection,
	AssociationIcon,
	NodeIcon,
	transformNodesToTreeNodes,
	TreeNode, truncateMiddle
} from "@/features/pmtree/tree-utils";
import {AdjudicationService, NODE_TYPES, NodePrivilegeInfo, NodeType, QueryService} from "@/shared/api/pdp.api";
import {fetchAssociationChildren} from "@/features/pmtree/tree-data-fetcher";
import {notifications} from "@mantine/notifications";
import {AccessRightsSelection} from "@/components/access-rights";



interface AssociationDetailsSectionProps {
	association: TreeNode;
}

interface AccessRightsSectionProps {
	association: TreeNode;
	resourceOperations: string[];
}

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

// Component for the associations tree table
interface AssociationsTreeTableProps {
	associationTreeNodes: TreeNode[];
	onAssociationSelect: (association: TreeNode) => void;
	// Association creation props
	isAssociationMode?: boolean;
	associationDirection?: 'outgoing' | 'incoming' | null;
	associationTarget?: TreeNode | null;
	selectedAccessRights?: string[];
	resourceOperations?: string[];
	onRemoveAssociationTarget?: () => void;
	onSubmitAssociation?: () => void;
	onCancelAssociation?: () => void;
	onAccessRightsChange?: (rights: string[]) => void;
	// For existing association management
	rootNode?: TreeNode;
	onAssociationUpdated?: () => void;
}

function AssociationsTreeTable({ 
	associationTreeNodes, 
	isAssociationMode,
	associationDirection,
	associationTarget,
	selectedAccessRights,
	resourceOperations,
	onRemoveAssociationTarget,
	onSubmitAssociation,
	onCancelAssociation,
	onAccessRightsChange,
	rootNode,
	onAssociationUpdated
}: AssociationsTreeTableProps) {
	const theme = useMantineTheme();
	const [editingAssociation, setEditingAssociation] = useState<string | null>(null);
	const [editingAccessRights, setEditingAccessRights] = useState<{[key: string]: string[]}>({});

	// Handle updating an existing association
	const handleUpdateAssociation = useCallback(async (associationTreeNode: TreeNode) => {
		if (!rootNode?.pmId || !associationTreeNode.pmId) {
			return;
		}

		const newAccessRights = editingAccessRights[associationTreeNode.id] || associationTreeNode.associationDetails?.accessRightSet || [];
		
		if (newAccessRights.length === 0) {
			notifications.show({
				color: 'red',
				title: 'Update Error',
				message: 'At least one access right must be selected',
			});
			return;
		}

		try {
			// Determine source and target based on association direction
			// For outgoing associations: rootNode -> associationTreeNode
			// For incoming associations: associationTreeNode -> rootNode
			const isOutgoing = associationTreeNode.associationDetails?.type === 'outgoing';
			const sourcePmId = isOutgoing ? rootNode.pmId : associationTreeNode.pmId;
			const targetPmId = isOutgoing ? associationTreeNode.pmId : rootNode.pmId;

			// First dissociate the old association, then create new one with updated access rights
			await AdjudicationService.dissociate(sourcePmId, targetPmId);
			await AdjudicationService.associate(sourcePmId, targetPmId, newAccessRights);

			// Clear editing state for this association
			setEditingAccessRights(prev => {
				const updated = { ...prev };
				delete updated[associationTreeNode.id];
				return updated;
			});

			// Refresh associations list
			onAssociationUpdated?.();

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
	}, [rootNode, editingAccessRights, onAssociationUpdated]);

	// Handle deleting an association
	const handleDeleteAssociation = useCallback(async (associationTreeNode: TreeNode) => {
		if (!rootNode?.pmId || !associationTreeNode.pmId) {
			return;
		}

		try {
			// Determine source and target based on association direction
			const isOutgoing = associationTreeNode.associationDetails?.type === 'outgoing';
			const sourcePmId = isOutgoing ? rootNode.pmId : associationTreeNode.pmId;
			const targetPmId = isOutgoing ? associationTreeNode.pmId : rootNode.pmId;

			await AdjudicationService.dissociate(sourcePmId, targetPmId);

			// Clear editing state for this association
			setEditingAccessRights(prev => {
				const updated = { ...prev };
				delete updated[associationTreeNode.id];
				return updated;
			});

			// Refresh associations list
			onAssociationUpdated?.();

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
	}, [rootNode, onAssociationUpdated]);

	return (
		<Accordion
			variant="contained"
			radius="md"
			chevronPosition="left"
			defaultValue={isAssociationMode ? "association-creation" : undefined}
			styles={{
				label: {
					paddingTop: 8,
					paddingBottom: 8,
				}
			}}>
			{/* Association Creation Accordion Item */}
			{isAssociationMode && (
				<Accordion.Item value="association-creation">
					<Accordion.Control>
						<Group justify="space-between" style={{ width: '100%' }}>
							<Group gap="xs">
								<Text>Create {associationDirection === 'outgoing' ? 'Outgoing' : 'Incoming'} Association</Text>
							</Group>
						</Group>
					</Accordion.Control>
					<Accordion.Panel>
						<Grid>
							<Grid.Col span={6}>
								<Text size="sm" fw={500} mb="xs">{associationDirection === 'outgoing' ? 'Target' : 'Source'} Node</Text>
								<Box style={{ height: '120px', border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px', padding: '12px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
									{!associationTarget && (
										<Alert variant="light" color="blue" mb="sm">
											<Text size="sm">
												{associationDirection === 'incoming'
													? 'Select a UA node from the tree on the left'
													: 'Select a UA, OA, or O node from the tree on the left'
												}
											</Text>
										</Alert>
									)}
									{associationTarget && (
										<Group justify="space-between" style={{
											padding: '8px 12px',
											border: '1px solid var(--mantine-color-gray-2)',
											borderRadius: '4px',
											backgroundColor: 'white'
										}}>
											<Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
												<NodeIcon type={associationTarget.type} size="18px" fontSize="14px" />
												<Text
													size="sm"
													style={{
														overflow: 'hidden',
														textOverflow: 'ellipsis',
														whiteSpace: 'nowrap',
														flex: 1
													}}
												>
													{associationTarget.name}
												</Text>
											</Group>
											<ActionIcon
												size="sm"
												variant="subtle"
												color="red"
												onClick={onRemoveAssociationTarget}
											>
												<IconSquareRoundedMinus size={16} />
											</ActionIcon>
										</Group>
									)}
								</Box>

								{/* Submit/Cancel Buttons */}
								<Group justify="center" mt="sm" gap="xs">
									<ActionIcon
										variant="filled"
										size="md"
										onClick={onSubmitAssociation}
										disabled={!associationTarget || (selectedAccessRights?.length || 0) === 0}
										style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
									>
										<Text size="sm" style={{ color: 'white' }}>Create</Text>
									</ActionIcon>
									<ActionIcon
										variant="outline"
										size="md"
										onClick={onCancelAssociation}
										style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
									>
										<Text size="sm">Cancel</Text>
									</ActionIcon>
								</Group>
							</Grid.Col>
							<Grid.Col span={6}>
								<Text size="sm" fw={500} mb="xs">Access Rights</Text>
								<Box style={{ height: '200px', overflow: 'auto' }}>
									{selectedAccessRights && onAccessRightsChange && resourceOperations && (
										<AccessRightsSelection
											selectedRights={selectedAccessRights}
											onRightsChange={onAccessRightsChange}
											resourceOperations={resourceOperations}
										/>
									)}
								</Box>
							</Grid.Col>
						</Grid>
					</Accordion.Panel>
				</Accordion.Item>
			)}
			
			{/* Existing Association Items */}
			{associationTreeNodes.map((associationTreeNode: TreeNode, index: number) => {
				return (
					<Accordion.Item key={associationTreeNode.id} value={`${associationTreeNode.id}-${index}`}>
						<Accordion.Control>
							<Group justify="space-between" style={{ width: '100%' }}>
								<Group gap="xs">
									<AssociationIcon
										direction={associationTreeNode.associationDetails?.type as AssociationDirection}
										size="20"
										color={theme.colors.green[9]}
									/>
									<NodeIcon type={associationTreeNode.type} size="20px" fontSize="14px" />
									<Text size="sm">{truncateMiddle(associationTreeNode.name)}</Text>
								</Group>
								<Text size="sm" c="dimmed" style={{ maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
									{createAccessRightsPreview(associationTreeNode.associationDetails?.accessRightSet || [])}
								</Text>
							</Group>
						</Accordion.Control>
						<Accordion.Panel>
							<Grid>
								<Grid.Col span={6}>
									<Box style={{ height: '300px', border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
										<PMTree
											direction="ascendants"
											rootNodes={[associationTreeNode]}
											showToolbar={false}
											filterConfig={{
												nodeTypes: NODE_TYPES,
												showIncomingAssociations: false,
												showOutgoingAssociations: false,
											}}
										/>
									</Box>
								</Grid.Col>
								<Grid.Col span={6}>
									<Box style={{ height: '300px', overflow: 'auto' }}>
										{resourceOperations && (
											<AccessRightsSelection
												selectedRights={editingAccessRights[associationTreeNode.id] || associationTreeNode.associationDetails?.accessRightSet || []}
												onRightsChange={(rights) => setEditingAccessRights(prev => ({...prev, [associationTreeNode.id]: rights}))}
												resourceOperations={resourceOperations}
											/>
										)}
									</Box>
									
									{/* Update/Delete Buttons */}
									<Group justify="center" mt="sm" gap="xs">
										<ActionIcon
											variant="filled"
											color="blue"
											size="md"
											onClick={() => handleUpdateAssociation(associationTreeNode)}
											style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
										>
											<Text size="sm" style={{ color: 'white' }}>Update</Text>
										</ActionIcon>
										<ActionIcon
											variant="filled"
											color="red"
											size="md"
											onClick={() => handleDeleteAssociation(associationTreeNode)}
											style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
										>
											<Text size="sm" style={{ color: 'white' }}>Delete</Text>
										</ActionIcon>
									</Group>
								</Grid.Col>
							</Grid>
						</Accordion.Panel>
					</Accordion.Item>
				)
			})}
		</Accordion>
	);
}




export interface InfoPanelProps {
	rootNode: TreeNode;
	selectedNodes?: TreeNode[];
}

export function InfoPanel(props: InfoPanelProps) {
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
	const handleStartAssociation = useCallback((direction: 'outgoing' | 'incoming') => {
		setIsAssociationMode(true);
		setAssociationDirection(direction);
		setAssociationTarget(null); // Start with no target
		setSelectedAccessRights([]); // Reset to empty - user must select
	}, []);

	const handleCancelAssociation = useCallback(() => {
		setIsAssociationMode(false);
		setAssociationTarget(null);
		setAssociationDirection(null);
		setSelectedAccessRights([]);
	}, []);

	const handleSubmitAssociation = useCallback(async () => {
		if (!props.rootNode.pmId || !associationTarget?.pmId || !associationDirection) {
			return;
		}
		
		try {
			// Use the associate API to create associations
			// For outgoing: root -> target, for incoming: target -> root
			if (associationDirection === 'outgoing') {
				await AdjudicationService.associate(props.rootNode.pmId, associationTarget.pmId, selectedAccessRights);
			} else {
				await AdjudicationService.associate(associationTarget.pmId, props.rootNode.pmId, selectedAccessRights);
			}

			// Reset association mode
			setIsAssociationMode(false);
			setAssociationTarget(null);
			setAssociationDirection(null);
			setSelectedAccessRights([]);
			
			// Refresh the associations tree
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
								<Group gap="xs" align="baseline" mb="sm">
									<Title order={5}>Descendants</Title>
									<Divider orientation="vertical" />
									<Text size="sm" c="dimmed">Select a node from the tree to deassign</Text>
								</Group>
								<Box style={{ flex: 1, border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px', minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
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
									<ActionIcon
										variant="filled"
										size="md"
										onClick={handleStartAssignment}
										style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
									>
										<Group gap="xs">
											<Text size="sm" style={{ color: 'white' }}>Assign To</Text>
										</Group>
									</ActionIcon>
									
									{isSelectedNodeRoot && selectedDescendantNode && (
										<ActionIcon
											variant="filled"
											color="red"
											size="md"
											onClick={handleDeassignSelected}
											style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
										>
											<Group gap="xs">
												<Text size="sm" style={{ color: 'white' }}>Deassign From</Text>
											</Group>
										</ActionIcon>
									)}
								</Group>
							</>
						) : (
							<>
								<Title order={5} mb="sm">Assign To</Title>
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

				{/* Associations Tree Table */}
				{props.rootNode.type !== "PC" && (
					<Box style={{ flex: 0.6, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
						<Title order={5} mb="sm">Associations</Title>
						
						{/* Association Creation Buttons */}
						{!isAssociationMode && (
							<Group justify="flex-start" mb="sm" gap="xs">
								{/* Create Outgoing - only available for UA nodes */}
								{props.rootNode.type === NodeType.UA && (
									<ActionIcon
										variant="filled"
										size="md"
										onClick={() => handleStartAssociation('outgoing')}
										style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
									>
										<Center>
											<Text size="sm" style={{ color: 'white' }}>Create Outgoing</Text>
											<Space px={2}/>
											<AssociationIcon size="20px" direction={AssociationDirection.Outgoing}/>
										</Center>
									</ActionIcon>
								)}
								
								{/* Create Incoming - available for all non-PC nodes */}
								<ActionIcon
									variant="filled"
									size="md"
									onClick={() => handleStartAssociation('incoming')}
									style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}
								>
									<Center>
										<Text size="sm" style={{ color: 'white' }}>Create Incoming</Text>
										<Space px={2}/>
										<AssociationIcon size="20px" direction={AssociationDirection.Incoming}/>
									</Center>
								</ActionIcon>
							</Group>
						)}
						
						<Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
							<AssociationsTreeTable
								key={`associations-${associationRootNodes.length}-${associationRootNodes.map(n => n.id).join('-')}`}
								associationTreeNodes={associationRootNodes}
								onAssociationSelect={() => {}} // No-op since we don't need selection
								isAssociationMode={isAssociationMode}
								associationDirection={associationDirection}
								associationTarget={associationTarget}
								selectedAccessRights={selectedAccessRights}
								resourceOperations={resourceOperations}
								onRemoveAssociationTarget={handleRemoveAssociationTarget}
								onSubmitAssociation={handleSubmitAssociation}
								onCancelAssociation={handleCancelAssociation}
								onAccessRightsChange={setSelectedAccessRights}
								rootNode={props.rootNode}
								onAssociationUpdated={handleAssociationUpdated}
							/>
						</Box>
						
					</Box>
				)}
			</Box>

		</Stack>
	)
}