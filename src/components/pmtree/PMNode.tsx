import React, { useState } from "react";
import {
	IconChevronDown,
	IconChevronRight,
	IconCircle,
	IconCircleMinus,
	IconCirclePlus,
	IconPoint, IconPointFilled, IconSquareRoundedMinus, IconSquareRoundedPlus
} from "@tabler/icons-react";
import clsx from "clsx";
import { NodeRendererProps } from "react-arborist";
import {ActionIcon, Loader, useMantineTheme} from "@mantine/core";
import { TreeNode } from "@/utils/tree.utils";
import classes from "@/components/pmtree/pmtree.module.css";
import { PMTreeClickHandlers } from "./PMTree";
import { TreeDirection, usePMTreeOperations } from "./hooks/usePMTreeOperations";
import { PrimitiveAtom } from "jotai/index";
import { NodeContextMenu } from "./NodeContextMenu";
import { useAtom } from "jotai";
import { useTheme } from "@/contexts/ThemeContext";
import {INDENT_NUM, NodeIcon, shouldShowExpansionIcon} from "@/components/pmtree/tree-utils";
import {NodeType} from "@/api/pdp.api";

export interface PMNodeProps extends NodeRendererProps<TreeNode> {
	clickHandlers?: PMTreeClickHandlers;
	direction: TreeDirection;
	treeDataAtom: PrimitiveAtom<TreeNode[]>;
	className?: string;
	nodeTypeFilter?: NodeType[];
}

export function PMNode({ node, style, tree, clickHandlers, direction, treeDataAtom, className, nodeTypeFilter }: PMNodeProps) {
	const { themeMode } = useTheme();
	const [isHovered, setIsHovered] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
	const { fetchAndUpdateChildren, clearNodeChildren } = usePMTreeOperations(treeDataAtom, direction, nodeTypeFilter);
	const [treeData, setTreeData] = useAtom(treeDataAtom);

	const handleClick = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Call the left click callback if provided
		if (clickHandlers?.onLeftClick) {
			clickHandlers.onLeftClick(node.data);
		}

		// Don't allow click if already loading
		if (isLoading) return;

		// Check if the node is currently open (about to be closed)
		const isClosing = node.isOpen;

		// If closing, clear children to prevent flash effect
		if (isClosing) {
			clearNodeChildren(node.data.id);
		}

		node.toggle();

		// If opening, fetch children
		if (!isClosing) {
			setIsLoading(true);
			try {
				await fetchAndUpdateChildren(node);
			} catch (error) {
				console.error('Failed to fetch node children:', error);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Show context menu at cursor position
		setContextMenu({ x: e.clientX, y: e.clientY });

		// Call the right click callback if provided
		if (clickHandlers?.onRightClick) {
			clickHandlers.onRightClick(node.data);
		}
	};

	const renderGuideLines = () => {
		const lines = [];
		let depth = node.level;

		if (depth > 0) {
			// Add vertical lines for each level except the current node
			for (let i = 0; i < depth; i++) {
				// Position the line to align with parent nodes
				const left = i * INDENT_NUM + 22;

				lines.push(
					<div
						key={`guideline-${node.data.id}-${i}`}
						className={classes.guideLine}
						style={{
							left: `${left + 12}px`,
							top: 0,
							height: '100%'
						}}
					/>
				);
			}

			// Add the horizontal connector line from the vertical line to the current node
			lines.push(
				<div
					key={`horizontal-${node.data.id}`}
					className={classes.horizontalLine}
					style={{
						left: `${(depth - 1) * INDENT_NUM + 34}px`,
						width: `${14}px`,
						top: 'calc(50% - 0.5px)'
					}}
				/>
			);
		}

		return lines;
	};

	const renderNodeContent = () => {
		return (
			<div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
				<NodeIcon
					type={node.data.type}
					size="18px"
					fontSize="12px"
				/>
				<span style={{
					fontSize: '14px',
					fontWeight: 500,
					color: 'var(--mantine-color-text)',
					userSelect: 'none'
				}}>
						{node.data.name}
				</span>
			</div>
		);
	};

	const mantineTheme = useMantineTheme();

	return (
		<>
			<div
				style={style}
				className={clsx(
					classes.node,
					node.state,
					className
				)}
				onContextMenu={handleContextMenu}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onClick={handleClick}
			>
				{renderGuideLines()}

				<ActionIcon
					size={20}
					variant="transparent"
					style={{ marginRight: '6px', marginLeft: '.5px' }}
				>
					{isLoading ? (
						<Loader size={16} />
					) : shouldShowExpansionIcon(node.data) ? (
						node.isOpen ? (
							<IconSquareRoundedMinus
								stroke={2}
								size={16}
								style={{backgroundColor: mantineTheme.other.intellijContentBg}}
								color={themeMode === 'dark' ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-gray-9)'}
							/>
						) : (
							<IconSquareRoundedPlus
								stroke={2}
								size={16}
								style={{backgroundColor: mantineTheme.other.intellijContentBg}}
								color={themeMode === 'dark' ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-gray-9)'}
							/>
						)
					) : null}
				</ActionIcon>

				{renderNodeContent()}
			</div>

			{contextMenu && (
				<NodeContextMenu
					node={node.data}
					position={contextMenu}
					onClose={() => setContextMenu(null)}
					onAddAsAscendant={clickHandlers?.onAddAsAscendant}
					hasNodeCreationTabs={clickHandlers?.hasNodeCreationTabs}
					nodeTypeBeingCreated={clickHandlers?.nodeTypeBeingCreated}
					onAssignTo={clickHandlers?.onAssignTo}
					onAssignNodeTo={clickHandlers?.onAssignNodeTo}
					isAssignmentMode={clickHandlers?.isAssignmentMode}
					assignmentSourceNode={clickHandlers?.assignmentSourceNode || undefined}
					onViewAssociations={clickHandlers?.onViewAssociations}
					isCreatingAssociation={clickHandlers?.isCreatingAssociation}
					onSelectNodeForAssociation={clickHandlers?.onSelectNodeForAssociation}
					isAssociationMode={clickHandlers?.isAssociationMode}
					associationCreationMode={clickHandlers?.associationCreationMode}
					onAssociateWith={clickHandlers?.onAssociateWith}
				/>
			)}
		</>
	);
}