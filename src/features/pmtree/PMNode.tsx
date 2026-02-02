import React, { useState, useEffect } from "react";
import {
	IconPoint,
	IconSquareRoundedMinus, IconSquareRoundedPlus
} from "@tabler/icons-react";
import clsx from "clsx";
import {NodeRendererProps} from "react-arborist";
import {ActionIcon, Loader, useMantineTheme, Tooltip} from "@mantine/core";
import classes from "@/features/pmtree/pmtree.module.css";
import { PMTreeClickHandlers } from "./PMTree";
import { TreeDirection, usePMTreeOperations, TreeFilterConfig } from "./hooks/usePMTreeOperations";
import { PrimitiveAtom } from "jotai/index";
import { useAtom } from "jotai";
import { useTheme } from "@/shared/theme/ThemeContext";
import {
	INDENT_NUM,
	NodeIcon,
	IncomingAssociationIcon,
	OutgoingAssociationIcon,
	shouldShowExpansionIcon,
	truncateMiddle, TreeNode, getTypeColor
} from "@/features/pmtree/tree-utils";

export interface PMNodeProps extends NodeRendererProps<TreeNode> {
	clickHandlers?: PMTreeClickHandlers;
	direction: TreeDirection;
	treeDataAtom: PrimitiveAtom<TreeNode[]>;
	filterConfigAtom: PrimitiveAtom<TreeFilterConfig>;
	className?: string;
}

export function PMNode({ node, style, tree, clickHandlers, direction, treeDataAtom, filterConfigAtom, className }: PMNodeProps) {
	const { themeMode } = useTheme();
	const theme = useMantineTheme();
	const [filterConfig] = useAtom(filterConfigAtom);
	const { toggleNodeWithData } = usePMTreeOperations(treeDataAtom, direction, filterConfig);

	const handleExpansionClick = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		await toggleNodeWithData(node);
	};

	const handleDoubleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Call the double click callback if provided
		if (clickHandlers?.onDoubleClick) {
			clickHandlers.onDoubleClick(node.data);
		}
	};

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Call the right click callback if provided
		if (clickHandlers?.onRightClick) {
			clickHandlers.onRightClick(node.data, e);
		}
	};

	const handleLeftClick = (e: React.MouseEvent) => {
		// Call the left click callback if provided
		if (clickHandlers?.onLeftClick) {
			clickHandlers.onLeftClick(node.data);
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
		const truncatedName = truncateMiddle(node.data.name, 40);
		const shouldShowTooltip = node.data.name.length > 40;
		const isAssociation = node.data.isAssociation;
		const associationType = node.data.associationDetails?.type;

		return (
			<div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, minWidth: 0, whiteSpace: 'nowrap' }}>
				{isAssociation && associationType === 'outgoing' && (
					<OutgoingAssociationIcon
						color={theme.colors.green[9]}
						size="20px"
					/>
				)}
				{isAssociation && associationType === 'incoming' && (
					<IncomingAssociationIcon
						color={theme.colors.green[9]}
						size="20px"
					/>
				)}
				<NodeIcon
					type={node.data.type}
					size={20}
				/>
				<Tooltip label={node.data.name} position="top" disabled={!shouldShowTooltip}>
					<span style={{
						fontSize: '14px',
						fontWeight: 500,
						color: 'var(--mantine-color-text)',
						userSelect: 'none',
						cursor: 'default',
						whiteSpace: 'nowrap'
					}}>
						{truncatedName}
					</span>
				</Tooltip>
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
				onDoubleClick={handleDoubleClick}
				onClick={handleLeftClick}
			>
				{renderGuideLines()}

				<ActionIcon
					size={20}
					variant="transparent"
					style={{ marginRight: '6px', marginLeft: '.5px' }}
					onClick={shouldShowExpansionIcon(direction, node.data) ? handleExpansionClick : undefined}
				>
					{node.data.isLoading ? (
						<Loader size={16} />
					) : shouldShowExpansionIcon(direction, node.data) ? (
						node.isOpen ? (
							<IconSquareRoundedMinus
								stroke={2}
								size={16}
								color={themeMode === 'dark' ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-gray-9)'}
							/>
						) : (
							<IconSquareRoundedPlus
								stroke={2}
								size={16}
								color={themeMode === 'dark' ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-gray-9)'}
							/>
						)
					) : <IconPoint
						stroke={2}
						size={16}
						color={themeMode === 'dark' ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-gray-9)'}
					/>}
				</ActionIcon>

				{renderNodeContent()}
			</div>

		</>
	);
}