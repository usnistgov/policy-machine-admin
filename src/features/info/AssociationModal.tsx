import React, { useCallback, useEffect, useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { NodeApi } from 'react-arborist';
import {
	Alert,
	Box,
	Button,
	Group,
	Modal,
	Pill,
	ScrollArea,
	Stack,
	Text,
	Title,
	useMantineTheme,
} from '@mantine/core';
import { AccessRightsSelection } from '@/components/access-rights';
import { PMTree } from '@/features/pmtree';
import {
	AssociationDirection,
	OutgoingAssociationIcon,
	NodeIcon,
	TreeNode,
	truncateMiddle,
} from '@/features/pmtree/tree-utils';
import { NODE_TYPES, NodeType } from '@/shared/api/pdp.types';

interface AssociationCreationModalProps {
	opened: boolean;
	onClose: () => void;
	direction: AssociationDirection;
	onSubmit: (selectedNode: TreeNode, accessRights: string[]) => void;
	onDelete?: (associationNode: TreeNode) => void;
	resourceOperations: string[];
	mode: 'create' | 'edit';
	// For edit mode
	associationNode?: TreeNode;
	rootNode?: TreeNode;
}

export function AssociationModal({
	                                 opened,
	                                 onClose,
	                                 direction,
	                                 onSubmit,
	                                 onDelete,
	                                 resourceOperations,
	                                 mode,
	                                 associationNode,
	                                 rootNode,
                                 }: AssociationCreationModalProps) {
	const theme = useMantineTheme();
	const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
	const [selectedAccessRights, setSelectedAccessRights] = useState<string[]>([]);

	// Initialize state when modal opens
	useEffect(() => {
		if (opened) {
			if (mode === 'edit' && associationNode) {
				// In edit mode, use the association node as the selected node
				setSelectedNode(associationNode);
				setSelectedAccessRights(associationNode.associationDetails?.accessRightSet || []);
			} else {
				// In create mode, start fresh
				setSelectedNode(null);
				setSelectedAccessRights([]);
			}
		}
	}, [opened, mode, associationNode]);

	const handleNodeSelection = useCallback(
		(nodes: NodeApi<TreeNode>[]) => {
			if (nodes && nodes.length > 0) {
				const node = nodes[0].data;

				// Filter based on direction
				if (direction === AssociationDirection.Incoming) {
					// Only allow UA and U nodes for incoming associations
					if (node.type === NodeType.UA || node.type === NodeType.U) {
						setSelectedNode(node);
					}
				} else if (node.type === NodeType.UA || node.type === NodeType.OA || node.type === NodeType.O) {
					setSelectedNode(node);
				}
			} else {
				setSelectedNode(null);
			}
		},
		[direction]
	);

	const handleSubmit = useCallback(() => {
		if (selectedNode && selectedAccessRights.length > 0) {
			onSubmit(selectedNode, selectedAccessRights);
			onClose();
		}
	}, [selectedNode, selectedAccessRights, onSubmit, onClose]);

	const handleDelete = useCallback(() => {
		if (associationNode && onDelete) {
			onDelete(associationNode);
			onClose();
		}
	}, [associationNode, onDelete, onClose]);

	const submitDisabled = !selectedNode || selectedAccessRights.length === 0;
	const isCreateMode = mode === 'create';

	// Filter config based on direction
	const filterConfig = {
		nodeTypes: direction === AssociationDirection.Incoming ? [NodeType.UA, NodeType.U] : NODE_TYPES,
		showIncomingAssociations: false,
		showOutgoingAssociations: false,
	};

	const modalTitle = isCreateMode
		? `Create ${direction === AssociationDirection.Incoming ? 'Incoming' : 'Outgoing'} Association`
		: `Edit ${direction === AssociationDirection.Incoming ? 'Incoming' : 'Outgoing'} Association`;

	// Determine source and target nodes for edit mode
	const sourceNode = direction === AssociationDirection.Incoming ? selectedNode : rootNode;
	const targetNode = direction === AssociationDirection.Incoming ? rootNode : selectedNode;

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={modalTitle}
			size={isCreateMode ? '90%' : '60%'}
			styles={{
				body: {
					height: isCreateMode ? '80vh' : '70vh',
					display: 'flex',
					flexDirection: 'column',
				},
			}}
		>
			{isCreateMode ? (
				// Create mode: Source/Target label, tree on left, access rights on right
				<Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
					{/* Source and Target Label */}
					<Group gap="md" align="center" style={{ justifyContent: 'space-between' }}>
						{/* Source Node */}
						<Box style={{ flex: 1 }}>
							<Text size="s" mb={4}>
								Source Node
							</Text>
							{sourceNode ? (
								<Group gap="xs">
									<NodeIcon type={sourceNode.type} size={30} />
									<Text size="lg" fw={500}>
										{truncateMiddle(sourceNode.name)}
									</Text>
								</Group>
							) : (
								<Alert variant="light" color="blue" p="xs" icon={<IconInfoCircle />}>
									<Text size="sm">Select from tree below</Text>
								</Alert>
							)}
						</Box>

						{/* Association Icon */}
						<Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
							<Box style={{ height: '20px' }} />
							<OutgoingAssociationIcon
								size="32"
								color={theme.colors.green[9]}
							/>
						</Box>

						{/* Target Node */}
						<Box style={{ flex: 1 }}>
							<Text size="s" mb={4}>
								Target Node
							</Text>
							{targetNode ? (
								<Group gap="xs">
									<NodeIcon type={targetNode.type} size={30} />
									<Text size="lg" fw={500}>
										{truncateMiddle(targetNode.name)}
									</Text>
								</Group>
							) : (
								<Alert variant="light" color="blue" p="xs" icon={<IconInfoCircle />}>
									<Text size="sm">Select from tree below</Text>
								</Alert>
							)}
						</Box>
					</Group>

					{/* Content Area */}
					<Box style={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0, overflow: 'hidden' }}>
						{/* Left side - PMTree */}
						<Box
							style={{
								flex: 1,
								minWidth: 0,
								display: 'flex',
								flexDirection: 'column',
								border: '1px solid var(--mantine-color-gray-3)',
								borderRadius: '4px',
								overflow: 'hidden',
								backgroundColor: theme.other.intellijContentBg,
							}}
						>
							<PMTree
								direction="ascendants"
								showReset
								showTreeFilters
								showDirection
								showCreatePolicyClass={false}
								filterConfig={filterConfig}
								clickHandlers={{
									onSelect: handleNodeSelection,
								}}
							/>
						</Box>

						{/* Right side - Access Rights */}
						<Box
							style={{
								minHeight: 0,
								flex: 1,
								minWidth: 0,
								display: 'flex',
								flexDirection: 'column',
								border: '1px solid var(--mantine-color-gray-3)',
								borderRadius: '4px',
								overflow: 'hidden',
								backgroundColor: 'var(--mantine-color-gray-0)',
							}}
						>
							<AccessRightsSelection
								selectedRights={selectedAccessRights}
								onRightsChange={setSelectedAccessRights}
								resourceAccessRights={resourceOperations}
								readOnly={!selectedNode}
							/>
						</Box>
					</Box>
				</Stack>
			) : (
				// Edit mode: Source, Target, and Access Rights stacked vertically
				<Stack gap="md" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
					{/* Source and Target Nodes side by side */}
					<Group gap="md" align="center" style={{ justifyContent: 'space-between', flexShrink: 0 }}>
						{/* Source Node */}
						<Box style={{ flex: 1 }}>
							<Text size="s" mb={4}>
								Source Node
							</Text>
							{sourceNode && (
								<Group gap="xs">
									<NodeIcon type={sourceNode.type} size={30} />
									<Text size="lg" fw={500}>
										{truncateMiddle(sourceNode.name)}
									</Text>
								</Group>
							)}
						</Box>

						{/* Association Icon */}
						<Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
							<Text size="xs" c="dimmed" mb={4} />
							<OutgoingAssociationIcon
								size="32"
								color={theme.colors.green[9]} />
						</Box>

						{/* Target Node */}
						<Box style={{ flex: 1 }}>
							<Text size="s" mb={4}>
								Target Node
							</Text>
							{targetNode && (
								<Group gap="xs">
									<NodeIcon type={targetNode.type} size={30} />
									<Text size="lg" fw={500}>
										{truncateMiddle(targetNode.name)}
									</Text>
								</Group>
							)}
						</Box>
					</Group>

					{/* Access Rights */}
					<Box
						style={{
							minHeight: 0,
							flex: 1,
							minWidth: 0,
							display: 'flex',
							flexDirection: 'column',
							border: '1px solid var(--mantine-color-gray-3)',
							borderRadius: '4px',
							overflow: 'hidden',
							backgroundColor: 'var(--mantine-color-gray-0)',
						}}
					>
						<AccessRightsSelection
							selectedRights={selectedAccessRights}
							onRightsChange={setSelectedAccessRights}
							resourceAccessRights={resourceOperations}
							readOnly={!selectedNode}
						/>
					</Box>
				</Stack>
			)}

			{/* Bottom buttons */}
			<Group justify="center" mt="md">
				{isCreateMode ? (
					<>
						<Button variant="default" color="gray" onClick={onClose}>
							Cancel
						</Button>
						<Button variant="filled" color="blue" onClick={handleSubmit} disabled={submitDisabled}>
							Create
						</Button>
					</>
				) : (
					<>
						<Button variant="default" color="gray" onClick={onClose}>
							Cancel
						</Button>
						<Button variant="filled" color="red" onClick={handleDelete}>
							Delete
						</Button>
						<Button variant="filled" color="blue" onClick={handleSubmit} disabled={submitDisabled}>
							Update
						</Button>
					</>
				)}
			</Group>
		</Modal>
	);
}
