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
function getAllAccessRights(node: AccessRight): string[] {
	const rights = [node.ar];
	if (node.children) {
		node.children.forEach(child => {
			rights.push(...getAllAccessRights(child));
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
	if (!node.children) {return false;}

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
	if (node.ar === targetAr) {return true;}
	if (!node.children) {return false;}
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

	if (!node.children) {return null;}

	for (const child of node.children) {
		const result = findSelectedAncestor(targetAr, child, selectedRights, [...path, node]);
		if (result) {return result;}
	}
	return null;
}

// Consolidate selections: if all children of a parent are selected, replace with parent
// This works recursively from bottom up
function consolidateSelections(root: AccessRight, selectedRights: string[]): string[] {
	let result = [...selectedRights];

	function consolidateNode(node: AccessRight): boolean {
		if (!node.children || node.children.length === 0) {
			return result.includes(node.ar);
		}

		const childrenEffectivelySelected = node.children.map(child => consolidateNode(child));

		if (childrenEffectivelySelected.every(selected => selected)) {
			const descendantArs = getAllAccessRights(node).slice(1);
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
			new AccessRight("resource:*", resourceAccessRights.map(r => new AccessRight(r))),
			new AccessRight(
				"admin:*",
				[
					new AccessRight("admin:graph:*", [
						new AccessRight("admin:graph:node:*", [
							new AccessRight("admin:graph:node:create"),
							new AccessRight("admin:graph:node:delete"),
							new AccessRight("admin:graph:node:update"),
							new AccessRight("admin:graph:node:pc:list"),
						]),
						new AccessRight("admin:graph:assignment:*", [
							new AccessRight("admin:graph:assignment:ascendant:create"),
							new AccessRight("admin:graph:assignment:ascendant:delete"),
							new AccessRight("admin:graph:assignment:descendant:create"),
							new AccessRight("admin:graph:assignment:descendant:delete"),
							new AccessRight("admin:graph:assignment:list"),
						]),
						new AccessRight("admin:graph:association:*", [
							new AccessRight("admin:graph:association:ua:create"),
							new AccessRight("admin:graph:association:target:create"),
							new AccessRight("admin:graph:association:ua:delete"),
							new AccessRight("admin:graph:association:target:delete"),
							new AccessRight("admin:graph:association:list"),
						]),
						new AccessRight("admin:graph:subgraph:list"),
					]),
					new AccessRight("admin:prohibition:*", [
						new AccessRight("admin:prohibition:subject:create"),
						new AccessRight("admin:prohibition:inclusion:create"),
						new AccessRight("admin:prohibition:exclusion:create"),
						new AccessRight("admin:prohibition:subject:delete"),
						new AccessRight("admin:prohibition:inclusion:delete"),
						new AccessRight("admin:prohibition:exclusion:delete"),
						new AccessRight("admin:prohibition:list"),
					]),
					new AccessRight("admin:obligation:*", [
						new AccessRight("admin:obligation:create"),
						new AccessRight("admin:obligation:delete"),
						new AccessRight("admin:obligation:list"),
					]),
					new AccessRight("admin:operation:*", [
						new AccessRight("admin:operation:create"),
						new AccessRight("admin:operation:delete"),
						new AccessRight("admin:operation:list"),
					]),
					new AccessRight("admin:policy:*", [
						new AccessRight("admin:policy:reset"),
						new AccessRight("admin:policy:serialize"),
						new AccessRight("admin:policy:deserialize"),
					]),
					new AccessRight("admin:policy:resource_access_rights:update"),
					new AccessRight("admin:access:query"),
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
		return accessRightTree.children?.find(c => c.ar === 'admin:*') || null;
	}, [accessRightTree]);

	const resourceTree = useMemo(() => {
		return accessRightTree.children?.find(c => c.ar === 'resource:*') || null;
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
		if (readOnly) {return;}

		const isDirectlySelected = selectedRights.includes(node.ar);
		const hasSelectedAncestor = isAncestorSelected(node.ar, accessRightTree, selectedRights);
		const isCurrentlySelected = isDirectlySelected || hasSelectedAncestor;

		let newRights: string[];

		if (isCurrentlySelected) {
			if (isDirectlySelected) {
				newRights = selectedRights.filter(r => r !== node.ar);
			} else if (hasSelectedAncestor) {
				const ancestor = findSelectedAncestor(node.ar, accessRightTree, selectedRights);
				if (ancestor) {
					const filteredRights = selectedRights.filter(r => r !== ancestor.ar);
					const siblingsToAdd = findDirectSiblingsToAdd(node.ar, ancestor);
					newRights = [...filteredRights, ...siblingsToAdd];
				} else {
					newRights = selectedRights;
				}
			} else {
				newRights = selectedRights;
			}
		} else {
			const childRights = node.children ? getAllAccessRights(node).slice(1) : [];
			const cleanedRights = selectedRights.filter(r => !childRights.includes(r));
			newRights = [...cleanedRights, node.ar];
		}

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
			const allDescendants = getAllAccessRights(node).slice(1);
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
							label: { fontSize: '14px', fontWeight: hasChildren ? 600 : 400, cursor: readOnly ? 'default' : 'pointer' },
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
	const path = findPathToNode(targetAr, ancestor);
	if (!path || path.length === 0) {return [];}

	const result: string[] = [];

	function collectSiblings(currentNode: AccessRight, pathIndex: number): void {
		if (!currentNode.children || !path) {return;}

		const nextInPath = path[pathIndex];

		for (const child of currentNode.children) {
			if (child.ar === nextInPath) {
				if (child.ar !== targetAr && pathIndex < path.length - 1) {
					collectSiblings(child, pathIndex + 1);
				}
			} else {
				result.push(child.ar);
			}
		}
	}

	collectSiblings(ancestor, 0);
	return result;
}

// Find the path from a node to a target (returns array of ar strings representing the route down)
function findPathToNode(targetAr: string, node: AccessRight): string[] | null {
	if (node.ar === targetAr) {
		return []; // Found target, return empty (we'll build path on the way back up)
	}

	if (!node.children) {return null;}

	for (const child of node.children) {
		const childPath = findPathToNode(targetAr, child);
		if (childPath !== null) {
			return [child.ar, ...childPath];
		}
	}

	return null;
}