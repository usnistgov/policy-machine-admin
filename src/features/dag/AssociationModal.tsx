import React, { useState, useEffect } from 'react';
import { Modal, Text, SimpleGrid, Group, Title, Button, Checkbox, Divider, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowBigRightLines } from '@tabler/icons-react';
import { QueryService, AdjudicationService } from '@/shared/api/pdp.api';
import { TreeNode } from '@/features/pmtree/tree-utils';

interface AssociationModalProps {
	opened: boolean;
	onClose: () => void;
	mode: 'view' | 'create';
	node: TreeNode;
	selectedUserNode?: TreeNode | null;
	selectedTargetNode?: TreeNode | null;
	isUserTree: boolean;
	onCustomSubmit?: (accessRights: string[]) => void;
}

export function AssociationModal({ 
	opened, 
	onClose, 
	mode, 
	node,
	selectedUserNode,
	selectedTargetNode,
	onCustomSubmit
}: AssociationModalProps) {
	const [resourceRights, setResourceRights] = useState<string[]>([]);
	const [adminRights, setAdminRights] = useState<string[]>([]);
	const [availableResourceRights, setAvailableResourceRights] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);

	// Admin access rights organized by sections (from AdminAccessRights.java)
	const adminAccessRightsSections = {
		wildcard: [
			'*',       
			'*a',         
			'*r',       
			'*a:graph', 
			'*a:prohibition', 
			'*a:obligation',  
			'*a:operation',   
			'*a:routine',     
			'*q',       
			'*q:graph', 
			'*q:prohibition', 
			'*q:obligation',  
			'*q:operation',   
			'*q:routine'      
		],
		graph: [
			'create_policy_class',
			'create_object',
			'create_object_attribute',
			'create_user_attribute',
			'create_user',
			'set_node_properties',
			'delete_policy_class',
			'delete_object',
			'delete_object_attribute',
			'delete_user_attribute',
			'delete_user',
			'delete_policy_class_from',
			'delete_object_from',
			'delete_object_attribute_from',
			'delete_user_attribute_from',
			'delete_user_from',
			'assign',
			'assign_to',
			'deassign',
			'deassign_from',
			'associate',
			'associate_to',
			'dissociate',
			'dissociate_from'
		],
		prohibitions: [
			'create_prohibition',
			'create_process_prohibition',
			'create_prohibition_with_complement_container',
			'delete_process_prohibition',
			'delete_prohibition',
			'delete_prohibition_with_complement_container'
		],
		obligations: [
			'create_obligation',
			'create_obligation_with_any_pattern',
			'delete_obligation',
			'delete_obligation_with_any_pattern'
		],
		operations: [
			'set_resource_operations',
			'create_admin_operation',
			'delete_admin_operation'
		],
		routines: [
			'create_admin_routine',
			'delete_admin_routine'
		],
		policy: [
			'reset',
			'serialize_policy',
			'deserialize_policy'
		],
		query: [
			'query_access',
			'query_policy_classes',
			'query_assignments',
			'query_subgraph',
			'query_associations',
			'query_prohibitions',
			'query_process_prohibitions',
			'query_obligations',
			'query_resource_operations',
			'query_admin_operations',
			'query_admin_routines'
		]
	};

	// Flatten all admin rights for filtering
	const adminAccessRights = Object.values(adminAccessRightsSections).flat();

	// Fetch available resource operations and load existing association data
	useEffect(() => {
		if (opened) {
			loadData();
		}
	}, [opened, mode]);

	const loadData = async () => {
		setLoading(true);
		try {
			// Fetch available resource operations
			const resourceOpsResponse = await QueryService.getResourceOperations();
			console.log("resourceOpsResponse", resourceOpsResponse);
			const resourceOps = resourceOpsResponse.values || [];
			setAvailableResourceRights(resourceOps);

			// If viewing existing association, load its rights
			if (mode === 'view' && node.properties?.accessRights) {
				const existingRights = node.properties.accessRights.split(', ');
				
				// Separate resource and admin rights
				const resourceR = existingRights.filter(right => resourceOps.includes(right));
				const adminR = existingRights.filter(right => adminAccessRights.includes(right));
				
				setResourceRights(resourceR);
				setAdminRights(adminR);
			} else {
				// Reset for new association
				setResourceRights([]);
				setAdminRights([]);
			}
		} catch (error) {
			console.error('Failed to load resource operations:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleResourceRightToggle = (right: string) => {
		setResourceRights(prev => 
			prev.includes(right) 
				? prev.filter(r => r !== right)
				: [...prev, right]
		);
	};

	const handleAdminRightToggle = (right: string) => {
		setAdminRights(prev => 
			prev.includes(right) 
				? prev.filter(r => r !== right)
				: [...prev, right]
		);
	};

	const handleSave = async () => {
		try {
			const allRights = [...resourceRights, ...adminRights];
			
			// If custom submit callback is provided, use it instead of API calls
			if (onCustomSubmit) {
				onCustomSubmit(allRights);
				onClose();
				return;
			}
			
			if (mode === 'create' && selectedUserNode && selectedTargetNode) {
				// Create new association
				await AdjudicationService.associate(
					selectedUserNode.pmId,
					selectedTargetNode.pmId,
					allRights
				);
				notifications.show({
					title: 'Association Created',
					message: `Successfully created association between ${selectedUserNode.name} and ${selectedTargetNode.name}`,
					color: 'green',
				});
			} else if (mode === 'view' && selectedUserNode && selectedTargetNode) {
				// update association
				await AdjudicationService.associate(
					selectedUserNode.pmId,
					selectedTargetNode.pmId,
					allRights
				);
				notifications.show({
					title: 'Association Updated',
					message: `Successfully updated association between ${selectedUserNode.name} and ${selectedTargetNode.name}`,
					color: 'green',
				});
			}
			
			onClose();
		} catch (error) {
			console.error('Failed to save association:', error);
			notifications.show({
				title: 'Association Failed',
				message: `Failed to save association: ${error instanceof Error ? error.message : 'Unknown error'}`,
				color: 'red',
			});
		}
	};

	const getTitle = () => {
		if (mode === 'create') {
			const userNodeName = selectedUserNode?.name || 'Unknown User';
			const targetNodeName = selectedTargetNode?.name || node.name;
			return (
				<span>
					Associate{' '}
					<span style={{ color: 'var(--mantine-color-red-9)', fontWeight: 600 }}>{userNodeName}</span>
					{' '}and{' '}
					<span style={{ color: 'var(--mantine-color-blue-9)', fontWeight: 600 }}>{targetNodeName}</span>
				</span>
			);
		} else {
			// For view mode, show both node names from the association
			const uaName = node.properties?.uaNodeName || 'Unknown UA';
			const targetName = node.properties?.targetNodeName || 'Unknown Target';
			return (
				<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span>Association:</span>
					<span style={{ color: 'var(--mantine-color-red-9)', fontWeight: 600 }}>{uaName}</span>
					<IconArrowBigRightLines size={20} style={{ color: 'var(--mantine-color-green-9)' }} />
					<span style={{ color: 'var(--mantine-color-blue-9)', fontWeight: 600 }}>{targetName}</span>
				</span>
			);
		}
	};

	return (
		<Modal 
			opened={opened} 
			onClose={onClose} 
			title={getTitle()} 
			size="lg" 
			styles={{ body: { minHeight: '500px' } }}
		>
			<div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
			{loading ? (
				<Text>Loading...</Text>
			) : (
				<>
					<SimpleGrid cols={2} spacing="md">
						{/* Resource Access Rights */}
						<div>
							<Group justify="space-between" align="center" mb="sm">
								<Title order={5}>Resource Access Rights</Title>
								<Button 
									size="xs" 
									variant="subtle" 
									color="gray"
									onClick={() => setResourceRights([])}
									disabled={resourceRights.length === 0}
								>
									Clear
								</Button>
							</Group>
							<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
								{availableResourceRights.map(right => (
									<Checkbox
										key={right}
										label={right}
										checked={resourceRights.includes(right)}
										onChange={() => handleResourceRightToggle(right)}
										size="xs"
										mb={4}
										styles={{
											label: { fontSize: '12px' },
											body: { alignItems: 'flex-start' }
										}}
									/>
								))}
							</div>
						</div>

						{/* Admin Access Rights */}
						<div>
							<Group justify="space-between" align="center" mb="sm">
								<Title order={5}>Admin Access Rights</Title>
								<Button 
									size="xs" 
									variant="subtle" 
									color="gray"
									onClick={() => setAdminRights([])}
									disabled={adminRights.length === 0}
								>
									Clear
								</Button>
							</Group>
							<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
								{Object.entries(adminAccessRightsSections).map(([sectionName, rights]) => (
									<div key={sectionName} style={{ marginBottom: '12px' }}>
										<Text size="xs" fw={600} c="dimmed" mb={4} style={{ textTransform: 'capitalize' }}>
											{sectionName}
										</Text>
										{rights.map(right => (
											<Checkbox
												key={right}
												label={right}
												checked={adminRights.includes(right)}
												onChange={() => handleAdminRightToggle(right)}
												size="xs"
												mb={4}
												ml={8}
												styles={{
													label: { fontSize: '12px' },
													body: { alignItems: 'flex-start' }
												}}
											/>
										))}
									</div>
								))}
							</div>
						</div>
					</SimpleGrid>

					<Divider my="md" />
					<Stack>
						<div style={{ flex: 1, marginRight: '16px' }}>
							<Text size="sm" c="dimmed" mb={2}>
								Selected Access Rights:
							</Text>
							<Text size="xs" style={{ lineHeight: 1.4 }}>
								{[...resourceRights, ...adminRights].length > 0 
									? [...resourceRights, ...adminRights].join(', ')
									: 'None selected'
								}
							</Text>
						</div>
						<div>
							<Group justify="flex-end">
								<Button variant="outline" onClick={onClose}>
									Cancel
								</Button>
								<Button 
									onClick={handleSave}
									disabled={resourceRights.length + adminRights.length === 0}
									color={'var(--mantine-color-green-9)'}
								>
									{mode === 'create' ? 'Associate' : 'Update'}
								</Button>
							</Group>
						</div>
					</Stack>
				</>
			)}
			</div>
		</Modal>
	);
} 