import React, { useCallback, useEffect, useMemo, useState } from "react";
import {IconArrowRightCircle, IconSquareRoundedMinus, IconX} from "@tabler/icons-react";
import { NodeApi } from "react-arborist";
import { ActionIcon, Alert, Box, Button, Divider, Group, Stack, Text, useMantineTheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { PMTree } from "@/features/pmtree";
import { fetchAssociationChildren } from "@/features/pmtree/tree-data-fetcher";
import { AssociationDirection, IncomingAssociationIcon, OutgoingAssociationIcon, NodeIcon, transformNodesToTreeNodes, TreeNode } from "@/features/pmtree/tree-utils";
import { NODE_TYPES, NodePrivilegeInfo, NodeType } from "@/shared/api/pdp.types";
import * as QueryService from "@/shared/api/pdp_query.api";
import * as AdjudicationService from "@/shared/api/pdp_adjudication.api";
import { AssociationModal } from "./AssociationModal";

// Helper function to transform NodePrivilegeInfo to TreeNode
function transformNodePrivilegeInfoToTreeNodes(privileges: NodePrivilegeInfo[]): TreeNode[] {
	const nodes = privileges
		.map(priv => priv.node)
		.filter((node): node is NonNullable<typeof node> => node !== undefined);

	return transformNodesToTreeNodes(nodes);
}


export interface InfoPanelProps {
	rootNode: TreeNode;
	selectedNodes?: TreeNode[];
	onClose?: () => void;
}

export function InfoPanel(props: InfoPanelProps) {
	const theme = useMantineTheme();

	const [associationRootNodes, setAssociationRootNodes] = useState<TreeNode[]>([]);
	const [descendantsNodes, setDescendantsNodes] = useState<TreeNode[]>([]);
	const [resourceOperations, setResourceOperations] = useState<string[]>([]);

	// Assignment mode state
	const [isAssignmentMode, setIsAssignmentMode] = useState(false);
	const [assignmentTargets, setAssignmentTargets] = useState<TreeNode[]>([]);

	// Association modal state
	const [isAssociationModalOpen, setIsAssociationModalOpen] = useState(false);
	const [associationModalMode, setAssociationModalMode] = useState<'create' | 'edit'>('create');
	const [associationDirection, setAssociationDirection] = useState<AssociationDirection | null>(null);
	const [editingAssociationNode, setEditingAssociationNode] = useState<TreeNode | null>(null);

	// Descendants tree selection state
	const [selectedDescendantNode, setSelectedDescendantNode] = useState<TreeNode | null>(null);

	// Association tree state
	const [selectedAssociationDirection, setSelectedAssociationDirection] = useState<AssociationDirection>(AssociationDirection.Incoming);

	// Reset assignment mode when a different node is opened
	useEffect(() => {
		setIsAssignmentMode(false);
		setAssignmentTargets([]);
	}, [props.rootNode.pmId]);

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
		if (!selectedDescendantNode) { return false; }
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

	// Association modal handlers
	const handleStartAssociation = useCallback((direction: AssociationDirection) => {
		setAssociationModalMode('create');
		setAssociationDirection(direction);
		setEditingAssociationNode(null);
		setIsAssociationModalOpen(true);
		setSelectedAssociationDirection(direction);
	}, []);

	const handleEditAssociation = useCallback((associationNode: TreeNode) => {
		setAssociationModalMode('edit');
		setAssociationDirection(associationNode.associationDetails?.type || AssociationDirection.Incoming);
		setEditingAssociationNode(associationNode);
		setIsAssociationModalOpen(true);
	}, []);

	const handleCloseAssociationModal = useCallback(() => {
		setIsAssociationModalOpen(false);
		setAssociationDirection(null);
		setEditingAssociationNode(null);
	}, []);

	const handleSubmitAssociation = useCallback(async (selectedNode: TreeNode, accessRights: string[]) => {
		if (!props.rootNode.pmId || !selectedNode.pmId || !associationDirection) {
			return;
		}

		try {
			const isOutgoing = associationDirection === AssociationDirection.Outgoing;
			const sourcePmId = isOutgoing ? props.rootNode.pmId : selectedNode.pmId;
			const targetPmId = isOutgoing ? selectedNode.pmId : props.rootNode.pmId;

			if (associationModalMode === 'edit') {
				// Update existing association: dissociate then reassociate
				await AdjudicationService.dissociate(sourcePmId, targetPmId);
				await AdjudicationService.associate(sourcePmId, targetPmId, accessRights);

				// Update the association node in state
				setAssociationRootNodes(prev => prev.map(node => {
					if (node.pmId === selectedNode.pmId && node.associationDetails?.type === associationDirection) {
						return {
							...node,
							associationDetails: {
								...node.associationDetails,
								accessRightSet: accessRights,
							},
						};
					}
					return node;
				}));

				notifications.show({
					color: 'green',
					title: 'Association Updated',
					message: 'Association access rights have been updated successfully',
				});
			} else {
				// Create new association
				await AdjudicationService.associate(sourcePmId, targetPmId, accessRights);

				const newAssociationNode: TreeNode = {
					id: crypto.randomUUID(),
					pmId: selectedNode.pmId,
					name: selectedNode.name,
					type: selectedNode.type,
					children: [],
					parent: props.rootNode.id,
					isAssociation: true,
					associationDetails: {
						type: associationDirection,
						accessRightSet: accessRights,
					},
				};

				setAssociationRootNodes(prev => {
					const filtered = prev.filter(node => !(node.associationDetails?.type === newAssociationNode.associationDetails?.type && node.pmId === newAssociationNode.pmId));
					return [...filtered, newAssociationNode];
				});

				notifications.show({
					color: 'green',
					title: 'Association Created',
					message: `Association successfully created with ${isOutgoing ? 'target' : 'source'} ${selectedNode.name}`,
				});
			}

		} catch (error) {
			notifications.show({
				color: 'red',
				title: associationModalMode === 'edit' ? 'Update Error' : 'Association Error',
				message: (error as Error).message,
			});
		}
	}, [props.rootNode, associationDirection, associationModalMode]);

	const handleDeleteAssociation = useCallback(async (associationNode: TreeNode) => {
		if (!props.rootNode?.pmId || !associationNode.pmId) {
			return;
		}

		try {
			const isOutgoing = associationNode.associationDetails?.type === AssociationDirection.Outgoing;
			const sourcePmId = isOutgoing ? props.rootNode.pmId : associationNode.pmId;
			const targetPmId = isOutgoing ? associationNode.pmId : props.rootNode.pmId;

			await AdjudicationService.dissociate(sourcePmId, targetPmId);

			// Remove the node from state
			setAssociationRootNodes(prev => prev.filter(node => node.id !== associationNode.id));

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
	}, [props.rootNode]);


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


	// Fetch association nodes for the root node
	useEffect(() => {
		if (props.rootNode.pmId) {
			fetchAssociationChildren(
				props.rootNode.pmId,
				{
					nodeTypes: [NodeType.UA, NodeType.OA, NodeType.U, NodeType.O],
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
				const accessRights = await QueryService.getResourceAccessRights();
				setResourceOperations(accessRights);
			} catch (error) {
				setResourceOperations([]);
			}
		}
		fetchResourceOperations();
	}, []);

	// Ensure selected direction is valid for the node type
	useEffect(() => {
		const nodeType = props.rootNode.type;
		const canHaveIncoming = nodeType === NodeType.O || nodeType === NodeType.OA || nodeType === NodeType.UA;
		const canHaveOutgoing = nodeType === NodeType.UA;

		// If current selection is invalid, switch to a valid one
		if (selectedAssociationDirection === AssociationDirection.Incoming && !canHaveIncoming) {
			if (canHaveOutgoing) {
				setSelectedAssociationDirection(AssociationDirection.Outgoing);
			}
		} else if (selectedAssociationDirection === AssociationDirection.Outgoing && !canHaveOutgoing) {
			if (canHaveIncoming) {
				setSelectedAssociationDirection(AssociationDirection.Incoming);
			}
		}
	}, [props.rootNode.type, selectedAssociationDirection]);

	const handleAssociationSelected = useCallback((node: NodeApi<TreeNode>[]) => {
		if (node && node.length > 0) {
			const selectedNode = node[0].data as TreeNode;

			if (!selectedNode.isAssociation) {
				return;
			}

			// Open the modal in edit mode
			handleEditAssociation(selectedNode);
		}
	}, [handleEditAssociation]);

	/*const associationNodesForDirection = useMemo(
		() => associationRootNodes.filter(node => node.associationDetails?.type === selectedAssociationDirection),
		[associationRootNodes, selectedAssociationDirection]
	);*/

	// Memoize tree props to prevent unnecessary re-renders
	const associationTreeProps = useMemo(() => ({
		direction: "ascendants" as const,
		rootNodes: associationRootNodes,
		showReset: true,
		showTreeFilters: true,
		showDirection: true,
		showCreatePolicyClass: false,
		filterConfig: {
			nodeTypes: [NodeType.UA, NodeType.OA, NodeType.U, NodeType.O],
			showIncomingAssociations: true,
			showOutgoingAssociations: true,
		},
		clickHandlers: {
			onSelect: handleAssociationSelected
		}
	}), [associationRootNodes, handleAssociationSelected]);

	const showAssociationEmptyState = associationRootNodes.length === 0;

	return (
		<Stack gap="xs" style={{ padding: "20px 20px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--mantine-color-gray-0)" }}>
			{/* Compact Header - Icon spans both rows */}
			<Group gap="sm" wrap="nowrap" justify="space-between">
				<Group gap="sm" align="center" wrap="nowrap">
					<NodeIcon type={props.rootNode.type} size={40} />
					<Stack gap={0}>
						<Text fw={600} size="md" lh={1.2}>{props.rootNode.name}</Text>
						<Text size="xs" c="dimmed">ID: {props.rootNode.pmId}</Text>
					</Stack>
					<Divider orientation="vertical" />
					{props.rootNode.type !== "PC" && !isAssignmentMode && (
						<Button
							leftSection={<IconArrowRightCircle size={18} />}
							onClick={() => handleStartAssignment()}>
							Assign To
						</Button>
					)}
					{(() => {
						const nodeType = props.rootNode.type;
						const canHaveIncoming = nodeType === NodeType.O || nodeType === NodeType.OA || nodeType === NodeType.UA;
						const canHaveOutgoing = nodeType === NodeType.UA;
						return (
							<>
								{canHaveIncoming && (
									<Button
										color={theme.colors.green[9]}
										leftSection={<IncomingAssociationIcon size="18px" color="currentColor" />}
										onClick={() => handleStartAssociation(AssociationDirection.Incoming)}>
										Create Incoming Association
									</Button>
								)}
								{canHaveOutgoing && (
									<Button
										color={theme.colors.green[9]}
										leftSection={<OutgoingAssociationIcon size="18px" color="currentColor" />}
										onClick={() => handleStartAssociation(AssociationDirection.Outgoing)}>
										Create Outgoing Association
									</Button>
								)}
							</>
						);
					})()}
				</Group>
				{props.onClose && (
					<ActionIcon
						variant="subtle"
						color="gray"
						onClick={props.onClose}
						aria-label="Close panel"
					>
						<IconX size={18} />
					</ActionIcon>
				)}
			</Group>
			<Divider orientation="horizontal" />

			{/* Content sections - horizontal layout for descendants and associations */}
			<Box style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8px', minHeight: 0, overflow: 'hidden' }}>
				{/* Descendants Tree / Assignment Panel */}
				{props.rootNode.type !== "PC" && (
					<Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
						{!isAssignmentMode ? (
							<>
								<Group gap="xs" align="center" mb={8}>
									<Text size="md" fw={600}>Descendants</Text>
									<Button
										size="xs"
										leftSection={<IconX size={14} />}
										color="red"
										onClick={handleDeassignSelected}
										style={{ visibility: isSelectedNodeRoot && selectedDescendantNode ? 'visible' : 'hidden' }}
									>
										Deassign
									</Button>
								</Group>
								<Box style={{ flex: 1, backgroundColor: theme.other.intellijContentBg, border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
									<PMTree
										key={`descendants-${descendantsNodes.length}-${descendantsNodes.map(n => n.id).join('-')}`}
										direction="descendants"
										rootNodes={descendantsNodes}
										showReset
										showTreeFilters
										showDirection
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
							</>
						) : (
							<>
								<Text size="sm" fw={600} mb={4}>Assign To</Text>
								<Box style={{
									flex: 1,
									border: '1px solid var(--mantine-color-gray-3)',
									borderRadius: '4px',
									padding: '8px',
									backgroundColor: 'var(--mantine-color-gray-0)',
									overflow: 'auto'
								}}>
									{assignmentTargets.length === 0 && (
										<Alert variant="light" color="blue" p="xs">
											<Text size="xs">Select nodes from tree</Text>
										</Alert>
									)}
									{assignmentTargets.length > 0 ? (
										<Stack gap={2}>
											{assignmentTargets.map((node) => (
												<Group key={node.id} justify="space-between" style={{
													padding: '4px 8px',
													border: '1px solid var(--mantine-color-gray-2)',
													borderRadius: '4px',
													backgroundColor: 'white'
												}}>
													<Group gap="xs">
														<NodeIcon type={node.type} size={14} />
														<Text size="xs">{node.name}</Text>
													</Group>
													<ActionIcon
														size="xs"
														variant="subtle"
														color="red"
														onClick={() => handleRemoveAssignmentTarget(node)}
													>
														<IconSquareRoundedMinus size={12} />
													</ActionIcon>
												</Group>
											))}
										</Stack>
									) : null}
								</Box>

								{/* Submit/Cancel Buttons */}
								<Group justify="center" mt={4} gap="xs">
									<Button size="xs" onClick={handleSubmitAssignment}>
										Submit
									</Button>
									<Button size="xs" variant="outline" onClick={handleCancelAssignment}>
										Cancel
									</Button>
								</Group>
							</>
						)}
					</Box>
				)}

				{/* Associations Tabs */}
				{(() => {
					const nodeType = props.rootNode.type;
					const canHaveIncoming = nodeType === NodeType.O || nodeType === NodeType.OA || nodeType === NodeType.UA;
					const canHaveOutgoing = nodeType === NodeType.UA;
					const showAssociations = canHaveIncoming || canHaveOutgoing;

					if (!showAssociations) {return null;}

					return (
						<Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
							<Group gap="xs" align="center" mb={8}>
								<Text size="md" fw={600}>Associations</Text>
								<Button
									size="xs"
									leftSection={<IconX size={14} />}
									color="red"
									onClick={handleDeassignSelected}
									style={{ visibility: 'hidden' }}
								/>
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
									overflow: 'hidden',
									backgroundColor: theme.other.intellijContentBg
								}}
							>
								<Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
									{showAssociationEmptyState ? (
										<Alert variant="light" color="gray" p="xs">
											<Text size="xs" c="dimmed">No associations</Text>
										</Alert>
									) : (
										<PMTree {...associationTreeProps} />
									)}
								</Box>
							</Box>
						</Box>
					);
				})()}
			</Box>

			{/* Association Modal (Create/Edit) */}
			{isAssociationModalOpen && associationDirection && (
				<AssociationModal
					opened={isAssociationModalOpen}
					onClose={handleCloseAssociationModal}
					direction={associationDirection}
					onSubmit={handleSubmitAssociation}
					onDelete={handleDeleteAssociation}
					resourceOperations={resourceOperations}
					mode={associationModalMode}
					associationNode={editingAssociationNode || undefined}
					rootNode={props.rootNode}
				/>
			)}
		</Stack>
	)
}
