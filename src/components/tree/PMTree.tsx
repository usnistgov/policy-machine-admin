import React, {useEffect, useRef, useState} from "react";
import {Tree, TreeApi} from "react-arborist";
import {useElementSize, useMergedRef} from "@mantine/hooks";
import {ActionIcon, Stack, Switch, Title, Group, Text, Box} from "@mantine/core";
import classes from "@/components/tree/pmtree.module.css";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {OpenMap} from "react-arborist/dist/main/state/open-slice";
import {useTargetDynamicTree} from "@/hooks/dynamic-tree";
import {TreeNode} from "@/utils/tree.utils";
import {INDENT_NUM, NodeIcon} from "@/components/tree/util";
import {QueryService, NodeType} from "@/api/pdp.api";
import {transformNodesToTreeNodes} from "@/utils/tree.utils";
import {PrimitiveAtom} from "jotai/index";
import {IconEye, IconFlipVertical, IconRefresh, IconSettings, IconUser, IconUserSquare} from "@tabler/icons-react";
import { hideUserNodesAtom, selectedUserNodeAtom, selectedTargetNodeAtom, onOpenDescendantsAtom, onOpenAssociationAtom } from "./tree-atoms";

export const TARGET_ALLOWED_TYPES: NodeType[] = [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O];
export const USER_ALLOWED_TYPES: NodeType[] = [NodeType.PC, NodeType.UA, NodeType.U];

// Component to display the currently selected node
function SelectedNodeIndicator({ selectedNode, isUserTree }: { selectedNode: TreeNode | null; isUserTree: boolean }) {
	if (!selectedNode) {
		return (
			<Box style={{ 
				padding: '6px 8px', 
				height: '32px',
				display: 'flex',
				alignItems: 'center'
			}}>
				<Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
					No selection
				</Text>
			</Box>
		);
	}

	return (
		<Box style={{ 
			padding: '6px 8px', 
			height: '32px',
			display: 'flex',
			alignItems: 'center'
		}}>
			<Group gap={4} align="center" style={{ width: '100%' }}>
				<NodeIcon 
					type={selectedNode.type} 
					size="24px"
					fontSize="16px"
				/>
				<Text size="s" fw={500} truncate style={{ flex: 1, fontSize: '16px' }}>
					{selectedNode.name}
				</Text>
			</Group>
		</Box>
	);
}

export interface PMTreeProps {
	title: string;
	nodeFunc: any;
	allowedTypes: NodeType[];
	borderColor: string;
	hook: any;
	treeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null>;
	treeDataAtom: PrimitiveAtom<TreeNode[]>;
	openTreeNodesAtom: PrimitiveAtom<OpenMap>;
	onOpenDescendants?: (node: TreeNode, isUserTree: boolean) => void;
	onOpenAssociation?: (node: TreeNode, selectedUserNode: TreeNode | null, selectedTargetNode: TreeNode | null, isUserTree: boolean) => void;
}

export function PMTree(props: PMTreeProps) {
	const { data, setData, controllers } = props.hook();
	const [treeApi, setTreeApi] = useAtom(props.treeApiAtom);
	const treeApiRef = useRef<TreeApi<TreeNode>>();
	const rootElement = useRef<HTMLDivElement>();
	const { ref: sizeRef, width, height } = useElementSize();
	const mergedRef = useMergedRef(rootElement, sizeRef);
	const [openTreeNodes, setOpenTreeNodes] = useAtom<OpenMap>(props.openTreeNodesAtom);
	const [hideUserNodes, setHideUserNodes] = useAtom(hideUserNodesAtom);
	const [originalTreeData, setOriginalTreeData] = useState<TreeNode[]>([]);
	const setOnOpenDescendants = useSetAtom(onOpenDescendantsAtom);
	const setOnOpenAssociation = useSetAtom(onOpenAssociationAtom);

	// Determine if this is a user tree based on the title
	const isUserTree = props.title === "User";
	
	// Get selected node from atoms based on tree type
	const selectedUserNode = useAtomValue(selectedUserNodeAtom);
	const selectedTargetNode = useAtomValue(selectedTargetNodeAtom);
	const selectedNode = isUserTree ? selectedUserNode : selectedTargetNode;
	
	// Set callback atoms when props change
	useEffect(() => {
		setOnOpenDescendants(() => props.onOpenDescendants || null);
		setOnOpenAssociation(() => props.onOpenAssociation || null);
	}, [props.onOpenDescendants, props.onOpenAssociation, setOnOpenDescendants, setOnOpenAssociation]);

	// Function to recursively filter tree nodes (remove UA/U except associations)
	const filterTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
		return nodes.map(node => ({
			...node,
			children: node.children ? filterTreeNodes(node.children.filter(child => {
				// Keep the node if:
				// 1. It's not a UA or U node, OR
				// 2. It's an association (has isAssociation property), OR
				// 3. For USER TREE ONLY: It's an O or OA node that's a child of an association
				const isUserNode = child.type === 'UA' || child.type === 'U';
				const isAssociation = child.properties?.isAssociation === 'true';
				const isObjectNode = child.type === 'O' || child.type === 'OA';
				const parentIsAssociation = node.properties?.isAssociation === 'true';
				const shouldShowObjectInUserTree = isUserTree && isObjectNode && parentIsAssociation;

				return !isUserNode || isAssociation || shouldShowObjectInUserTree;
			})) : undefined
		})).filter(node => {
			// Apply same filter to root level nodes
			const isUserNode = node.type === 'UA' || node.type === 'U';
			const isAssociation = node.properties?.isAssociation === 'true';
			const isObjectNode = node.type === 'O' || node.type === 'OA';
			// Root level O/OA nodes are not shown in user tree (only children of associations)

			return !isUserNode || isAssociation;
		});
	};

	// Apply filtering when hideUserNodes changes
	useEffect(() => {
		if (data.length > 0 && !isUserTree) {
			if (hideUserNodes) {
				// Store original data before filtering
				setOriginalTreeData([...data]);
				// Apply filter
				const filteredData = filterTreeNodes(data);
				setData(filteredData);
			} else {
				// Restore original data if we have it
				if (originalTreeData.length > 0) {
					setData([...originalTreeData]);
				}
			}
		}
	}, [hideUserNodes, isUserTree]);

	// Clear original data when data changes from external sources
	useEffect(() => {
		if (!hideUserNodes) {
			setOriginalTreeData([]);
		}
	}, [data.length, hideUserNodes]);

	// initial data is POS for user
	const [posNodes, setPOSNodes] = useState<TreeNode[]>([]);
	useEffect(() => {
		async function initPOSNodes() {
			try {
				// Get Personal Object System for the current user
				const response = await QueryService.selfComputePersonalObjectSystem();
				
				// Extract nodes from the response and transform to TreeNode
				const nodes = response
					.map(nodePriv => nodePriv.node)
					.filter((node): node is NonNullable<typeof node> => node !== undefined);
				const filteredNodes = nodes.filter(node => 
					props.allowedTypes.includes(node.type)
				);

				const treeNodes = transformNodesToTreeNodes(filteredNodes);
				setPOSNodes(treeNodes);
			} catch (error) {
				console.error('Failed to fetch Personal Object System:', error);
				// Fallback to empty array
				setPOSNodes([]);
			}
		}

		initPOSNodes();
	}, [props.allowedTypes]);

	useEffect(() => {
		if (data.length === 0) {
			console.log("setting data")
			const initialData = hideUserNodes && !isUserTree ? filterTreeNodes(posNodes) : posNodes;
			setData(initialData);
		}
	}, [posNodes, data.length, setData, hideUserNodes, isUserTree]);

	useEffect(() => {
		if (treeApiRef.current) {
			setTreeApi(treeApiRef.current);
		}
	}, [treeApiRef.current, setTreeApi]);



	return (
		<div style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
			<div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '16px', paddingRight: '16px', flexShrink: 0 }} className={classes.toolbar}>
				{/* Left side - Action buttons */}
				<Group gap={6} align="center">
				<ActionIcon
					variant="subtle"
					size="md"
					color={props.borderColor}
					onClick={() => {
						// Create a new Policy Class at root level
						treeApiRef.current?.create({ 
							type: 'PC' as any
						});

						// Focus the input field after creation
						setTimeout(() => {
							const inputElement = document.querySelector('input[type="text"][value=""]') as HTMLInputElement;
							if (inputElement) {
								inputElement.focus();
								inputElement.select();
							}
						}, 300);
					}}
					title="Create Policy Class"
					className={classes.toolbarIcon}
				>
					<NodeIcon type="PC" size="16px" fontSize="14px" />
				</ActionIcon>
				<ActionIcon
					variant="subtle"
					size="md"
					color={props.borderColor}
					onClick={() => {
							// Refresh the tree data
							async function refreshData() {
								try {
									const response = await QueryService.selfComputePersonalObjectSystem();
									const nodes = response
										.map(nodePriv => nodePriv.node)
										.filter((node): node is NonNullable<typeof node> => node !== undefined);
									const filteredNodes = nodes.filter(node => 
										props.allowedTypes.includes(node.type)
									);
									const treeNodes = transformNodesToTreeNodes(filteredNodes);
									setPOSNodes(treeNodes);
									setData(treeNodes);
								} catch (error) {
									console.error('Failed to refresh tree data:', error);
								}
							}
							refreshData();
					}}
					title="Refresh tree"
					className={classes.toolbarIcon}
				>
					<IconRefresh size={18} />
				</ActionIcon>
				<ActionIcon
					variant="subtle"
					size="md"
					color={props.borderColor}
					onClick={() => {
						console.log('Tree settings clicked');
					}}
					title="Tree settings"
					className={classes.toolbarIcon}
				>
					<IconSettings size={18} />
				</ActionIcon>
				{/* Only show hide user nodes button for target tree */}
				{!isUserTree && (
					<ActionIcon
						variant={!hideUserNodes ? "filled" : "subtle"}
						size="md"
						color={props.borderColor}
						onClick={() => setHideUserNodes(!hideUserNodes)}
						title={hideUserNodes ? "Show user nodes (UA, U)" : "Hide user nodes (UA, U) except associations"}
						className={classes.toolbarIcon}
					>
						<IconUserSquare size={18} />
					</ActionIcon>
				)}
				</Group>
				
				{/* Center - Selected Node Indicator */}
				<div style={{ 
					position: 'absolute', 
					left: '50%', 
					transform: 'translateX(-50%)', 
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center'
				}}>
					<SelectedNodeIndicator selectedNode={selectedNode} isUserTree={isUserTree} />
				</div>
				
				{/* Right side - Future content or empty space */}
				<div style={{ flex: 1 }} />
			</div>
			
			<div style={{borderBottom: `2px solid ${props.borderColor}`, marginTop: '0px', flexShrink: 0}}/>

			<div ref={mergedRef} className={classes.treeContainer} style={{ flex: 1, overflow: 'hidden', minHeight: 'calc(100vh - 60px - 50px)', padding: '5px' }}>
				<Tree
					data={data}
					{...controllers}
					disableDrag
					disableDrop
					disableEdit
					openByDefault={false}
					width={width}
					height={height}
					indent={INDENT_NUM}
					ref={treeApiRef}
					className={classes.tree}
					rowHeight={28}
					disableMultiSelection={true}
					disableSelection={true}
					overscanCount={20}
					onToggle={() => {
						if (treeApiRef.current) {
							setOpenTreeNodes(treeApiRef.current.openState);
						}
					}}
					initialOpenState={openTreeNodes}
				>
					{props.nodeFunc}
				</Tree>
			</div>

		</div>
	);
}