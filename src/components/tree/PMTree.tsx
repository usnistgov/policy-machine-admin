import React, {useEffect, useRef, useState} from "react";
import {Tree, TreeApi} from "react-arborist";
import {useElementSize, useMergedRef} from "@mantine/hooks";
import {ActionIcon, Group, Text, Box, Menu, Checkbox} from "@mantine/core";
import classes from "@/components/tree/pmtree.module.css";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {OpenMap} from "react-arborist/dist/main/state/open-slice";
import {INDENT_NUM, NodeIcon} from "@/components/tree/util";
import {QueryService, NodeType} from "@/api/pdp.api";
import {transformNodesToTreeNodes, TreeNode} from "@/utils/tree.utils";
import {PrimitiveAtom} from "jotai/index";
import {IconRefresh, IconSettings, IconFilter} from "@tabler/icons-react";
import { selectedUserNodeAtom, selectedTargetNodeAtom, onOpenDescendantsAtom, onOpenAssociationAtom, treeDirectionAtom, onLeftClickAtom, onRightClickAtom, visibleNodeTypesAtom } from "./tree-atoms";

export const TARGET_ALLOWED_TYPES: NodeType[] = [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O];
export const USER_ALLOWED_TYPES: NodeType[] = [NodeType.PC, NodeType.UA, NodeType.U];

// Component to display the currently selected node
function SelectedNodeIndicator({ selectedNode }: { selectedNode: TreeNode | null }) {
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
	nodeFunc: any;
	allowedTypes: NodeType[];
	borderColor: string;
	hook: any;
	treeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null>;
	treeDataAtom: PrimitiveAtom<TreeNode[]>;
	openTreeNodesAtom?: PrimitiveAtom<OpenMap>;
	hideToolbar?: boolean;
	rootNode?: TreeNode;
	direction?: 'ascendant' | 'descendant';
	onLeftClick?: (node: TreeNode) => void;
	onRightClick?: (node: TreeNode) => void;
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
	const setOnOpenDescendants = useSetAtom(onOpenDescendantsAtom);
	const setOnOpenAssociation = useSetAtom(onOpenAssociationAtom);
	const setOnLeftClick = useSetAtom(onLeftClickAtom);
	const setOnRightClick = useSetAtom(onRightClickAtom);
	const [treeDirection, setTreeDirection] = useAtom(treeDirectionAtom);
	const [visibleNodeTypes, setVisibleNodeTypes] = useAtom(visibleNodeTypesAtom);

	// Get selected node from atoms based on tree type
	const selectedNode = useAtomValue(selectedTargetNodeAtom);

	// Set callback atoms when props change
	useEffect(() => {
		setOnOpenDescendants(() => props.onOpenDescendants || null);
		setOnOpenAssociation(() => props.onOpenAssociation || null);
		setOnLeftClick(() => props.onLeftClick || null);
		setOnRightClick(() => props.onRightClick || null);
	}, [props.onOpenDescendants, props.onOpenAssociation, props.onLeftClick, props.onRightClick, setOnOpenDescendants, setOnOpenAssociation, setOnLeftClick, setOnRightClick]);

	// Set direction from props
	useEffect(() => {
		if (props.direction) {
			setTreeDirection(props.direction);
		}
	}, [props.direction, setTreeDirection]);

	// Function to recursively filter tree nodes based on visible node types
	const filterTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
		return nodes.map(node => ({
			...node,
			children: node.children ? filterTreeNodes(node.children.filter(child => {
				// Always show associations regardless of type visibility
				const isAssociation = child.properties?.isAssociation === 'true';
				if (isAssociation) return true;
				
				// For USER TREE ONLY: Show O/OA nodes that are children of associations even if type is hidden
				const isObjectNode = child.type === 'O' || child.type === 'OA';
				const parentIsAssociation = node.properties?.isAssociation === 'true';
				const shouldShowObjectInUserTree = isUserTree && isObjectNode && parentIsAssociation;
				if (shouldShowObjectInUserTree) return true;

				// Check if the node type is visible
				return visibleNodeTypes.has(child.type);
			})) : undefined
		})).filter(node => {
			// Apply same filter to root level nodes
			const isAssociation = node.properties?.isAssociation === 'true';
			if (isAssociation) return true;
			
			// Check if the node type is visible
			return visibleNodeTypes.has(node.type);
		});
	};

	// Apply filtering when visibleNodeTypes changes
	useEffect(() => {
		if (data.length > 0) {
			// Always filter based on visible node types
			const filteredData = filterTreeNodes(data);
			setData(filteredData);
		}
	}, [visibleNodeTypes]);


	// initial data is POS for user or rootNode if provided
	const [posNodes, setPOSNodes] = useState<TreeNode[]>([]);
	useEffect(() => {
		async function initNodes() {
			try {
				if (props.rootNode) {
					// Use provided root node
					setPOSNodes([props.rootNode]);
				} else {
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
				}
			} catch (error) {
				console.error('Failed to fetch initial tree data:', error);
				// Fallback to empty array
				setPOSNodes([]);
			}
		}

		initNodes();
	}, [props.allowedTypes, props.rootNode]);

	useEffect(() => {
		if (data.length === 0) {
			console.log("setting data")
			const initialData = filterTreeNodes(posNodes);
			setData(initialData);
		}
	}, [posNodes, data.length, setData, visibleNodeTypes]);

	useEffect(() => {
		if (treeApiRef.current) {
			setTreeApi(treeApiRef.current);
		}
	}, [treeApiRef.current, setTreeApi]);



	return (
		<div style={{height: "100%", display: 'flex', flexDirection: 'column'}}>
			{!props.hideToolbar && (
				<>
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
						{/* Node type filter dropdown for target tree */}
						{!isUserTree && (
							<Menu shadow="md" width={200}>
								<Menu.Target>
									<ActionIcon
										variant="subtle"
										size="md"
										color={props.borderColor}
										title="Filter node types"
										className={classes.toolbarIcon}
									>
										<IconFilter size={18} />
									</ActionIcon>
								</Menu.Target>
								<Menu.Dropdown>
									<Menu.Label>Show Node Types</Menu.Label>
									{props.allowedTypes.map((nodeType) => (
										<Menu.Item key={nodeType}>
											<Checkbox
												label={
													<Group gap={6} align="center">
														<NodeIcon type={nodeType} size="16px" fontSize="12px" />
														<Text size="sm">{nodeType}</Text>
													</Group>
												}
												checked={visibleNodeTypes.has(nodeType)}
												onChange={(event) => {
													const newVisibleTypes = new Set(visibleNodeTypes);
													if (event.currentTarget.checked) {
														newVisibleTypes.add(nodeType);
													} else {
														newVisibleTypes.delete(nodeType);
													}
													setVisibleNodeTypes(newVisibleTypes);
												}}
											/>
										</Menu.Item>
									))}
								</Menu.Dropdown>
							</Menu>
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
				</>
			)}

			<div ref={mergedRef} className={classes.treeContainer} style={{ flex: 1, overflow: 'hidden', minHeight: props.hideToolbar ? '100vh' : 'calc(100vh - 60px - 50px)', padding: '5px' }}>
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