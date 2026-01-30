import { ActionIcon, Center, Stack } from "@mantine/core";
import {
	IconBan,
	IconCalendarCode,
	IconInfoSquareRounded
} from "@tabler/icons-react";
import React from "react";
import {InfoPanel} from "@/features/info/InfoPanel";
import {ProhibitionsPanel, ProhibitionDetails} from "@/features/prohibitions";
import {ObligationsPanel} from "@/features/obligations/ObligationsPanel";
import { Operations } from "@/features/operations";
import {AdminOperationIcon} from "@/components/icons/AdminOperationIcon";
import {ResourceOperationIcon} from "@/components/icons/ResourceOperationIcon";
import {QueryOperationIcon} from "@/components/icons/QueryOperationIcon";
import {RoutineIcon} from "@/components/icons/RoutineIcon";
import {FunctionIcon} from "@/components/icons/FunctionIcon";
import {GraphIcon} from "@/components/icons/GraphIcon";

export enum RightPanelComponent {
	NODE_INFO = 'NODE_INFO',
	PROHIBITIONS = 'PROHIBITIONS',
	CREATE_PROHIBITION = 'CREATE_PROHIBITION',
	OBLIGATIONS = 'OBLIGATIONS',
	ADMIN_OPERATIONS = 'ADMIN_OPERATIONS',
	RESOURCE_OPERATIONS = 'RESOURCE_OPERATIONS',
	QUERIES = 'QUERIES',
	ROUTINES = 'ROUTINES',
	FUNCTIONS = 'FUNCTIONS',
}

export type RightPanelProps = {
	component: RightPanelComponent | null;
	isExpanded: boolean;
	onComponentClick: (component: RightPanelComponent) => void;
	selectedNodeForInfo?: any;
	selectedNodes?: any[];
	onRightPanelClose?: () => void;
}

export function RightPanel({component, isExpanded, onComponentClick, selectedNodeForInfo, selectedNodes, onRightPanelClose}: RightPanelProps) {
	const buttons = [
		{
			component: RightPanelComponent.NODE_INFO,
			icon: <GraphIcon size={24}/>,
			title: "Node Info"
		},
		{
			component: RightPanelComponent.PROHIBITIONS,
			icon: <IconBan size={24}/>,
			title: "Prohibitions"
		},
		{
			component: RightPanelComponent.OBLIGATIONS,
			icon: <IconCalendarCode size={24}/>,
			title: "Obligations"
		},
		{
			component: RightPanelComponent.ADMIN_OPERATIONS,
			icon: <AdminOperationIcon size={24}/>,
			title: "Admin Operations"
		},
		{
			component: RightPanelComponent.RESOURCE_OPERATIONS,
			icon: <ResourceOperationIcon size={24}/>,
			title: "Resource Operations"
		},
		{
			component: RightPanelComponent.QUERIES,
			icon: <QueryOperationIcon size={24}/>,
			title: "Queries"
		},
		{
			component: RightPanelComponent.ROUTINES,
			icon: <RoutineIcon size={24}/>,
			title: "Routines"
		},
		{
			component: RightPanelComponent.FUNCTIONS,
			icon: <FunctionIcon size={24}/>,
			title: "Functions"
		}
	];

	const buttonStack = (
		<Stack style={{
			height: "100%",
			backgroundColor: "var(--mantine-color-gray-0)",
			padding: "4px",
			width: "40px",
			flexShrink: 0,
			borderLeft: "1px solid var(--mantine-color-gray-3)"
		}}>
			{buttons.map(({component: btnComponent, icon, title}) => (
				<Center key={btnComponent}>
					<ActionIcon
						variant={component === btnComponent ? "filled" : "transparent"}
						size="md"
						onClick={() => onComponentClick(btnComponent)}
						title={title}
					>
						{React.cloneElement(icon, {
							color: component === btnComponent ? "white" : "var(--mantine-primary-color-filled)",
							...(icon.type !== IconInfoSquareRounded &&
								icon.type !== IconBan &&
								icon.type !== IconCalendarCode && {
								filled: component === btnComponent,
								fillColor: "var(--mantine-primary-color-filled)"
							})
						})}
					</ActionIcon>
				</Center>
			))}
		</Stack>
	);

	if (!isExpanded) {
		// Collapsed state - just show button stack, ensure no content bleeding
		return (
			<div style={{ 
				display: 'flex', 
				flexDirection: 'row',
				height: '100%',
				width: '40px',
				overflow: 'hidden'
			}}>
				{buttonStack}
			</div>
		);
	}

	// Expanded state - content on left, buttons on right
	return (
		<div style={{ 
			display: 'flex', 
			flexDirection: 'row',
			height: '100%',
			width: '100%'
		}}>
			{/* Content area - takes up remaining space on the left */}
			<div style={{
				flex: 1,
				backgroundColor: "var(--mantine-color-gray-0)",
				padding: "4px",
				borderLeft: "1px solid var(--mantine-color-gray-3)",
				minWidth: 0,
				overflow: 'hidden'
			}}>
				{renderComponent(component, selectedNodeForInfo, selectedNodes as any[], onRightPanelClose)}
			</div>
			
			{/* Button stack - always on the right */}
			{buttonStack}
		</div>
	);
}

function renderComponent(component: RightPanelComponent | null, selectedNodeForInfo: any, selectedNodes: any[], onRightPanelClose?: () => void) {
	switch (component) {
		case RightPanelComponent.NODE_INFO:
			return selectedNodeForInfo ? (
				<InfoPanel 
					rootNode={selectedNodeForInfo} 
					selectedNodes={selectedNodes || []}
				/>
			) : (
				<Center style={{ height: '100%' }}>
					Right click and select "info" on a node
				</Center>
			);
		case RightPanelComponent.PROHIBITIONS:
			return <ProhibitionsPanel selectedNodes={selectedNodes}/>;
		case RightPanelComponent.CREATE_PROHIBITION:
			return (
				<ProhibitionDetails
					selectedNodes={selectedNodes}
					onCancel={() => onRightPanelClose?.()}
					onSuccess={() => onRightPanelClose?.()}
				/>
			);
		case RightPanelComponent.OBLIGATIONS:
			return <ObligationsPanel />;
		case RightPanelComponent.ADMIN_OPERATIONS:
			return <Operations initialMode="admin" />;
		case RightPanelComponent.RESOURCE_OPERATIONS:
			return <Operations initialMode="resource" />;
		case RightPanelComponent.QUERIES:
			return <Operations initialMode="query" />;
		case RightPanelComponent.ROUTINES:
			return <Operations initialMode="routine" />;
		case RightPanelComponent.FUNCTIONS:
			return <Operations initialMode="function" />;
		default:
			return <Center style={{ height: '100%' }}>Select a component</Center>;
	}
}
