import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {Box, Checkbox, Collapse, ScrollArea, Text, UnstyledButton, useMantineTheme} from "@mantine/core";
import { IconChevronRight, IconChevronDown } from "@tabler/icons-react";

class AccessRight {
	ar: string;
	children?: AccessRight[];

	constructor(ar: string, children?: AccessRight[]) {
		this.ar = ar;
		this.children = children;
	}
}

// Get all access right strings in the tree (including non-leaf nodes)
function getAllRights(node: AccessRight): string[] {
	const rights = [node.ar];
	if (node.children) {
		node.children.forEach(child => {
			rights.push(...getAllRights(child));
		});
	}
	return rights;
}

// Get all ARs that have children (for default expanded state)
function getAllExpandableRights(node: AccessRight): string[] {
	const result: string[] = [];
	if (node.children && node.children.length > 0) {
		result.push(node.ar);
		node.children.forEach(child => {
			result.push(...getAllExpandableRights(child));
		});
	}
	return result;
}

// Check if any ancestor of the target is selected
function isAncestorSelected(targetAr: string, node: AccessRight, selectedRights: string[]): boolean {
	if (!node.children) return false;

	for (const child of node.children) {
		if (child.ar === targetAr) {
			// Found the target, check if current node is selected
			return selectedRights.includes(node.ar);
		}
		// Check recursively in children
		const foundInChild = containsNode(targetAr, child);
		if (foundInChild) {
			// The target is under this child, check if current node or this child path has selected ancestor
			return selectedRights.includes(node.ar) || isAncestorSelected(targetAr, child, selectedRights);
		}
	}
	return false;
}

// Check if a node contains the target
function containsNode(targetAr: string, node: AccessRight): boolean {
	if (node.ar === targetAr) return true;
	if (!node.children) return false;
	return node.children.some(child => containsNode(targetAr, child));
}

// Find the selected ancestor of a node
function findSelectedAncestor(targetAr: string, node: AccessRight, selectedRights: string[], path: AccessRight[] = []): AccessRight | null {
	if (node.ar === targetAr) {
		// Found target, return the most recent selected ancestor in path
		for (let i = path.length - 1; i >= 0; i--) {
			if (selectedRights.includes(path[i].ar)) {
				return path[i];
			}
		}
		return null;
	}

	if (!node.children) return null;

	for (const child of node.children) {
		const result = findSelectedAncestor(targetAr, child, selectedRights, [...path, node]);
		if (result) return result;
	}
	return null;
}

// Consolidate selections: if all children of a parent are selected, replace with parent
// This works recursively from bottom up
function consolidateSelections(root: AccessRight, selectedRights: string[]): string[] {
	let result = [...selectedRights];

	function consolidateNode(node: AccessRight): boolean {
		if (!node.children || node.children.length === 0) {
			// Leaf node - just return if it's selected
			return result.includes(node.ar);
		}

		// First, recursively consolidate children
		const childrenEffectivelySelected = node.children.map(child => consolidateNode(child));

		// If all children are effectively selected, consolidate to this node
		if (childrenEffectivelySelected.every(selected => selected)) {
			// Remove all descendant ARs and add this node's AR
			const descendantArs = getAllRights(node).slice(1); // All except this node
			result = result.filter(ar => !descendantArs.includes(ar));
			if (!result.includes(node.ar)) {
				result.push(node.ar);
			}
			return true;
		}

		return result.includes(node.ar);
	}

	consolidateNode(root);
	return result;
}

export function buildAccessRightsTree(resourceAccessRights: string[]): AccessRight {
	return new AccessRight(
		"*",
		[
			new AccessRight("*r", resourceAccessRights.map(r => new AccessRight(r))),
			new AccessRight(
				"*a",
				[
					new AccessRight("*a:graph", [
						new AccessRight("create_policy_class"),
						new AccessRight("create_object"),
						new AccessRight("create_object_attribute"),
						new AccessRight("create_user_attribute"),
						new AccessRight("create_user"),
						new AccessRight("set_node_properties"),
						new AccessRight("delete_policy_class"),
						new AccessRight("delete_object"),
						new AccessRight("delete_object_attribute"),
						new AccessRight("delete_user_attribute"),
						new AccessRight("delete_user"),
						new AccessRight("delete_object_from"),
						new AccessRight("delete_object_attribute_from"),
						new AccessRight("delete_user_attribute_from"),
						new AccessRight("delete_user_from"),
						new AccessRight("assign"),
						new AccessRight("assign_to"),
						new AccessRight("deassign"),
						new AccessRight("deassign_from"),
						new AccessRight("associate"),
						new AccessRight("associate_to"),
						new AccessRight("dissociate"),
						new AccessRight("dissociate_from"),
					]),
					new AccessRight("*a:prohibition", [
						new AccessRight("create_prohibition"),
						new AccessRight("create_process_prohibition"),
						new AccessRight("create_prohibition_with_complement_container"),
						new AccessRight("delete_process_prohibition"),
						new AccessRight("delete_prohibition"),
						new AccessRight("delete_prohibition_with_complement_container"),
					]),
					new AccessRight("*a:obligation", [
						new AccessRight("create_obligation"),
						new AccessRight("delete_obligation"),
					]),
					new AccessRight("*a:operation", [
						new AccessRight("set_resource_access_rights"),
						new AccessRight("create_operation"),
						new AccessRight("delete_operation"),
					]),
					new AccessRight("reset"),
					new AccessRight("serialize"),
					new AccessRight("deserialize"),
					new AccessRight("*q", [
						new AccessRight("*q:graph", [
							new AccessRight("query_policy_classes"),
							new AccessRight("query_assignments"),
							new AccessRight("query_subgraph"),
							new AccessRight("query_associations"),
						]),
						new AccessRight("*q:prohibition", [
							new AccessRight("query_prohibitions"),
							new AccessRight("query_process_prohibitions"),
						]),
						new AccessRight("*q:obligation", [
							new AccessRight("query_obligations"),
						]),
						new AccessRight("*q:operation", [
							new AccessRight("query_resource_access_rights"),
							new AccessRight("query_operations"),
						]),
						new AccessRight("query_access"),
					]),
				]
			)
		]
	)
}

interface AccessRightsSelectionProps {
	selectedRights: string[];
	onRightsChange: (rights: string[]) => void;
	resourceAccessRights: string[];
	readOnly?: boolean;
}

export function AccessRightsSelection({ selectedRights, onRightsChange, resourceAccessRights, readOnly = false }: AccessRightsSelectionProps) {
	const theme = useMantineTheme();

	const accessRightTree = useMemo(
		() => buildAccessRightsTree(resourceAccessRights),
		[resourceAccessRights]
	);

	// Extract admin and resource subtrees
	const adminTree = useMemo(() => {
		return accessRightTree.children?.find(c => c.ar === '*a') || null;
	}, [accessRightTree]);

	const resourceTree = useMemo(() => {
		return accessRightTree.children?.find(c => c.ar === '*r') || null;
	}, [accessRightTree]);

	// Default expand all nodes
	const [expanded, setExpanded] = useState<Set<string>>(() => {
		return new Set(getAllExpandableRights(accessRightTree));
	});

	// Track the last consolidated value to avoid infinite loops
	const lastConsolidatedRef = useRef<string | null>(null);

	// Consolidate selections when they're passed in from outside
	useEffect(() => {
		const consolidated = consolidateSelections(accessRightTree, selectedRights);
		const consolidatedKey = [...consolidated].sort().join(',');
		const currentKey = [...selectedRights].sort().join(',');

		// Only call onRightsChange if consolidation actually changed something
		// and we haven't just processed this exact set
		if (consolidatedKey !== currentKey && consolidatedKey !== lastConsolidatedRef.current) {
			lastConsolidatedRef.current = consolidatedKey;
			onRightsChange(consolidated);
		}
	}, [selectedRights, accessRightTree, onRightsChange]);

	const toggleExpanded = useCallback((ar: string) => {
		setExpanded(prev => {
			const next = new Set(prev);
			if (next.has(ar)) {
				next.delete(ar);
			} else {
				next.add(ar);
			}
			return next;
		});
	}, []);

	const handleToggle = useCallback((node: AccessRight) => {
		if (readOnly) return;

		const isDirectlySelected = selectedRights.includes(node.ar);
		const hasSelectedAncestor = isAncestorSelected(node.ar, accessRightTree, selectedRights);
		const isCurrentlySelected = isDirectlySelected || hasSelectedAncestor;

		let newRights: string[];

		if (isCurrentlySelected) {
			// Deselecting
			if (isDirectlySelected) {
				// Simply remove this node
				newRights = selectedRights.filter(r => r !== node.ar);
			} else if (hasSelectedAncestor) {
				// Need to remove the ancestor and add siblings
				const ancestor = findSelectedAncestor(node.ar, accessRightTree, selectedRights);
				if (ancestor) {
					// Remove the ancestor, add all its children except the path to this node
					const filteredRights = selectedRights.filter(r => r !== ancestor.ar);
					// Find siblings at each level from ancestor to the target node
					const siblingsToAdd = findDirectSiblingsToAdd(node.ar, ancestor);
					newRights = [...filteredRights, ...siblingsToAdd];
				} else {
					newRights = selectedRights;
				}
			} else {
				newRights = selectedRights;
			}
		} else {
			// Selecting - just add this node's ar
			// First, remove any children that might be explicitly selected (cleanup)
			const childRights = node.children ? getAllRights(node).slice(1) : [];
			const cleanedRights = selectedRights.filter(r => !childRights.includes(r));
			newRights = [...cleanedRights, node.ar];
		}

		// Consolidate: if all children of any parent are now selected, replace with parent
		const consolidated = consolidateSelections(accessRightTree, newRights);
		onRightsChange(consolidated);
	}, [readOnly, selectedRights, accessRightTree, onRightsChange]);

	// Calculate the checkbox state for a node
	const getCheckboxState = useCallback((node: AccessRight): { checked: boolean; indeterminate: boolean } => {
		const isDirectlySelected = selectedRights.includes(node.ar);
		const hasSelectedAncestor = isAncestorSelected(node.ar, accessRightTree, selectedRights);

		if (isDirectlySelected || hasSelectedAncestor) {
			return { checked: true, indeterminate: false };
		}

		// Check if any descendants are selected
		if (node.children) {
			const allDescendants = getAllRights(node).slice(1);
			const hasSelectedDescendant = allDescendants.some(ar => selectedRights.includes(ar));
			if (hasSelectedDescendant) {
				return { checked: false, indeterminate: true };
			}
		}

		return { checked: false, indeterminate: false };
	}, [selectedRights, accessRightTree]);

	const renderNode = (node: AccessRight, depth: number = 0): React.ReactNode => {
		const hasChildren = node.children && node.children.length > 0;
		const isExpanded = expanded.has(node.ar);
		const { checked, indeterminate } = getCheckboxState(node);

		return (
			<Box key={node.ar}>
				<Box
					style={{
						display: 'flex',
						alignItems: 'center',
						paddingLeft: depth * 16,
						paddingTop: 2,
						paddingBottom: 2,
						borderRadius: 2,
						'&:hover': {
							backgroundColor: theme.other.intellijHoverBg,
						}
					}}
				>
					{hasChildren ? (
						<UnstyledButton
							onClick={() => toggleExpanded(node.ar)}
							style={{
								width: 16,
								height: 16,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								marginRight: 4,
							}}
						>
							{isExpanded ? (
								<IconChevronDown size={14} stroke={1.5} />
							) : (
								<IconChevronRight size={14} stroke={1.5} />
							)}
						</UnstyledButton>
					) : (
						<Box style={{ width: 20 }} />
					)}
					<Checkbox
						label={node.ar}
						size="xs"
						checked={checked}
						indeterminate={indeterminate}
						onChange={() => handleToggle(node)}
						disabled={readOnly}
						styles={{
							label: { fontSize: '14px', cursor: readOnly ? 'default' : 'pointer' },
							input: { cursor: readOnly ? 'default' : 'pointer' },
						}}
					/>
				</Box>
				{hasChildren && (
					<Collapse in={isExpanded}>
						{node.children!.map(child => renderNode(child, depth + 1))}
					</Collapse>
				)}
			</Box>
		);
	};

	return (
		<Box
			style={{
				height: '100%',
				display: 'flex',
				backgroundColor: theme.other.intellijContentBg,
				borderRadius: 4,
				overflow: 'hidden',
			}}
		>
			{/* Admin Access Rights - Left Pane */}
			<Box
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					minWidth: 0,
					height: '100%',
					overflow: 'hidden',
				}}
			>
				<Text size="xs" fw={600} p={8} pb={4} style={{ flexShrink: 0, borderBottom: `1px solid ${theme.colors.gray[3]}` }}>
					Admin Access Rights
				</Text>
				<ScrollArea style={{ flex: 1 }} type="auto">
					<Box p={8}>
						{adminTree && renderNode(adminTree)}
					</Box>
				</ScrollArea>
			</Box>

			{/* Divider */}
			<Box style={{ width: 1, flexShrink: 0, backgroundColor: theme.colors.gray[4] }} />

			{/* Resource Access Rights - Right Pane */}
			<Box
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					minWidth: 0,
					height: '100%',
					overflow: 'hidden',
				}}
			>
				<Text size="xs" fw={600} p={8} pb={4} style={{ flexShrink: 0, borderBottom: `1px solid ${theme.colors.gray[3]}` }}>
					Resource Access Rights
				</Text>
				<ScrollArea style={{ flex: 1 }} type="auto">
					<Box p={8}>
						{resourceTree && renderNode(resourceTree)}
					</Box>
				</ScrollArea>
			</Box>
		</Box>
	);
}

// Helper to find which siblings to add when deselecting a node that was selected via ancestor
function findDirectSiblingsToAdd(targetAr: string, ancestor: AccessRight): string[] {
	// Find the path from ancestor to target
	const path = findPathToNode(targetAr, ancestor);
	if (!path || path.length === 0) return [];

	// For each level in the path, we need to add the siblings
	const result: string[] = [];

	function collectSiblings(currentNode: AccessRight, pathIndex: number): void {
		if (!currentNode.children || !path) return;

		const nextInPath = path[pathIndex];

		for (const child of currentNode.children) {
			if (child.ar === nextInPath) {
				// This is on the path, continue deeper if not the target
				if (child.ar !== targetAr && pathIndex < path.length - 1) {
					collectSiblings(child, pathIndex + 1);
				}
			} else {
				// This is a sibling, add it
				result.push(child.ar);
			}
		}
	}

	collectSiblings(ancestor, 0);
	return result;
}

// Find the path from a node to a target (returns array of ar strings)
function findPathToNode(targetAr: string, node: AccessRight): string[] | null {
	if (node.ar === targetAr) {
		return [targetAr];
	}

	if (!node.children) return null;

	for (const child of node.children) {
		const childPath = findPathToNode(targetAr, child);
		if (childPath) {
			return [child.ar, ...childPath.slice(1)];
		}
	}

	return null;
}