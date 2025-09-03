import React, { useEffect, useRef, useState } from "react";
import { Tree, TreeApi } from "react-arborist";
import { useElementSize, useMergedRef } from "@mantine/hooks";
import { useAtom } from "jotai";
import { QueryService, NodeType } from "@/api/pdp.api";
import { transformNodesToTreeNodes, TreeNode } from "@/utils/tree.utils";
import { PrimitiveAtom } from "jotai/index";
import { PMNode } from "./PMNode";
import { TreeDirection } from "./hooks/usePMTreeOperations";
import {INDENT_NUM} from "@/components/pmtree/tree-utils";

export interface PMTreeClickHandlers {
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

export interface PMTreeProps {
	// Required props
	treeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null>;
	treeDataAtom: PrimitiveAtom<TreeNode[]>;
	height: string;

	// Optional props
	rootNodes?: TreeNode[];
	direction?: TreeDirection;
	clickHandlers?: PMTreeClickHandlers;
	className?: string;
	style?: React.CSSProperties;
	nodeTypeFilter?: NodeType[];

	// Tree configuration
	disableDrag?: boolean;
	disableDrop?: boolean;
	disableEdit?: boolean;
	disableMultiSelection?: boolean;
	rowHeight?: number;
	overscanCount?: number;
}

export function PMTree(props: PMTreeProps) {
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
				if (props.rootNodes !== undefined) {
					// Use provided root nodes (even if empty array)
					console.log('PMTree: Using provided rootNodes:', props.rootNodes);
					const filteredNodes = props.nodeTypeFilter 
						? props.rootNodes.filter(node => props.nodeTypeFilter!.includes(node.type as NodeType))
						: props.rootNodes;
					setPOSNodes(filteredNodes);
				} else {
					// Only load POS if no rootNodes prop is provided at all
					console.log('PMTree: No rootNodes prop provided, loading POS');
					const response = await QueryService.selfComputePersonalObjectSystem();
					
					// Extract nodes from the response and transform to TreeNode
					const nodes = response
						.map(nodePriv => nodePriv.node)
						.filter((node): node is NonNullable<typeof node> => node !== undefined);

					const treeNodes = transformNodesToTreeNodes(nodes);
					const filteredNodes = props.nodeTypeFilter 
						? treeNodes.filter(node => props.nodeTypeFilter!.includes(node.type as NodeType))
						: treeNodes;
					setPOSNodes(filteredNodes);
				}
			} catch (error) {
				console.error('Failed to fetch initial tree data:', error);
				// Fallback to empty array
				setPOSNodes([]);
			}
		}

		initNodes();
	}, [props.rootNodes, props.nodeTypeFilter]);

	useEffect(() => {
		// Always set tree data when posNodes changes, even if empty
		console.log('PMTree: Setting tree data:', posNodes);
		setTreeData(posNodes);
	}, [posNodes, setTreeData]);

	useEffect(() => {
		if (treeApiRef.current) {
			setTreeApi(treeApiRef.current);
		}
	}, [treeApiRef.current, setTreeApi]);

	// Node renderer function that passes click handlers and direction
	const nodeRenderer = (nodeProps: any) => (
		<PMNode
			{...nodeProps} 
			clickHandlers={props.clickHandlers}
			direction={props.direction ?? 'descendants'}
			treeDataAtom={props.treeDataAtom}
			nodeTypeFilter={props.nodeTypeFilter}
		/>
	);

	return (
		<div
			ref={mergedRef} 
			className={props.className}
			style={{ 
				height: props.height,
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
		</div >
	);
}