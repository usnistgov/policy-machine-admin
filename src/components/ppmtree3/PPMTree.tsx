import React, { useEffect, useRef, useState } from "react";
import { Tree, TreeApi } from "react-arborist";
import { useElementSize, useMergedRef } from "@mantine/hooks";
import { useAtom } from "jotai";
import { QueryService, NodeType } from "@/api/pdp.api";
import { transformNodesToTreeNodes, TreeNode } from "@/utils/tree.utils";
import { PrimitiveAtom } from "jotai/index";
import { PPMNode } from "./PPMNode";
import { TreeDirection } from "./hooks/usePPMTreeOperations";
import {INDENT_NUM} from "@/components/ppmtree3/tree-utils";

export interface PPMTreeClickHandlers {
	onLeftClick?: (node: TreeNode) => void;
	onRightClick?: (node: TreeNode) => void;
	onAddAsAscendant?: (node: TreeNode) => void;
	hasNodeCreationTabs?: boolean;
	nodeTypeBeingCreated?: NodeType;
	onAssignTo?: (node: TreeNode) => void;
	onAssignNodeTo?: (targetNode: TreeNode) => void;
	isAssignmentMode?: boolean;
	assignmentSourceNode?: TreeNode | null;
	onViewAssociations?: (node: TreeNode) => void;
	onStartAssociationCreation?: (node: TreeNode) => void;
	onSelectNodeForAssociation?: (node: TreeNode) => void;
	isCreatingAssociation?: boolean;
	associationCreationNode?: TreeNode | null;
	// Association mode props
	isAssociationMode?: boolean;
	associationCreationMode?: 'outgoing' | 'incoming' | null;
	onAssociateWith?: (node: TreeNode) => void;
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
						openByDefault={false}
						width={width}
						height={height}
						indent={INDENT_NUM}
						ref={treeApiRef}
						rowHeight={props.rowHeight ?? 22}
						overscanCount={props.overscanCount ?? 20}
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