import React, { useState } from "react";
import { IconChevronDown, IconChevronRight, IconPoint } from "@tabler/icons-react";
import clsx from "clsx";
import { NodeRendererProps } from "react-arborist";
import { ActionIcon, Loader } from "@mantine/core";
import { TreeNode } from "@/utils/tree.utils";
import classes from "@/components/tree/pmtree.module.css";
import { INDENT_NUM, NodeIcon, shouldShowExpansionIcon } from "@/components/tree/util";
import { PPMTreeClickHandlers } from "./PPMTree";
import { TreeDirection, usePPMTreeOperations } from "./hooks/usePPMTreeOperations";
import { PrimitiveAtom } from "jotai/index";

export interface PPMNodeProps extends NodeRendererProps<TreeNode> {
	clickHandlers?: PPMTreeClickHandlers;
	direction: TreeDirection;
	treeDataAtom: PrimitiveAtom<TreeNode[]>;
	className?: string;
}

export function PPMNode({ node, style, tree, clickHandlers, direction, treeDataAtom, className }: PPMNodeProps) {
	const [isHovered, setIsHovered] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { fetchAndUpdateChildren, clearNodeChildren } = usePPMTreeOperations(treeDataAtom, direction);

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
				const left = i * INDENT_NUM + 12;

				lines.push(
					<div
						key={`guideline-${node.data.id}-${i}`}
						className={classes.guideLine}
						style={{
							left: `${left}px`,
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
						left: `${(depth - 1) * INDENT_NUM + 12}px`,
						width: `${22}px`,
						top: 'calc(50% - 0.5px)'
					}}
				/>
			);
		}

		return lines;
	};

	const renderNodeContent = () => {
		return (
			<div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
				<NodeIcon 
					type={node.data.type} 
					size="20px"
					fontSize="14px"
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

	return (
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
				size={25}
				variant="transparent"
				style={{ marginRight: '0' }}
				c="black"
			>
				{isLoading ? (
					<Loader size={16} color="black" />
				) : shouldShowExpansionIcon(node.data) ? (
					node.isOpen ? (
						<IconChevronDown stroke={2} size={16} />
					) : (
						<IconChevronRight stroke={2} size={16} />
					)
				) : (
					<IconPoint stroke={2} size={16} />
				)}
			</ActionIcon>

			{renderNodeContent()}
		</div>
	);
}