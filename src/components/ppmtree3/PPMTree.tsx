import React, { useEffect, useRef, useState } from "react";
import { Tree, TreeApi } from "react-arborist";
import { useElementSize, useMergedRef } from "@mantine/hooks";
import { useAtom } from "jotai";
import { QueryService, AdjudicationService, NodeType } from "@/api/pdp.api";
import { transformNodesToTreeNodes, TreeNode } from "@/utils/tree.utils";
import { PrimitiveAtom } from "jotai/index";
import { INDENT_NUM } from "@/components/tree/util";
import { PPMNode } from "./PPMNode";
import { TreeDirection } from "./hooks/usePPMTreeOperations";

export interface PPMTreeClickHandlers {
	onLeftClick?: (node: TreeNode) => void;
	onRightClick?: (node: TreeNode) => void;
	onAddAsAscendant?: (node: TreeNode) => void;
	hasNodeCreationTabs?: boolean;
	onAssignTo?: (node: TreeNode) => void;
	onAssignNodeTo?: (sourceNode: TreeNode, targetNode: TreeNode) => void;
	isAssignmentMode?: boolean;
	assignmentSourceNode?: TreeNode | null;
	onViewAssociations?: (node: TreeNode) => void;
}

export interface PPMTreeProps {
	// Required props
	treeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null>;
	treeDataAtom: PrimitiveAtom<TreeNode[]>;
	
	// Optional props
	rootNode?: TreeNode;
	direction?: TreeDirection;
	clickHandlers?: PPMTreeClickHandlers;
	className?: string;
	style?: React.CSSProperties;
	
	// Layout props
	headerHeight?: number;
	footerHeight?: number;
	footerOpened?: boolean;
	
	// Tree configuration
	disableDrag?: boolean;
	disableDrop?: boolean;
	disableEdit?: boolean;
	disableMultiSelection?: boolean;
	disableSelection?: boolean;
	rowHeight?: number;
	overscanCount?: number;
}

export function PPMTree(props: PPMTreeProps) {
	const [treeData, setTreeData] = useAtom(props.treeDataAtom);
	const [treeApi, setTreeApi] = useAtom(props.treeApiAtom);
	const treeApiRef = useRef<TreeApi<TreeNode>>();
	const rootElement = useRef<HTMLDivElement>();
	const { ref: sizeRef, width, height } = useElementSize();
	const mergedRef = useMergedRef(rootElement, sizeRef);

	// Initial data loading
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

					const treeNodes = transformNodesToTreeNodes(nodes);
					setPOSNodes(treeNodes);
				}
			} catch (error) {
				console.error('Failed to fetch initial tree data:', error);
				// Fallback to empty array
				setPOSNodes([]);
			}
		}

		initNodes();
	}, [props.rootNode]);

	useEffect(() => {
		if (treeData.length === 0 && posNodes.length > 0) {
			setTreeData(posNodes);
		}
	}, [posNodes, treeData.length, setTreeData]);

	useEffect(() => {
		if (treeApiRef.current) {
			setTreeApi(treeApiRef.current);
		}
	}, [treeApiRef.current, setTreeApi]);

	// Calculate the available height
	const headerHeight = props.headerHeight ?? 60;
	const footerHeight = props.footerOpened ? (props.footerHeight ?? 0) : 0;
	const availableHeight = `calc(100vh - ${headerHeight}px - ${footerHeight}px)`;

	// Node renderer function that passes click handlers and direction
	const nodeRenderer = (nodeProps: any) => (
		<PPMNode 
			{...nodeProps} 
			clickHandlers={props.clickHandlers}
			direction={props.direction ?? 'descendants'}
			treeDataAtom={props.treeDataAtom}
		/>
	);

	return (
		<div 
			ref={mergedRef} 
			className={props.className}
			style={{ 
				height: availableHeight,
				width: "100%",
				display: "flex",
				flexDirection: "column",
				boxSizing: "border-box",
				...props.style 
			}}
		>
			{width > 0 && height > 0 ? (
				<div style={{ flex: 1, width: '100%' }}>
					<Tree
						data={treeData}
						disableDrag={props.disableDrag ?? true}
						disableDrop={props.disableDrop ?? true}
						disableEdit={props.disableEdit ?? false}
						disableMultiSelection={props.disableMultiSelection ?? true}
						disableSelection={props.disableSelection ?? true}
						openByDefault={false}
						width={width}
						height={height}
						indent={INDENT_NUM}
						ref={treeApiRef}
						rowHeight={props.rowHeight ?? 28}
						overscanCount={props.overscanCount ?? 20}
						onCreate={({ parentId, index, type }) => {
							console.log('onCreate called with:', { parentId, index, type });
							
							// Get the pending node type and parent info from the tree API
							const nodeType = (treeApiRef.current as any)?._pendingNodeType;
							const parentNode = (treeApiRef.current as any)?._pendingParentNode;
							
							console.log('Retrieved pending info:', { nodeType, parentNode });
							
							if (!nodeType || !parentNode) {
								console.error('Missing pending node type or parent node');
								return { id: `temp-${Date.now()}`, name: '', type: nodeType || 'UA' };
							}
							
							// Create a temporary node with the correct type
							const tempId = `temp-${Date.now()}`;
							const tempNode: TreeNode = {
								id: tempId,
								name: '', // Empty name triggers edit mode
								type: nodeType,
								children: [],
								parent: parentId,
								isTemporary: true
							};
							
							console.log('Created temporary node:', tempNode);
							
							// Clean up the pending info
							delete (treeApiRef.current as any)._pendingNodeType;
							delete (treeApiRef.current as any)._pendingParentNode;
							
							return tempNode;
						}}
						onEdit={async (args) => {
							// Handle node editing completion
							console.log('onEdit called with:', args);
							const nodeBeingEdited = treeData.find(n => n.id === args.id);
							console.log('Found node being edited:', nodeBeingEdited);
							
							if (nodeBeingEdited?.isTemporary) {
								console.log('Processing temporary node creation');
								if (args.name && args.name.trim()) {
									// First, update the temporary node name immediately so it shows in the UI
									setTreeData(prev => prev.map(node => 
										node.id === args.id ? { ...node, name: args.name, isTemporary: false } : node
									));
									
									try {
										// Find parent node to get parent ID for API call
										const parentNode = treeData.find(n => n.id === nodeBeingEdited.parent);
										const parentId = parentNode?.pmId || parentNode?.id;
										
										if (!parentId) {
											console.error('Parent node not found for temporary node');
											setTreeData(prev => prev.filter(node => node.id !== args.id));
											return;
										}

										console.log('Calling API to create node:', args.name, 'Type:', nodeBeingEdited.type);

										// Call the appropriate API based on node type
										let response;
										switch (nodeBeingEdited.type as NodeType) {
											case NodeType.UA:
												response = await AdjudicationService.createUserAttribute(args.name, [parentId]);
												break;
											case NodeType.OA:
												response = await AdjudicationService.createObjectAttribute(args.name, [parentId]);
												break;
											case NodeType.U:
												response = await AdjudicationService.createUser(args.name, [parentId]);
												break;
											case NodeType.O:
												response = await AdjudicationService.createObject(args.name, [parentId]);
												break;
											default:
												console.error('Unsupported node type for creation:', nodeBeingEdited.type);
												setTreeData(prev => prev.filter(node => node.id !== args.id));
												return;
										}

										console.log('API response:', response);

										// Keep the node with the name - don't remove it since it's now created
										// Optionally refresh the tree to get the proper node ID from the server
										// For now, just keep the temporary node as a real node
										console.log('Node created successfully');
										
									} catch (error) {
										console.error('Failed to create node via API:', error);
										// Remove the temporary node on error
										setTreeData(prev => prev.filter(node => node.id !== args.id));
									}
								} else {
									// Remove temporary nodes with empty names
									setTreeData(prev => prev.filter(node => node.id !== args.id));
								}
							} else {
								// Handle regular node editing (existing nodes)
								if (args.name && args.name.trim()) {
									setTreeData(prev => prev.map(node => 
										node.id === args.id ? { ...node, name: args.name } : node
									));
								}
							}
						}}
					>
						{nodeRenderer}
					</Tree>
				</div>
			) : (
				<div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					Loading tree...
				</div>
			)}
		</div>
	);
}