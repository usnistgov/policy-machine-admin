import React from "react";
import { Box, Checkbox, Stack, Text } from "@mantine/core";

// Admin access rights categorization
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

interface AccessRightsSelectionProps {
	selectedRights: string[];
	onRightsChange: (rights: string[]) => void;
	resourceOperations: string[];
	readOnly?: boolean;
}

export function AccessRightsSelection({ selectedRights, onRightsChange, resourceOperations, readOnly = false }: AccessRightsSelectionProps) {
	const handleRightToggle = (right: string) => {
		if (readOnly) return;
		
		if (selectedRights.includes(right)) {
			onRightsChange(selectedRights.filter(r => r !== right));
		} else {
			onRightsChange([...selectedRights, right]);
		}
	};

	const renderSection = (sectionName: string, rights: string[]) => {
		return (
			<Box key={sectionName}>
				<Text size="xs" fw={600} >
					{sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}
				</Text>
				<Stack gap="2px" ml="sm">
					{rights.map(right => (
						<Checkbox
							key={right}
							label={right}
							size="xs"
							checked={selectedRights.includes(right)}
							styles={{
								label: { fontSize: '12px' }
							}}
							onChange={() => handleRightToggle(right)}
							disabled={readOnly}
						/>
					))}
				</Stack>
			</Box>
		);
	};

	// Combine resource operations and admin sections - resource operations first
	const allSections = [
		...(resourceOperations.length > 0 ? [{ name: 'resource', rights: resourceOperations }] : []),
		...Object.entries(adminAccessRightsSections).map(([name, rights]) => ({ name, rights }))
	];

	return (
		<div style={{ height: '100%', padding: '8px', overflowY: 'auto' }}>
			<Stack gap="0">
				{allSections.map(({ name, rights }) =>
					renderSection(name, rights)
				)}
			</Stack>
		</div>
	);
}