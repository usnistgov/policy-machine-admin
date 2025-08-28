import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { toJpeg, toPng, toSvg } from 'html-to-image';
import {
    addEdge,
    Background,
    BackgroundVariant,
    Connection,
    ConnectionMode,
    ControlButton,
    Controls,
    Edge,
    Handle,
    MarkerType,
    MiniMap,
    Node,
    NodeProps,
    OnConnectStartParams,
    Position,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    useReactFlow,
    getRectOfNodes,
    getTransformForBounds,
} from 'reactflow';
import {
    AppShell,
    Button,
    Group,
    Menu,
    Modal,
    Paper,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
    ActionIcon,
    Tooltip,
    Box,
    Divider
} from '@mantine/core';
import { NavBar } from '@/components/navbar/NavBar';
import { UserMenu } from '@/components/UserMenu';
import classes from './navbar.module.css';

import 'reactflow/dist/style.css';

import { IconCamera, IconJson, IconSitemap, IconSun, IconMoon, IconTrash, IconSettings } from '@tabler/icons-react';
import { PMIcon } from "@/components/icons/PMIcon";
import { useTheme } from '@/contexts/ThemeContext';
import { useMantineTheme } from '@mantine/core';
import { NodeType } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import {AssociationModal} from "@/components/dag/AssociationModal";
import {isValidAssignment, NodeIcon} from "@/components/pmtree/tree-utils";

const getNodeTypeColorFromTheme = (type: string) => {
    switch (type) {
        case NodeType.PC:
            return '#00973c'; // theme.colors.green[9]
        case NodeType.UA:
            return '#9f003e'; // theme.colors.red[9]
        case NodeType.OA:
            return '#0043b5'; // theme.colors.blue[9]
        case NodeType.U:
            return '#e3366c'; // theme.colors.red[4]
        case NodeType.O:
            return '#3884fe'; // theme.colors.blue[4]
        default:
            return '#adb5bd'; // theme.colors.gray[5]
    }
};

// Converts nodes and edges to Policy Machine JSON schema's 'graph' element
function graphToJson(nodes: Node[], edges: Edge[]) {
    // Helper to parse node id as integer (schema requires integer IDs)
    const parseId = (id: string) => {
        const n = Number(id);
        return Number.isFinite(n) ? n : id;
    };

    // Group nodes by type
    const pcs = nodes
        .filter((n) => n.data.type === NodeType.PC)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            properties: [],
        }));
    const uas = nodes
        .filter((n) => n.data.type === NodeType.UA)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            assignments: edges
                .filter((e) => e.data?.edgeType === 'assignment' && e.source === n.id)
                .map((e) => parseId(e.target)),
            associations: edges
                .filter((e) => e.data?.edgeType === 'association' && e.source === n.id)
                .map((e) => ({
                    target: parseId(e.target),
                    arset: e.data?.accessRights ? e.data.accessRights.split(', ').filter(Boolean) : [],
                })),
            properties: [],
        }));
    const oas = nodes
        .filter((n) => n.data.type === NodeType.OA)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            assignments: edges
                .filter((e) => e.data?.edgeType === 'assignment' && e.source === n.id)
                .map((e) => parseId(e.target)),
            properties: [],
        }));
    const users = nodes
        .filter((n) => n.data.type === NodeType.U)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            assignments: edges
                .filter((e) => e.data?.edgeType === 'assignment' && e.source === n.id)
                .map((e) => parseId(e.target)),
            properties: [],
        }));
    const objects = nodes
        .filter((n) => n.data.type === NodeType.O)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            assignments: edges
                .filter((e) => e.data?.edgeType === 'assignment' && e.source === n.id)
                .map((e) => parseId(e.target)),
            properties: [],
        }));

    return JSON.stringify(
        {
            graph: { pcs, uas, oas, users, objects },
        },
        null,
        2
    );
}

// Converts Policy Machine JSON schema's 'graph' element to nodes and edges arrays
function jsonToGraph(json: any, config: 'original' | 'simplified' = 'original'): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    if (!json || !json.graph) {
        return { nodes, edges };
    }
    const { pcs = [], uas = [], oas = [], users = [], objects = [] } = json.graph;

    // Helper to make string IDs (for ReactFlow)
    const idStr = (id: any) => String(id);

    // Add all nodes
    (pcs as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.PC },
        })
    );
    (uas as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.UA },
        })
    );
    (oas as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.OA },
        })
    );
    (users as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.U },
        })
    );
    (objects as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.O },
        })
    );

    // Add assignment edges (source = node.id, target = assignment id)
    const addAssignmentEdges = (arr: any[], sourceType: string) => {
        arr.forEach((n: any) => {
            if (Array.isArray(n.assignments)) {
                n.assignments.forEach((targetId: any) => {
                    // Find target node type
                    const targetNode = nodes.find((node) => node.id === idStr(targetId));
                    const targetNodeType = targetNode?.data.type;

                    edges.push({
                        id: `e${n.id}-${targetId}`,
                        source: idStr(n.id),
                        target: idStr(targetId),
                        type: getEdgeType('assignment', config),
                        sourceHandle: 'assignment-out',
                        targetHandle: 'assignment-in',
                        data: {
                            edgeType: 'assignment',
                            sourceNodeType: sourceType,
                            targetNodeType,
                        },
                        style: getEdgeStyle('assignment', false, false),
                        markerEnd: getMarkerEnd('assignment', false, false),
                    } as Edge);
                });
            }
        });
    };
    addAssignmentEdges(uas as any[], NodeType.UA);
    addAssignmentEdges(oas as any[], NodeType.OA);
    addAssignmentEdges(users as any[], NodeType.U);
    addAssignmentEdges(objects as any[], NodeType.O);

    // Add association edges (UA only)
    (uas as any[]).forEach((n: any) => {
        if (Array.isArray(n.associations)) {
            n.associations.forEach((assoc: any, i: number) => {
                const accessRights = Array.isArray(assoc.arset) ? assoc.arset.join(', ') : '';
                const targetNode = nodes.find((node) => node.id === idStr(assoc.target));
                const targetNodeType = targetNode?.data.type;

                edges.push({
                    id: `a${n.id}-${assoc.target}-${i}`,
                    source: idStr(n.id),
                    target: idStr(assoc.target),
                    type: getEdgeType('association', config),
                    sourceHandle: 'association-out',
                    targetHandle: 'association-in',
                    data: {
                        edgeType: 'association',
                        accessRights,
                        sourceNodeType: NodeType.UA,
                        targetNodeType,
                    },
                    style: getEdgeStyle('association', false, false),
                    markerEnd: getMarkerEnd('association', false, false),
                    label: accessRights,
                    labelStyle: {
                        fontSize: '12px',
                        fontWeight: 600,
                        fill: 'black',
                    },
                    labelBgStyle: {
                        fill: 'white',
                        fillOpacity: 0.8,
                        stroke: 'var(--mantine-color-green-7)',
                        strokeWidth: 1,
                    },
                } as Edge);
            });
        }
    });

    return { nodes, edges };
}

function createHandle(
    data: any,
    id: string,
    handleType: 'target' | 'source',
    position: Position,
    top: string,
    right: string,
    bottom: string,
    left: string
) {
    let color;
    if (id.startsWith('assignment')) {
        color = 'black';
    } else {
        color = 'var(--mantine-color-green-7)';
    }

    return (
        <Handle
            key={id}
            type={handleType}
            position={position}
            id={id}
            className="handle"
            style={{
                background: color,
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: `1px solid ${color}`,
                top,
                right,
                bottom,
                left,
            }}
        />
    );
}

// Simplified Node Component for option 2 - centered handles
function SimplifiedDAGNode({ data, selected }: NodeProps) {
    const mantineTheme = useMantineTheme();
    const nodeType = data.type;
    const typeColor = getNodeTypeColorFromTheme(nodeType);
    const isHighlighted = data.isHighlighted;

    // Determine outline color for highlighting - red for user nodes, blue for object nodes  
    let outlineColor = '';
    if (isHighlighted) {
        const isUserSide = nodeType === NodeType.U || nodeType === NodeType.UA;
        const isObjectSide = nodeType === NodeType.O || nodeType === NodeType.OA;
        outlineColor = isUserSide ? mantineTheme.colors.red[4] : isObjectSide ? mantineTheme.colors.blue[4] : mantineTheme.colors.green[4];
    }

    return (
        <div
            style={{
                position: 'relative',
                background: 'transparent',
                borderRadius: 8,
                border: `2px solid ${typeColor}`,
                padding: '6px 4px',
                fontSize: '14px',
                color: 'black',
                whiteSpace: 'nowrap',
            }}
        >
            {/* Highlighted border overlay */}
            {isHighlighted && (
                <div
                    style={{
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        right: -2,
                        bottom: -2,
                        borderRadius: 6,
                        border: `2px solid ${typeColor}`,
                        filter: `drop-shadow(0 0 2px ${outlineColor}) drop-shadow(0 0 4px ${outlineColor})`,
                        pointerEvents: 'none',
                        zIndex: -1,
                    }}
                />
            )}
            
            {/* Left center: incoming associations */}
            <Handle
                type="target"
                position={Position.Left}
                id="association-in"
                style={{
                    background: 'var(--mantine-color-green-7)',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: '1px solid var(--mantine-color-green-7)',
                    top: '50%',
                    left: '-5px',
                }}
            />

            {/* Right center: outgoing associations */}
            {nodeType === NodeType.UA && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id="association-out"
                    style={{
                        background: 'var(--mantine-color-green-7)',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '1px solid var(--mantine-color-green-7)',
                        top: '50%',
                        right: '-5px',
                    }}
                />
            )}

            {/* Top center: incoming assignments */}
            {(nodeType === NodeType.PC || nodeType === NodeType.UA || nodeType === NodeType.OA) && (
                <Handle
                    type="target"
                    position={Position.Top}
                    id="assignment-in"
                    style={{
                        background: 'black',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '1px solid black',
                        top: '-5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                />
            )}

            {/* Bottom center: outgoing assignments */}
            {(nodeType === NodeType.UA || nodeType === NodeType.OA || nodeType === NodeType.U || nodeType === NodeType.O) && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="assignment-out"
                    style={{
                        background: 'black',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '1px solid black',
                        bottom: '-5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                />
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <div
                    style={{
                        fontSize: '10px',
                        lineHeight: '14px',
                        display: 'flex',
                        width: '14px',
                        justifyContent: 'center',
                    }}
                >
                    <NodeIcon
                        type={nodeType}
                        style={{
                            fontSize: '10px',
                            lineHeight: '14px',
                            width: '14px',
                            height: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    />
                </div>
                <span
                    style={{
                        fontWeight: 800,
                        lineHeight: '14px',
                        fontSize: '14px',
                        fontFamily: 'Source Code Pro, monospace',
                    }}
                >
                    {data.name}
                </span>
            </div>
        </div>
    );
}

// Custom Node Component with specific handles
function CustomDAGNode({ data, selected }: NodeProps) {
    const mantineTheme = useMantineTheme();
    const nodeType = data.type;
    const typeColor = getNodeTypeColorFromTheme(nodeType);
    const isHighlighted = data.isHighlighted;

    // Determine which handles to show based on node type
    const showAssignmentIn =
        nodeType === NodeType.PC || nodeType === NodeType.UA || nodeType === NodeType.OA;
    const showAssignmentOut =
        nodeType === NodeType.UA ||
        nodeType === NodeType.OA ||
        nodeType === NodeType.U ||
        nodeType === NodeType.O;
    const showAssociationIn =
        nodeType === NodeType.UA || nodeType === NodeType.OA || nodeType === NodeType.O;
    const showAssociationOut = nodeType === NodeType.UA;

    // Determine outline color for highlighting - red for user nodes, blue for object nodes  
    let outlineColor = '';
    if (isHighlighted) {
        const isUserSide = nodeType === NodeType.U || nodeType === NodeType.UA;
        const isObjectSide = nodeType === NodeType.O || nodeType === NodeType.OA;
        outlineColor = isUserSide ? mantineTheme.colors.red[7] : isObjectSide ? mantineTheme.colors.blue[7] : mantineTheme.colors.green[7];
    }

    return (
        <div
            style={{
                position: 'relative',
                background: 'transparent',
                borderRadius: 6,
                border: `2px solid ${typeColor}`,
                padding: '6px 4px',
                fontSize: '14px',
                color: 'black',
                whiteSpace: 'nowrap',
            }}
        >
            {/* Highlighted border overlay */}
            {isHighlighted && (
                <div
                    style={{
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        right: -2,
                        bottom: -2,
                        borderRadius: 6,
                        border: `2px solid ${typeColor}`,
                        filter: `drop-shadow(0 0 2px ${outlineColor}) drop-shadow(0 0 4px ${outlineColor})`,
                        pointerEvents: 'none',
                        zIndex: -1,
                    }}
                />
            )}
            
            {nodeType == 'PC' && [
                createHandle(data, 'assignment-in', 'target', Position.Right, '50%', '-5', 'auto', 'auto'),
            ]}

            {nodeType == 'UA' && [
                createHandle(data, 'association-in', 'target', Position.Left, '30%', 'auto', 'auto', '-5'),
                createHandle(data, 'assignment-in', 'target', Position.Left, '70%', 'auto', 'auto', '-5'),
                createHandle(
                    data,
                    'association-out',
                    'source',
                    Position.Right,
                    '30%',
                    '-5',
                    'auto',
                    'auto'
                ),
                createHandle(data, 'assignment-out', 'source', Position.Right, '70%', '-5', 'auto', 'auto'),
            ]}

            {nodeType == 'OA' && [
                createHandle(data, 'association-in', 'target', Position.Left, '30%', 'auto', 'auto', '-5'),
                createHandle(data, 'assignment-out', 'source', Position.Left, '70%', 'auto', 'auto', '-5'),
                createHandle(data, 'assignment-in', 'target', Position.Right, '50%', '-5', 'auto', 'auto'),
            ]}

            {nodeType == 'O' && [
                createHandle(data, 'association-in', 'target', Position.Left, '30%', 'auto', 'auto', '-5'),
                createHandle(data, 'assignment-out', 'source', Position.Left, '70%', 'auto', 'auto', '-5'),
            ]}

            {nodeType == 'U' && [
                createHandle(data, 'assignment-out', 'source', Position.Right, '50%', '-5', 'auto', 'auto'),
            ]}

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <div
                    style={{
                        fontSize: '10px',
                        lineHeight: '14px',
                        display: 'flex',
                        width: '14px', // Fixed width container for consistent icon spacing
                        justifyContent: 'center',
                    }}
                >
                    <NodeIcon
                        type={nodeType}
                        style={{
                            fontSize: '10px',
                            lineHeight: '14px',
                            width: '14px', // Fixed width for all icons
                            height: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    />
                </div>
                <span
                    style={{
                        fontWeight: 800,
                        lineHeight: '14px',
                        fontSize: '14px',
                        fontFamily: 'Source Code Pro, monospace',
                    }}
                >
          {data.name}
        </span>
            </div>
        </div>
    );
}

// Custom Association Edge Component with specific routing: right 50px, then up/down to target
function CustomAssociationEdge({
                                   id,
                                   sourceX,
                                   sourceY,
                                   targetX,
                                   targetY,
                                   style = {},
                                   data,
                                   markerEnd,
                                   target,
                               }: any) {
    const { getEdges } = useReactFlow();

    // Fixed horizontal offset of 50px to the right
    const horizontalOffset = 50;

    // Get all edges to detect multiple incoming association edges
    const allEdges = getEdges();

    // Find all association edges targeting the same node and handle
    const incomingAssociationEdges = allEdges.filter(
        (edge: any) =>
            edge.target === target &&
            edge.targetHandle === 'association-in' &&
            edge.data?.edgeType === 'association'
    );

    // Sort edges by source ID for consistent ordering
    incomingAssociationEdges.sort((a: any, b: any) => a.source.localeCompare(b.source));

    // Find the index of current edge
    const currentEdgeIndex = incomingAssociationEdges.findIndex((edge: any) => edge.id === id);

    // Calculate vertical offset for staggering (25px spacing between edges to prevent label overlap)
    const verticalStagger = 25;
    const totalEdges = incomingAssociationEdges.length;
    const centerOffset = Math.floor(totalEdges / 2);
    const verticalOffset = (currentEdgeIndex - centerOffset) * verticalStagger;

    // Calculate intermediate points for association edge routing with staggering
    const midX1 = sourceX + horizontalOffset; // Go right 50px from source
    const staggeredTargetY = targetY + verticalOffset; // Apply vertical stagger

    // For staggered edges, turn toward actual target handle from 30px away
    const turnDistance = 30; // Distance from target handle to turn point
    const turnX = targetX - turnDistance;

    let path: string;
    let labelX: number, labelY: number;

    if (totalEdges > 1 && currentEdgeIndex >= 0) {
        // Staggered path: go right 50px, then to staggered Y, then turn toward actual target handle
        path = `M ${sourceX},${sourceY} L ${midX1},${sourceY} L ${midX1},${staggeredTargetY} L ${turnX},${staggeredTargetY} L ${turnX},${targetY} L ${targetX},${targetY}`;

        // Position label on the horizontal staggered segment
        labelX = (midX1 + turnX) / 2;
        labelY = staggeredTargetY - 10;
    } else {
        // Single edge: use simple path
        path = `M ${sourceX},${sourceY} L ${midX1},${sourceY} L ${midX1},${targetY} L ${targetX},${targetY}`;

        // Position label at the midpoint of the second horizontal segment
        labelX = (midX1 + targetX) / 2;
        labelY = targetY - 10;
    }

    return (
        <g>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={path}
                markerEnd={markerEnd}
                fill="none"
            />
            {data?.accessRights && (
                <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    fontSize="12px"
                    fontWeight="600"
                    fill="black"
                    style={{
                        backgroundColor: 'white',
                        padding: '2px 4px',
                    }}
                >
                    {data.accessRights}
                </text>
            )}
        </g>
    );
}

// Simple Straight Edge Component for simplified assignment edges
function SimpleStraightEdge({
                               id,
                               sourceX,
                               sourceY,
                               targetX,
                               targetY,
                               style = {},
                               markerEnd,
                           }: any) {
    const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

    return (
        <g>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={path}
                markerEnd={markerEnd}
                fill="none"
            />
        </g>
    );
}

// Custom Orthogonal Edge Component for assignment edges
function CustomOrthogonalEdge({
                                  id,
                                  sourceX,
                                  sourceY,
                                  targetX,
                                  targetY,
                                  sourcePosition,
                                  targetPosition,
                                  style = {},
                                  data,
                                  markerEnd,
                              }: any) {
    // Different horizontal offsets for different edge types
    const horizontalOffset = 50;
    const nodeHeight = 40; // Approximate node height
    const nodePadding = 10; // Padding around node for border routing

    // Determine direction based on handle positions
    const sourceDirection = sourcePosition === Position.Left ? -1 : 1; // -1 for left, 1 for right
    const targetDirection = targetPosition === Position.Left ? -1 : 1; // -1 for left, 1 for right

    // Check if this is a UA->PC assignment (special routing case)
    const isUAToPCAssignment = data?.sourceNodeType === 'UA' && data?.targetNodeType === 'PC';

    // Calculate intermediate points based on handle directions
    const midX1 = sourceX + horizontalOffset * sourceDirection;

    let path: string;
    let labelX: number, labelY: number;

    if (isUAToPCAssignment && sourceDirection === 1 && targetDirection === 1) {
        // Special routing for UA->PC: go right, then along top border, then down to handle
        const pcTopY = targetY - nodeHeight / 2 - nodePadding;
        const pcRightX = targetX + nodePadding; // Just past the PC node edge

        path = `M ${sourceX},${sourceY} L ${midX1},${sourceY} L ${midX1},${pcTopY} L ${pcRightX},${pcTopY} L ${pcRightX},${targetY} L ${targetX},${targetY}`;
        labelX = (midX1 + pcRightX) / 2;
        labelY = pcTopY - 10;
    } else {
        // Standard orthogonal routing for other cases
        let midX2: number;
        if (targetDirection === 1) {
            // Target handle is on the right - approach from the right
            midX2 = Math.max(midX1, targetX + Math.min(horizontalOffset, Math.abs(midX1 - targetX)));
        } else {
            // Target handle is on the left - approach from the left
            midX2 = Math.min(midX1, targetX - Math.min(horizontalOffset, Math.abs(midX1 - targetX)));
        }

        path = `M ${sourceX},${sourceY} L ${midX1},${sourceY} L ${midX1},${targetY} L ${midX2},${targetY} L ${targetX},${targetY}`;
        labelX = (midX1 + midX2) / 2;
        labelY = targetY - 10;
    }

    return (
        <g>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={path}
                markerEnd={markerEnd}
                fill="none"
            />
        </g>
    );
}

// Node types for ReactFlow - will be set dynamically based on configuration
const getNodeTypes = (config: 'original' | 'simplified') => ({
    dagNode: config === 'original' ? CustomDAGNode : SimplifiedDAGNode,
});

// Edge types for ReactFlow - will be set dynamically based on configuration
const getEdgeTypes = (config: 'original' | 'simplified') => ({
    customOrthogonal: config === 'original' ? CustomOrthogonalEdge : SimpleStraightEdge,
    customAssociation: CustomAssociationEdge, // Used for original config
    straight: SimpleStraightEdge,
    // Note: 'default' type is built into ReactFlow for bezier edges
});

// Edge types with specific styling
const getEdgeStyle = (
    edgeType: 'assignment' | 'association',
    isHighlighted: boolean,
    isObjectDag: boolean
) => {
    // If edge is highlighted, use O blue color for object-side and U red color for user-side
    if (isHighlighted) {
        return {
            stroke: isObjectDag
                ? getNodeTypeColorFromTheme(NodeType.O)
                : getNodeTypeColorFromTheme(NodeType.U),
            strokeWidth: 4,
            strokeDasharray: 'none',
        };
    }

    if (edgeType === 'assignment') {
        return {
            stroke: 'black',
            strokeWidth: 2,
            strokeDasharray: 'none',
        };
    }
    return {
        stroke: 'var(--mantine-color-green-7)',
        strokeWidth: 2,
        strokeDasharray: '5,5',
    };
};

const getEdgeType = (edgeType: 'assignment' | 'association', config: 'original' | 'simplified' = 'original') => {
    if (edgeType === 'assignment') {
        return config === 'original' ? 'customOrthogonal' : 'straight';
    }
    // Association edges: custom routing for original, default bezier for simplified
    return config === 'original' ? 'customAssociation' : 'default';
};

const getMarkerEnd = (
    edgeType: 'assignment' | 'association',
    isHighlighted: boolean,
    isObjectDag: boolean
) => {
    // If edge is highlighted, use O blue color for object-side and U red color for user-side
    if (isHighlighted) {
        return {
            type: MarkerType.ArrowClosed,
            color: isObjectDag
                ? getNodeTypeColorFromTheme(NodeType.O)
                : getNodeTypeColorFromTheme(NodeType.U),
            width: 10,
            height: 10,
        };
    }

    return {
        type: MarkerType.ArrowClosed,
        color: edgeType === 'assignment' ? 'black' : 'var(--mantine-color-green-7)',
        width: 10,
        height: 10,
    };
};

const initialGraphJson = {
    "graph": {
        "pcs": [
            {
                "id": 1,
                "name": "Status"
            },
            {
                "id": 2,
                "name": "Account"
            },
            {
                "id": 3,
                "name": "RBAC"
            }
        ],
        "uas": [
            {

                "id": 4,
                "name": "Technical Point of Contact",
                "assignments": [

                ],
                "associations": [
                    {
                        "target": 14,
                        "arset": [
                            "read_assets"
                        ]
                    },
                    {
                        "target": 11,
                        "arset": [
                            "return_license",
                            "read_swid",
                            "write_swid",
                            "read_license",
                            "read_order",
                            "initiate_order"
                        ]
                    }
                ]
            },
            {
                "id": 5,
                "name": "PENDING",
                "assignments": [

                ]
            },
            {
                "id": 6,
                "name": "AUTHORIZED",
                "assignments": [

                ],
                "associations": [
                    {
                        "target": 12,
                        "arset": [
                            "*"
                        ]
                    },
                    {
                        "target": 13,
                        "arset": [
                            "*"
                        ]
                    }
                ]
            },
            {
                "id": 7,
                "name": "License Owner",
                "assignments": [

                ],
                "associations": [
                    {
                        "target": 11,
                        "arset": [
                            "read_swid",
                            "read_order"
                        ]
                    },
                    {
                        "target": 14,
                        "arset": [
                            "write_asset",
                            "read_assets",
                            "read_asset_detail"
                        ]
                    }
                ]
            },
            {
                "id": 8,
                "name": "UNAUTHORIZED",
                "assignments": [
                    5
                ]
            },
            {
                "id": 9,
                "name": "Org1MSP_UA",
                "assignments": [

                ]
            },
            {
                "id": 10,
                "name": "Acquisition Officer",
                "assignments": [

                ],
                "associations": [
                    {
                        "target": 11,
                        "arset": [
                            "deny_order",
                            "read_swid",
                            "read_license",
                            "read_order",
                            "approve_order"
                        ]
                    },
                    {
                        "target": 14,
                        "arset": [
                            "read_assets",
                            "read_asset_detail",
                            "allocate_license"
                        ]
                    }
                ]
            }
        ],
        "oas": [
            {
                "id": 11,
                "name": "RBAC/account",
                "assignments": [
                    3
                ]
            },
            {
                "id": 12,
                "name": "Status/asset",
                "assignments": [
                    1
                ]
            },
            {
                "id": 13,
                "name": "Status/account",
                "assignments": [
                    1
                ]
            },
            {
                "id": 14,
                "name": "RBAC/asset",
                "assignments": [
                    3
                ]
            }
        ],
    }
};

const { nodes: initialNodes, edges: initialEdges } = jsonToGraph(initialGraphJson, 'original');

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    return layoutPCOAONodes(nodes, edges);
};

// Helper function to convert DAG Node to TreeNode for AssociationModal
const dagNodeToTreeNode = (dagNode: Node): TreeNode => {
    return {
        id: crypto.randomUUID(),
        pmId: dagNode.id,
        name: dagNode.data.name,
        type: dagNode.data.type,
        properties: {},
        children: [],
        expanded: false,
        selected: false,
    };
};

// Custom layout function for all PM nodes following hierarchical rules
function layoutPCOAONodes(nodes: Node[], edges: Edge[]) {
    // Filter all PM nodes (PC, UA, OA, U, O)
    const filteredNodes = nodes.filter(
        (node) =>
            node.data.type === NodeType.PC ||
            node.data.type === NodeType.UA ||
            node.data.type === NodeType.OA ||
            node.data.type === NodeType.U ||
            node.data.type === NodeType.O
    );

    if (filteredNodes.length === 0) {
        return { nodes, edges };
    }

    // Constants for layout
    const PC_X = 0; // All PCs aligned at x=0 (center)
    const LEVEL_SPACING = 250; // Horizontal spacing between levels
    const NODE_SPACING_Y = 60; // Vertical spacing between nodes

    // Find PC nodes
    const pcNodes = filteredNodes.filter((node) => node.data.type === NodeType.PC);
    const uaNodes = filteredNodes.filter((node) => node.data.type === NodeType.UA);
    const oaNodes = filteredNodes.filter((node) => node.data.type === NodeType.OA);
    const uNodes = filteredNodes.filter((node) => node.data.type === NodeType.U);
    const oNodes = filteredNodes.filter((node) => node.data.type === NodeType.O);

    // Calculate levels for each node from PC nodes
    // Level 0 = PC, Level 1 = nodes that assign directly to PC, etc.
    const getNodeLevel = (nodeId: string): number => {
        if (pcNodes.find((pc) => pc.id === nodeId)) {return 0;} // PC is always at level 0

        // BFS from all PC nodes, following assignment edges backwards (from target to source)
        const queue: Array<{ nodeId: string; level: number }> = [];
        const visited = new Set<string>();

        // Start BFS from all PC nodes
        pcNodes.forEach((pc) => {
            queue.push({ nodeId: pc.id, level: 0 });
        });

        while (queue.length > 0) {
            const { nodeId: currentNodeId, level } = queue.shift()!;

            if (visited.has(currentNodeId)) {continue;}
            visited.add(currentNodeId);

            if (currentNodeId === nodeId) {
                return level;
            }

            // Find nodes that assign to the current node (incoming assignment edges)
            const incomingEdges = edges.filter(
                (edge) => edge.target === currentNodeId && edge.data?.edgeType === 'assignment'
            );

            incomingEdges.forEach((edge) => {
                if (!visited.has(edge.source)) {
                    queue.push({ nodeId: edge.source, level: level + 1 });
                }
            });
        }

        return 1; // Default level if not found in graph
    };

    // Helper function to find which PC a UA/U node has the most association paths to
    const findPrimaryPCForUserNode = (nodeId: string): string | null => {
        const pcPathCounts = new Map<string, number>();

        // Find all association edges from this node
        const associationEdges = edges.filter(
            (edge) => edge.source === nodeId && edge.data?.edgeType === 'association'
        );

        // For each association target, find which PCs it can reach via assignment edges
        associationEdges.forEach((assocEdge) => {
            const targetId = assocEdge.target;

            // BFS from association target to find all reachable PCs via assignment edges
            const queue = [targetId];
            const visited = new Set<string>();

            while (queue.length > 0) {
                const currentNodeId = queue.shift()!;
                if (visited.has(currentNodeId)) {continue;}
                visited.add(currentNodeId);

                // Check if current node is a PC
                const pcNode = pcNodes.find((pc) => pc.id === currentNodeId);
                if (pcNode) {
                    pcPathCounts.set(pcNode.id, (pcPathCounts.get(pcNode.id) || 0) + 1);
                }

                // Find outgoing assignment edges from current node
                const outgoingAssignments = edges.filter(
                    (edge) => edge.source === currentNodeId && edge.data?.edgeType === 'assignment'
                );

                outgoingAssignments.forEach((edge) => {
                    if (!visited.has(edge.target)) {
                        queue.push(edge.target);
                    }
                });
            }
        });

        // Find PC with most paths
        let maxCount = 0;
        let primaryPC = null;

        for (const [pcId, count] of pcPathCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                primaryPC = pcId;
            }
        }

        return primaryPC;
    };

    // Helper function to estimate node width based on text content
    const estimateNodeWidth = (nodeName: string, nodeType: string): number => {
        // Base width for icon and padding
        const baseWidth = 40;
        // Estimate character width (approximate)
        const charWidth = 8;
        // Icon takes about 14px
        const iconWidth = 14;
        // Total estimated width
        return baseWidth + iconWidth + nodeName.length * charWidth;
    };

    // Build object-side subgraphs - find all nodes reachable from each PC via assignment edges
    const findObjectSideReachableNodes = (pcNodeId: string): Set<string> => {
        const reachable = new Set<string>();
        reachable.add(pcNodeId); // PC is part of its own subgraph

        // BFS to find all nodes that can reach this PC through assignment edges
        const queue = [pcNodeId];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentNodeId = queue.shift()!;
            if (visited.has(currentNodeId)) {continue;}
            visited.add(currentNodeId);

            // Find all nodes that assign to the current node
            const incomingEdges = edges.filter(
                (edge) => edge.target === currentNodeId && edge.data?.edgeType === 'assignment'
            );

            incomingEdges.forEach((edge) => {
                const sourceNode = filteredNodes.find((n) => n.id === edge.source);
                // Only include object-side nodes (OA, O) in object-side subgraphs
                if (
                    sourceNode &&
                    (sourceNode.data.type === NodeType.OA || sourceNode.data.type === NodeType.O)
                ) {
                    if (!visited.has(edge.source)) {
                        reachable.add(edge.source);
                        queue.push(edge.source);
                    }
                }
            });
        }

        return reachable;
    };

    // Build user-side subgraphs - group UA/U nodes by their primary PC
    const userSideSubgraphs = new Map<string, Set<string>>();
    const userNodeToPrimaryPC = new Map<string, string>();

    // Assign each UA/U node to their primary PC
    [...uaNodes, ...uNodes].forEach((userNode) => {
        const primaryPC = findPrimaryPCForUserNode(userNode.id);
        if (primaryPC) {
            userNodeToPrimaryPC.set(userNode.id, primaryPC);
            if (!userSideSubgraphs.has(primaryPC)) {
                userSideSubgraphs.set(primaryPC, new Set());
            }
            userSideSubgraphs.get(primaryPC)!.add(userNode.id);
        }
    });

    // Build object-side subgraphs
    const objectSideSubgraphs = new Map<string, Set<string>>();
    const nodeToObjectSubgraph = new Map<string, string>();

    pcNodes.forEach((pc) => {
        const reachableNodes = findObjectSideReachableNodes(pc.id);
        objectSideSubgraphs.set(pc.id, reachableNodes);
    });

    // Assign object-side nodes to subgraphs, prioritizing larger subgraphs
    const pcsByObjectSize = pcNodes.sort((a, b) => {
        const sizeA = objectSideSubgraphs.get(a.id)?.size || 0;
        const sizeB = objectSideSubgraphs.get(b.id)?.size || 0;
        return sizeA - sizeB; // Smallest first
    });

    pcsByObjectSize.forEach((pc) => {
        const reachableNodes = objectSideSubgraphs.get(pc.id) || new Set();
        reachableNodes.forEach((nodeId) => {
            nodeToObjectSubgraph.set(nodeId, pc.id);
        });
    });

    // Calculate subgraph Y positioning and internal node positioning
    const subgraphStartY = new Map<string, number>();
    const objectSubgraphLevelStartY = new Map<string, Map<number, number>>();
    const userSubgraphLevelStartY = new Map<string, Map<number, number>>();
    let globalCumulativeY = 0;

    // Sort PC nodes by total subgraph size (object + user side)
    const sortedPCs = pcNodes.sort((a, b) => {
        const objectSizeA = objectSideSubgraphs.get(a.id)?.size || 0;
        const userSizeA = userSideSubgraphs.get(a.id)?.size || 0;
        const totalSizeA = objectSizeA + userSizeA;

        const objectSizeB = objectSideSubgraphs.get(b.id)?.size || 0;
        const userSizeB = userSideSubgraphs.get(b.id)?.size || 0;
        const totalSizeB = objectSizeB + userSizeB;

        return totalSizeA - totalSizeB; // Ascending order (smallest first)
    });

    sortedPCs.forEach((pc) => {
        // Object-side nodes for this PC
        const objectSubgraphNodes = Array.from(objectSideSubgraphs.get(pc.id) || [])
            .map((nodeId) => filteredNodes.find((n) => n.id === nodeId))
            .filter(Boolean) as Node[];

        const objectNodesByLevel = new Map<number, Node[]>();
        const objectSideNodesInSubgraph = objectSubgraphNodes.filter(
            (node) => node.data.type === NodeType.OA || node.data.type === NodeType.O
        );

        objectSideNodesInSubgraph.forEach((node) => {
            const level = getNodeLevel(node.id);
            if (!objectNodesByLevel.has(level)) {
                objectNodesByLevel.set(level, []);
            }
            objectNodesByLevel.get(level)!.push(node);
        });

        // User-side nodes for this PC
        const userSubgraphNodes = Array.from(userSideSubgraphs.get(pc.id) || [])
            .map((nodeId) => filteredNodes.find((n) => n.id === nodeId))
            .filter(Boolean) as Node[];

        const userNodesByLevel = new Map<number, Node[]>();
        userSubgraphNodes.forEach((node) => {
            const level = getNodeLevel(node.id);
            if (!userNodesByLevel.has(level)) {
                userNodesByLevel.set(level, []);
            }
            userNodesByLevel.get(level)!.push(node);
        });

        // Calculate starting Y for this subgraph
        subgraphStartY.set(pc.id, globalCumulativeY);

        // Calculate object-side level starting Y within this subgraph
        const objectLevelStartY = new Map<number, number>();
        let objectSubgraphCumulativeY = globalCumulativeY;

        const sortedObjectLevels = Array.from(objectNodesByLevel.keys()).sort((a, b) => a - b);

        sortedObjectLevels.forEach((level) => {
            objectLevelStartY.set(level, objectSubgraphCumulativeY);
            const nodesInLevel = objectNodesByLevel.get(level)?.length || 0;
            if (nodesInLevel > 0) {
                objectSubgraphCumulativeY -= nodesInLevel * NODE_SPACING_Y;
            }
        });

        objectSubgraphLevelStartY.set(pc.id, objectLevelStartY);

        // Calculate user-side level starting Y within this subgraph
        const userLevelStartY = new Map<number, number>();
        let userSubgraphCumulativeY = globalCumulativeY;

        const sortedUserLevels = Array.from(userNodesByLevel.keys()).sort((a, b) => a - b);

        sortedUserLevels.forEach((level) => {
            userLevelStartY.set(level, userSubgraphCumulativeY);
            const nodesInLevel = userNodesByLevel.get(level)?.length || 0;
            if (nodesInLevel > 0) {
                userSubgraphCumulativeY -= nodesInLevel * NODE_SPACING_Y;
            }
        });

        userSubgraphLevelStartY.set(pc.id, userLevelStartY);

        // Calculate the total subgraph height
        const topOfObjectSubgraph = objectSubgraphCumulativeY;
        const topOfUserSubgraph = userSubgraphCumulativeY;
        const topOfSubgraph = Math.min(topOfObjectSubgraph, topOfUserSubgraph);
        const bottomOfSubgraph = globalCumulativeY + NODE_SPACING_Y; // PC node position

        // Update global cumulative Y to position next subgraph
        globalCumulativeY = topOfSubgraph - 30; // 30px spacing between subgraphs
    });

    // Position nodes based on their type and level
    const layoutedNodes = [...nodes]; // Copy all original nodes

    filteredNodes.forEach((node) => {
        const level = getNodeLevel(node.id);
        const isUserSide = node.data.type === NodeType.UA || node.data.type === NodeType.U;
        const isObjectSide = node.data.type === NodeType.OA || node.data.type === NodeType.O;
        const isPC = node.data.type === NodeType.PC;

        let x: number;
        let y: number = 0; // Default Y position

        if (isPC) {
            // Center PC nodes by offsetting by half their width
            const nodeWidth = estimateNodeWidth(node.data.name, node.data.type);
            x = PC_X - nodeWidth / 2; // PC nodes centered at PC_X

            // PC nodes are positioned below their subgraph's starting Y
            y = (subgraphStartY.get(node.id) || 0) + NODE_SPACING_Y;
        } else if (isUserSide) {
            // For user-side nodes, align right edges at the level position
            const rightEdgeX = PC_X - level * LEVEL_SPACING;
            const nodeWidth = estimateNodeWidth(node.data.name, node.data.type);
            x = rightEdgeX - nodeWidth; // Position so right edge aligns

            // User-side nodes use their primary PC's subgraph positioning
            const primaryPC = userNodeToPrimaryPC.get(node.id);
            if (primaryPC) {
                const subgraphLevels = userSubgraphLevelStartY.get(primaryPC);
                if (subgraphLevels) {
                    const levelStartingY = subgraphLevels.get(level) || 0;

                    // Find this node's position within its level in the user subgraph
                    const userNodesAtLevel = Array.from(userSideSubgraphs.get(primaryPC) || [])
                        .map((nodeId) => filteredNodes.find((n: Node) => n.id === nodeId))
                        .filter(Boolean) as Node[];

                    const nodesAtSameLevel = userNodesAtLevel.filter(
                        (n: Node) => getNodeLevel(n.id) === level
                    );

                    const nodeIndexAtLevel = nodesAtSameLevel.findIndex((n: Node) => n.id === node.id);
                    y = levelStartingY - nodeIndexAtLevel * NODE_SPACING_Y;
                } else {
                    // Fallback to subgraph starting Y
                    y = subgraphStartY.get(primaryPC) || 0;
                }
            } else {
                // Fallback for nodes without primary PC
                y = 0;
            }
        } else if (isObjectSide) {
            x = PC_X + level * LEVEL_SPACING; // Object-side nodes to the right (left-aligned)

            // Calculate Y position for object-side nodes within their subgraph
            const subgraphId = nodeToObjectSubgraph.get(node.id);
            if (subgraphId) {
                const subgraphLevels = objectSubgraphLevelStartY.get(subgraphId);
                if (subgraphLevels) {
                    const levelStartingY = subgraphLevels.get(level) || 0;

                    // Find this node's position within its level in the subgraph
                    const subgraphNodes = Array.from(objectSideSubgraphs.get(subgraphId) || [])
                        .map((nodeId) => filteredNodes.find((n: Node) => n.id === nodeId))
                        .filter(Boolean) as Node[];

                    const objectNodesAtLevel = subgraphNodes.filter(
                        (n: Node) =>
                            (n.data.type === NodeType.OA || n.data.type === NodeType.O) &&
                            getNodeLevel(n.id) === level
                    );

                    const nodeIndexAtLevel = objectNodesAtLevel.findIndex((n: Node) => n.id === node.id);
                    y = levelStartingY - nodeIndexAtLevel * NODE_SPACING_Y;
                }
            }
        } else {
            x = PC_X; // Fallback to center
        }

        const nodeIndex = layoutedNodes.findIndex((n) => n.id === node.id);
        if (nodeIndex !== -1) {
            layoutedNodes[nodeIndex].position = {
                x,
                y,
            };
        }
    });

    return { nodes: layoutedNodes, edges };
}

function DAGContent() {
    const { themeMode, toggleTheme } = useTheme();
    const mantineTheme = useMantineTheme();
    const [handleConfig, setHandleConfig] = useState<'original' | 'simplified'>('original');
    
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeType, setNewNodeType] = useState<NodeType>(NodeType.PC);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
    const [connectingHandleType, setConnectingHandleType] = useState<
        'assignment' | 'association' | null
    >(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [highlightType, setHighlightType] = useState<'user' | 'object' | null>(null);
    const { screenToFlowPosition, fitView } = useReactFlow();

    // Association modal state
    const [associationModalOpen, setAssociationModalOpen] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

    // Context menu and inline creation state
    const [contextMenuOpened, setContextMenuOpened] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [downloadMenuOpened, setDownloadMenuOpened] = useState(false);
    const [jsonModalOpened, setJsonModalOpened] = useState(false);
    const [inlineTextBox, setInlineTextBox] = useState<{
        visible: boolean;
        screenPosition: { x: number; y: number }; // Screen position for text input
        flowPosition: { x: number; y: number }; // Flow position for node creation
        nodeType: NodeType;
    }>({
        visible: false,
        screenPosition: { x: 0, y: 0 },
        flowPosition: { x: 0, y: 0 },
        nodeType: NodeType.PC,
    });
    const [inlineText, setInlineText] = useState('');
    const inlineInputRef = useRef<HTMLInputElement>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const downloadMenuRef = useRef<HTMLDivElement>(null);
    const [jsonEditValue, setJsonEditValue] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Memoize node and edge types to prevent React Flow warnings
    const nodeTypes = useMemo(() => getNodeTypes(handleConfig), [handleConfig]);
    const edgeTypes = useMemo(() => getEdgeTypes(handleConfig), [handleConfig]);

    // Update existing edges when handle configuration changes
    useEffect(() => {
        setEdges((currentEdges) => {
            return currentEdges.map((edge) => ({
                ...edge,
                type: getEdgeType(edge.data?.edgeType || 'assignment', handleConfig),
            }));
        });
    }, [handleConfig, setEdges]);

    const formatGraph = useCallback(
        (nodesToFormat: Node[], edgesToUse: Edge[]) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                nodesToFormat,
                edgesToUse
            );
            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);

            // Longer delay and more padding to ensure proper fit
            setTimeout(() => fitView({ padding: 0.3 }), 300);
        },
        [setNodes, setEdges, fitView]
    );

    // Format graph only on initial load
    useEffect(() => {
        if (initialNodes.length > 0) {
            formatGraph(initialNodes, initialEdges);
            // Ensure fit view happens after formatting
            setTimeout(() => {
                fitView({ padding: 0.3 });
            }, 400);
        }
    }, [formatGraph, fitView]); // Empty dependency array ensures this only runs once on mount

    const onConnectStart = useCallback(
        (event: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
            setConnectingNodeId(params.nodeId || null);

            // Determine handle type from the handleId
            if (params.handleId?.includes('assignment')) {
                setConnectingHandleType('assignment');
            } else if (params.handleId?.includes('association')) {
                setConnectingHandleType('association');
            }

            // Hide incompatible handles
            const handleClass = params.handleId?.includes('assignment') ? 'assignment' : 'association';
            const oppositeClass = handleClass === 'assignment' ? 'association' : 'assignment';

            // Show only compatible target handles
            document.querySelectorAll(`.handle.${oppositeClass}-in`).forEach((handle) => {
                (handle as HTMLElement).style.opacity = '0.3';
            });
            document.querySelectorAll(`.handle.${handleClass}-in`).forEach((handle) => {
                (handle as HTMLElement).style.opacity = '1';
            });
        },
        []
    );

    const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
        setConnectingNodeId(null);
        setConnectingHandleType(null);

        // Reset all handle visibility
        document.querySelectorAll('.handle').forEach((handle) => {
            (handle as HTMLElement).style.opacity = '1';
        });
    }, []);

    const onConnect = useCallback(
        (params: Connection) => {
            // Validate connection compatibility
            const sourceIsAssignment = params.sourceHandle?.includes('assignment');
            const targetIsAssignment = params.targetHandle?.includes('assignment');
            const sourceIsAssociation = params.sourceHandle?.includes('association');
            const targetIsAssociation = params.targetHandle?.includes('association');

            // Prevent mixed connections
            if (
                (sourceIsAssignment && !targetIsAssignment) ||
                (sourceIsAssociation && !targetIsAssociation) ||
                (!sourceIsAssignment && targetIsAssignment) ||
                (!sourceIsAssociation && targetIsAssociation)
            ) {
                console.warn(
                    'Invalid connection: Assignment handles can only connect to assignment handles, and association handles can only connect to association handles'
                );
                return;
            }

            // Determine edge type based on handles
            let edgeType: 'assignment' | 'association' = 'assignment';

            if (
                params.sourceHandle?.includes('association') ||
                params.targetHandle?.includes('association')
            ) {
                edgeType = 'association';
            }

            // Additional validation for assignment edges using Policy Machine rules
            if (edgeType === 'assignment') {
                const sourceNode = nodes.find((n) => n.id === params.source);
                const targetNode = nodes.find((n) => n.id === params.target);

                if (sourceNode && targetNode) {
                    if (!isValidAssignment(sourceNode.data.type, targetNode.data.type)) {
                        console.warn(
                            `Invalid assignment: ${sourceNode.data.type} (${sourceNode.data.name}) cannot be assigned to ${targetNode.data.type} (${targetNode.data.name})`
                        );
                        return;
                    }
                }
            }

            // For association edges, show modal to select access rights
            if (edgeType === 'association') {
                setPendingConnection(params);
                setAssociationModalOpen(true);
                return;
            }

            // For assignment edges, create directly
            const sourceNode = nodes.find((n) => n.id === params.source);
            const targetNode = nodes.find((n) => n.id === params.target);

            const newEdge = {
                ...params,
                type: getEdgeType(edgeType, handleConfig),
                data: {
                    edgeType,
                    sourceNodeType: sourceNode?.data.type,
                    targetNodeType: targetNode?.data.type,
                },
                style: getEdgeStyle(edgeType, false, false),
                markerEnd: getMarkerEnd(edgeType, false, false),
            };

            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, nodes, handleConfig]
    );

    // Handle association modal submission
    const handleAssociationModalSubmit = useCallback(
        (accessRights: string[]) => {
            if (!pendingConnection) {return;}

            const accessRightsLabel = accessRights.length > 0 ? accessRights.join(', ') : '';
            const sourceNode = nodes.find((n) => n.id === pendingConnection.source);
            const targetNode = nodes.find((n) => n.id === pendingConnection.target);

            const newEdge = {
                ...pendingConnection,
                type: getEdgeType('association', handleConfig),
                data: {
                    edgeType: 'association' as const,
                    accessRights: accessRightsLabel,
                    sourceNodeType: sourceNode?.data.type,
                    targetNodeType: targetNode?.data.type,
                },
                style: getEdgeStyle('association', false, false),
                markerEnd: getMarkerEnd('association', false, false),
                label: accessRightsLabel,
                labelStyle: {
                    fontSize: '12px',
                    fontWeight: 600,
                    fill: 'black',
                },
                labelBgStyle: {
                    fill: 'white',
                    fillOpacity: 0.8,
                    stroke: 'var(--mantine-color-green-7)',
                    strokeWidth: 1,
                },
            };

            setEdges((eds) => addEdge(newEdge, eds));
            setPendingConnection(null);
            setAssociationModalOpen(false);
        },
        [pendingConnection, setEdges, nodes, handleConfig]
    );

    // Handle association modal close
    const handleAssociationModalClose = useCallback(() => {
        setPendingConnection(null);
        setAssociationModalOpen(false);
    }, []);

    const addNode = useCallback(() => {
        const newNode: Node = {
            id: `${Date.now()}`, // Use timestamp for unique ID
            type: 'dagNode',
            position: {
                x: Math.random() * 400 + 50,
                y: Math.random() * 400 + 50,
            },
            data: {
                name: newNodeName || `${newNodeType} ${nodes.length + 1}`,
                type: newNodeType,
            },
        };
        setNodes((nds) => nds.concat(newNode));
        setIsModalOpen(false);
        setNewNodeName('');
        setNewNodeType(NodeType.PC);
    }, [nodes.length, newNodeName, newNodeType, setNodes]);

    const clearGraph = useCallback(() => {
        setNodes([]);
        setEdges([]);
    }, [setNodes, setEdges]);

    const deleteAllNodes = useCallback(() => {
        setNodes([]);
        setEdges([]);
    }, [setNodes, setEdges]);

    const resetGraph = useCallback(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [setNodes, setEdges]);

    // Handle node click to highlight outgoing paths with specific logic for U/UA and O/OA nodes
    const onNodeClick = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.stopPropagation();
            // Toggle selection - if same node clicked again, deselect
            const newSelectedNodeId = selectedNodeId === node.id ? null : node.id;
            setSelectedNodeId(newSelectedNodeId);

            if (!newSelectedNodeId) {
                // Clear all highlighting
                setHighlightType(null);
                setEdges((currentEdges) => {
                    return currentEdges.map((edge) => ({
                        ...edge,
                        style: getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                        markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                    }));
                });
                setNodes((currentNodes) => {
                    return currentNodes.map((n) => ({
                        ...n,
                        data: {
                            ...n.data,
                            isHighlighted: false,
                        },
                    }));
                });
                return;
            }

            const startingNodeType = nodes.find((n) => n.id === newSelectedNodeId)?.data.type;
            const visitedNodes = new Set<string>();
            const highlightedEdges = new Set<string>();
            const associationEdges = new Set<string>();

            visitedNodes.add(newSelectedNodeId);

            if (startingNodeType === NodeType.U || startingNodeType === NodeType.UA) {
                // User node logic: highlight outgoing paths until association edge, including association targets
                const queue: string[] = [newSelectedNodeId];

                while (queue.length > 0) {
                    const currentNodeId = queue.shift()!;
                    const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);

                    outgoingEdges.forEach((edge) => {
                        highlightedEdges.add(edge.id);

                        if (edge.data?.edgeType === 'association') {
                            associationEdges.add(edge.id);
                            // Add association target but don't continue from it
                            if (!visitedNodes.has(edge.target)) {
                                visitedNodes.add(edge.target);
                            }
                        } else {
                            // Assignment edge - continue traversal
                            if (!visitedNodes.has(edge.target)) {
                                visitedNodes.add(edge.target);
                                queue.push(edge.target);
                            }
                        }
                    });
                }
            } else if (startingNodeType === NodeType.O || startingNodeType === NodeType.OA) {
                // Object node logic: highlight outgoing paths that terminate at PC nodes
                const queue: string[] = [newSelectedNodeId];

                while (queue.length > 0) {
                    const currentNodeId = queue.shift()!;
                    const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);

                    outgoingEdges.forEach((edge) => {
                        const targetNode = nodes.find((n) => n.id === edge.target);
                        
                        if (targetNode?.data.type === NodeType.PC) {
                            // This path terminates at a PC - highlight this edge and target
                            highlightedEdges.add(edge.id);
                            if (!visitedNodes.has(edge.target)) {
                                visitedNodes.add(edge.target);
                            }
                        } else {
                            // Continue traversal for non-PC targets
                            highlightedEdges.add(edge.id);
                            if (!visitedNodes.has(edge.target)) {
                                visitedNodes.add(edge.target);
                                queue.push(edge.target);
                            }
                        }
                    });
                }
            }

            // Determine highlight type based on starting node type
            const isUserNode = startingNodeType === NodeType.U || startingNodeType === NodeType.UA;
            const isObjectNode = startingNodeType === NodeType.O || startingNodeType === NodeType.OA;
            
            // Set highlight type for background color
            setHighlightType(isUserNode ? 'user' : isObjectNode ? 'object' : null);

            // Update edges with highlighting - keep original colors but add outline effect via filter
            setEdges((currentEdges) => {
                return currentEdges.map((edge) => {
                    const isHighlighted = highlightedEdges.has(edge.id);
                    const isAssociation = associationEdges.has(edge.id);

                    if (isHighlighted) {
                        const outlineColor = isUserNode ? mantineTheme.colors.red[7] : mantineTheme.colors.blue[7];
                        
                        // For association edges, keep green color and add green outline
                        if (isAssociation) {
                            const greenOutline = mantineTheme.colors.green[7];
                            return {
                                ...edge,
                                style: {
                                    ...getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                                    filter: `drop-shadow(0 0 2px ${greenOutline}) drop-shadow(0 0 4px ${greenOutline})`, // Add green outline glow
                                },
                                markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                            };
                        }

                        // For assignment edges, keep black color but add outline
                        return {
                            ...edge,
                            style: {
                                ...getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                                filter: `drop-shadow(0 0 2px ${outlineColor}) drop-shadow(0 0 4px ${outlineColor})`, // Add outline glow
                            },
                            markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                        };
                    }

                    // Non-highlighted edges stay normal
                    return {
                        ...edge,
                        style: getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                        markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                    };
                });
            });

            // Update nodes with highlighting using appropriate color
            setNodes((currentNodes) => {
                return currentNodes.map((n) => ({
                    ...n,
                    data: {
                        ...n.data,
                        isHighlighted: visitedNodes.has(n.id),
                    },
                }));
            });
        },
        [selectedNodeId, setEdges, setNodes, edges, nodes]
    );

    // Handle right-click on canvas
    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
        setContextMenuOpened(true);
        // Hide inline text box if visible
        setInlineTextBox({
            visible: false,
            screenPosition: { x: 0, y: 0 },
            flowPosition: { x: 0, y: 0 },
            nodeType: NodeType.PC,
        });
    }, []);

    // Handle node type selection from context menu
    const handleNodeTypeSelect = useCallback(
        (nodeType: NodeType, event: React.MouseEvent) => {
            setContextMenuOpened(false);

            // Convert screen coordinates to ReactFlow coordinates
            const flowPosition = screenToFlowPosition({
                x: contextMenuPosition.x,
                y: contextMenuPosition.y,
            });

            // Get screen position relative to the ReactFlow container for text input
            const reactFlowBounds = document.querySelector('.react-flow__pane')?.getBoundingClientRect();
            const screenPosition = reactFlowBounds
                ? {
                    x: contextMenuPosition.x - reactFlowBounds.left,
                    y: contextMenuPosition.y - reactFlowBounds.top,
                }
                : { x: 0, y: 0 };

            setInlineTextBox({
                visible: true,
                screenPosition,
                flowPosition,
                nodeType,
            });
            setInlineText('');

            // Focus the input after a brief delay to ensure it's rendered
            setTimeout(() => {
                inlineInputRef.current?.focus();
            }, 10);
        },
        [contextMenuPosition, screenToFlowPosition]
    );

    // Handle inline text input
    const handleInlineKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Enter') {
                if (inlineText.trim()) {
                    // Create node at the inline text box position
                    const newNode: Node = {
                        id: `${Date.now()}`,
                        type: 'dagNode',
                        position: {
                            x: inlineTextBox.flowPosition.x - 40, // Center the node on the click position
                            y: inlineTextBox.flowPosition.y - 20,
                        },
                        data: {
                            name: inlineText.trim(),
                            type: inlineTextBox.nodeType,
                        },
                    };
                    setNodes((nds) => nds.concat(newNode));
                }

                // Hide the text box
                setInlineTextBox({
                    visible: false,
                    screenPosition: { x: 0, y: 0 },
                    flowPosition: { x: 0, y: 0 },
                    nodeType: NodeType.PC,
                });
                setInlineText('');
            } else if (event.key === 'Escape') {
                // Cancel creation
                setInlineTextBox({
                    visible: false,
                    screenPosition: { x: 0, y: 0 },
                    flowPosition: { x: 0, y: 0 },
                    nodeType: NodeType.PC,
                });
                setInlineText('');
            }
        },
        [inlineText, inlineTextBox, setNodes]
    );

    // Handle clicks outside the inline text box and context menu
    const handlePaneClick = useCallback(() => {
        if (inlineTextBox.visible) {
            setInlineTextBox({
                visible: false,
                screenPosition: { x: 0, y: 0 },
                flowPosition: { x: 0, y: 0 },
                nodeType: NodeType.PC,
            });
            setInlineText('');
        }

        // Close context menu if it's open
        if (contextMenuOpened) {
            setContextMenuOpened(false);
        }

        // Close download menu if it's open
        if (downloadMenuOpened) {
            setDownloadMenuOpened(false);
        }

        // Clear node selection and reset edge highlighting
        if (selectedNodeId) {
            setSelectedNodeId(null);
            setHighlightType(null);
            setEdges((currentEdges) => {
                return currentEdges.map((edge) => ({
                    ...edge,
                    style: getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                    markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                }));
            });
            setNodes((currentNodes) => {
                return currentNodes.map((n) => ({
                    ...n,
                    data: {
                        ...n.data,
                        isHighlighted: false,
                    },
                }));
            });
        }
    }, [
        inlineTextBox.visible,
        contextMenuOpened,
        downloadMenuOpened,
        selectedNodeId,
        setEdges,
        setNodes,
    ]);

    // Handle clicks outside download menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                downloadMenuRef.current &&
                event.target &&
                !downloadMenuRef.current.contains(event.target as Element)
            ) {
                setDownloadMenuOpened(false);
            }
        };

        if (downloadMenuOpened) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [downloadMenuOpened]);

    // Download image functionality following ReactFlow best practices
    const downloadImage = useCallback((format: 'png' | 'jpeg' | 'svg') => {
        if (nodes.length === 0) {
            console.warn('No nodes to export');
            return;
        }


        // Use ReactFlow's getRectOfNodes to get proper bounds
        const nodesBounds = getRectOfNodes(nodes);

        // Calculate image dimensions with padding
        const padding = 0.1; // 10% padding
        const imageWidth = nodesBounds.width * (1 + padding * 2);
        const imageHeight = nodesBounds.height * (1 + padding * 2);

        // Calculate transform to center and fit the nodes
        const transform = getTransformForBounds(
            nodesBounds,
            imageWidth,
            imageHeight,
            0.5, // minZoom
            2,   // maxZoom  
            padding
        );

        let downloadFunction;
        let fileExtension;

        switch (format) {
            case 'png':
                downloadFunction = toPng;
                fileExtension = 'png';
                break;
            case 'jpeg':
                downloadFunction = toJpeg;
                fileExtension = 'jpg';
                break;
            case 'svg':
                downloadFunction = toSvg;
                fileExtension = 'svg';
                break;
            default:
                downloadFunction = toPng;
                fileExtension = 'png';
        }

        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
        
        downloadFunction(viewport, {
            backgroundColor: 'transparent',
            width: imageWidth,
            height: imageHeight,
            style: {
                width: `${imageWidth}px`,
                height: `${imageHeight}px`,
                transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
            },
            filter: (node) => {
                // Filter out handle elements
                if (node.classList && node.classList.contains('react-flow__handle')) {
                    return false;
                }
                return true;
            },
        }).then((dataUrl) => {
            const link = document.createElement('a');
            link.download = `dag-graph.${fileExtension}`;
            link.href = dataUrl;
            link.click();
        }).catch((err) => {
            console.error('Error downloading image:', err);
        });
    }, [nodes]);

    useEffect(() => {
        if (jsonModalOpened) {
            setJsonEditValue(graphToJson(nodes, edges));
            setJsonError(null);
        }
    }, [jsonModalOpened]);

    return (
        <AppShell
            header={{ height: 60 }}
            transitionDuration={0}
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <PMIcon style={{width: '36px', height: '36px'}}/>
                        <Title order={2}>Policy Machine</Title>
                    </Group>

                    <NavBar activePageIndex={1} />

                    <Group>
                        <Tooltip label={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}>
                            <ActionIcon
                                variant="subtle"
                                size="md"
                                onClick={toggleTheme}
                            >
                                {themeMode === 'light' ? <IconMoon size={24} /> : <IconSun size={24} />}
                            </ActionIcon>
                        </Tooltip>

                        <UserMenu />
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Main style={{height: "100vh", overflow: "auto"}}>
                <Stack gap={0} style={{ height: '100%' }}>
                    {/* Toolbar */}
                    <Box style={{
                        height: 60,
                        borderBottom: '1px solid var(--mantine-color-gray-3)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                        backgroundColor: 'white'
                    }}>
                        <Group gap="md" align="center">
                            <Stack gap={2} align="left">
                                <Text size="xs" c="dimmed" fw={500}>
                                    DAG Actions
                                </Text>
                                <Group gap="xs">
                                    <ActionIcon
                                        variant="subtle"
                                        size="md"
                                        onClick={() => setDownloadMenuOpened(true)}
                                        title="Download Image"
                                    >
                                        <IconCamera size={20} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        size="md"
                                        onClick={() => setJsonModalOpened(true)}
                                        title="View Graph JSON"
                                    >
                                        <IconJson size={20} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        size="md"
                                        onClick={() => formatGraph(nodes, edges)}
                                        title="Format Graph"
                                    >
                                        <IconSitemap size={20} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        size="md"
                                        onClick={deleteAllNodes}
                                        title="Delete All Nodes"
                                        color="red"
                                    >
                                        <IconTrash size={20} />
                                    </ActionIcon>
                                </Group>
                            </Stack>
                            <Divider orientation="vertical" />
                            <Stack gap={2} align="left">
                                <Text size="xs" c="dimmed" fw={500}>
                                    Handle Style
                                </Text>
                                <ActionIcon
                                    variant={handleConfig === 'simplified' ? "filled" : "subtle"}
                                    size="md"
                                    onClick={() => setHandleConfig(prev => prev === 'original' ? 'simplified' : 'original')}
                                    title={`Switch to ${handleConfig === 'original' ? 'Simplified' : 'Original'} handles`}
                                >
                                    <IconSettings size={20} />
                                </ActionIcon>
                            </Stack>
                        </Group>
                    </Box>

                    {/* ReactFlow Canvas */}
                    <Paper shadow="sm" radius="md" style={{ height: 'calc(100% - 60px)', position: 'relative' }}>
                        <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onConnectStart={onConnectStart}
                                onConnectEnd={onConnectEnd}
                                onNodeClick={onNodeClick}
                                onPaneContextMenu={onPaneContextMenu}
                                onPaneClick={handlePaneClick}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                connectionMode={ConnectionMode.Loose}
                                fitView
                                style={{
                                    backgroundColor: 'var(--mantine-color-gray-0)',
                                }}
                            >
                                <Controls />
                                <MiniMap
                                    position="bottom-right"
                                    style={{
                                        backgroundColor: 'var(--mantine-color-gray-1)',
                                    }}
                                    nodeColor={(node) => {
                                        // Static color mapping to match getTypeColor function
                                        const type = node.data?.type || NodeType.PC;
                                        return getNodeTypeColorFromTheme(type);
                                    }}
                                />
                                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                            </ReactFlow>

                            {/* Download Menu positioned next to toolbar download button */}
                            {downloadMenuOpened && (
                                <div
                                    ref={downloadMenuRef}
                                    style={{
                                        position: 'absolute',
                                        top: 120, // Position below the toolbar
                                        left: 20, // Align with the toolbar buttons
                                        zIndex: 1000,
                                        background: 'white',
                                        border: '1px solid var(--mantine-color-gray-4)',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                        padding: '8px',
                                        minWidth: '150px',
                                    }}
                                    onClick={(e) => e.stopPropagation()} // Prevent menu from closing when clicking inside it
                                >
                                    <div
                                        style={{
                                            marginBottom: '8px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: 'var(--mantine-color-gray-7)',
                                        }}
                                    >
                                        Download Graph Image
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                            onClick={() => {
                                                downloadImage('png');
                                                setDownloadMenuOpened(false);
                                            }}
                                            style={{
                                                padding: '6px 8px',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                borderRadius: '2px',
                                                transition: 'background-color 0.1s',
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)')
                                            }
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            PNG Image
                                        </button>
                                        <button
                                            onClick={() => {
                                                downloadImage('jpeg');
                                                setDownloadMenuOpened(false);
                                            }}
                                            style={{
                                                padding: '6px 8px',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                borderRadius: '2px',
                                                transition: 'background-color 0.1s',
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)')
                                            }
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            JPEG Image
                                        </button>
                                        <button
                                            onClick={() => {
                                                downloadImage('svg');
                                                setDownloadMenuOpened(false);
                                            }}
                                            style={{
                                                padding: '6px 8px',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                borderRadius: '2px',
                                                transition: 'background-color 0.1s',
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)')
                                            }
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            SVG Vector
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Inline text input for node creation */}
                        {inlineTextBox.visible && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: inlineTextBox.screenPosition.x,
                                    top: inlineTextBox.screenPosition.y,
                                    zIndex: 1000,
                                    pointerEvents: 'auto',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <TextInput
                                    ref={inlineInputRef}
                                    value={inlineText}
                                    onChange={(event) => setInlineText(event.currentTarget.value)}
                                    onKeyDown={handleInlineKeyDown}
                                    placeholder={`Enter ${inlineTextBox.nodeType} name`}
                                    size="xs"
                                    style={{
                                        width: 150,
                                        background: 'white',
                                        border: `2px solid ${getNodeTypeColorFromTheme(inlineTextBox.nodeType)}`,
                                        borderRadius: 4,
                                    }}
                                    styles={{
                                        input: {
                                            fontSize: '12px',
                                            padding: '4px 8px',
                                        },
                                    }}
                                />
                            </div>
                        )}
                    </Paper>
                </Stack>

                {/* Context Menu for Right-Click Node Creation */}
                <Menu
                    opened={contextMenuOpened}
                    onClose={() => setContextMenuOpened(false)}
                    position="bottom-start"
                    shadow="md"
                    withinPortal
                    styles={{
                        dropdown: {
                            position: 'fixed',
                            left: contextMenuPosition.x,
                            top: contextMenuPosition.y,
                            zIndex: 9999,
                        },
                    }}
                >
                    <Menu.Target>
                        <div style={{ display: 'none' }} />
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Label>Create Node</Menu.Label>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.PC} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.PC, e)}
                        >
                            Policy Class (PC)
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.UA} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.UA, e)}
                        >
                            User Attribute (UA)
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.OA} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.OA, e)}
                        >
                            Object Attribute (OA)
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.U} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.U, e)}
                        >
                            User (U)
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.O} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.O, e)}
                        >
                            Object (O)
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                <Modal
                    opened={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Add New Node"
                    centered
                >
                    <Stack gap="md">
                        <TextInput
                            label="Node Name"
                            placeholder="Enter node name"
                            value={newNodeName}
                            onChange={(event) => setNewNodeName(event.currentTarget.value)}
                        />
                        <Select
                            label="Node Type"
                            placeholder="Select node type"
                            value={newNodeType}
                            onChange={(value) => setNewNodeType((value as NodeType) || NodeType.PC)}
                            data={[
                                { value: NodeType.PC, label: 'Policy Class (PC)' },
                                { value: NodeType.UA, label: 'User Attribute (UA)' },
                                { value: NodeType.OA, label: 'Object Attribute (OA)' },
                                { value: NodeType.U, label: 'User (U)' },
                                { value: NodeType.O, label: 'Object (O)' },
                            ]}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="light" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={addNode}>Add Node</Button>
                        </Group>
                    </Stack>
                </Modal>

                <Modal
                    opened={jsonModalOpened}
                    onClose={() => setJsonModalOpened(false)}
                    title="Graph JSON"
                    centered
                    size="lg"
                >
                    <Stack gap="md">
                        <Textarea
                            minRows={12}
                            maxRows={20}
                            autosize
                            value={jsonEditValue}
                            onChange={(e) => setJsonEditValue(e.currentTarget.value)}
                            style={{ fontFamily: 'monospace', fontSize: 10 }}
                            spellCheck={false}
                        />
                        {jsonError && (
                            <Text c="red" size="sm">
                                {jsonError}
                            </Text>
                        )}
                        <Group justify="flex-end" mt="md">
                            <Button
                                variant="light"
                                onClick={() => {
                                    navigator.clipboard.writeText(jsonEditValue);
                                }}
                            >
                                Copy to Clipboard
                            </Button>
                            <Button
                                color="blue"
                                onClick={() => {
                                    try {
                                        const parsed = JSON.parse(jsonEditValue);
                                        const { nodes: newNodes, edges: newEdges } = jsonToGraph(parsed, handleConfig);
                                        setEdges(newEdges);
                                        formatGraph(newNodes, newEdges);
                                        setJsonModalOpened(false);
                                        setJsonError(null);
                                    } catch (err: any) {
                                        setJsonError(`Invalid JSON: ${err?.message || err}`);
                                    }
                                }}
                            >
                                Apply
                            </Button>
                        </Group>
                    </Stack>
                </Modal>

                {/* Association Modal for creating association edges with access rights */}
                {pendingConnection && (
                    <AssociationModal
                        opened={associationModalOpen}
                        onClose={handleAssociationModalClose}
                        mode="create"
                        node={dagNodeToTreeNode(nodes.find((n) => n.id === pendingConnection.target)!)}
                        selectedUserNode={dagNodeToTreeNode(
                            nodes.find((n) => n.id === pendingConnection.source)!
                        )}
                        selectedTargetNode={dagNodeToTreeNode(
                            nodes.find((n) => n.id === pendingConnection.target)!
                        )}
                        isUserTree={false}
                        onCustomSubmit={handleAssociationModalSubmit}
                    />
                )}
            </AppShell.Main>
        </AppShell>
    );
}

export function DAG() {
    return (
        <ReactFlowProvider>
            <DAGContent />
        </ReactFlowProvider>
    );
}