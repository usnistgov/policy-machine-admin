import React, { useCallback, useState, useRef, useEffect } from 'react';
import { AppShell, Button, Group, Paper, Stack, Text, TextInput, Modal, Select, Menu, Textarea } from '@mantine/core';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { NavBar } from '@/components/navbar/NavBar';
import { UserMenu } from '@/components/UserMenu';
import classes from './navbar.module.css';
import {
  ReactFlow,
  MiniMap,
  Controls,
  ControlButton,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
  ConnectionMode,
  OnConnectStartParams,
  OnConnectEnd,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodeType } from '@/api/pdp.api';
import { NodeIcon, isValidAssignment } from '@/components/tree/util';
import { useMantineTheme } from '@mantine/core';
import { IconCamera, IconJson, IconSitemap } from '@tabler/icons-react';
import dagre from 'dagre';
import { layout } from '@/components/dag/Graph';

const getNodeTypeColorFromTheme = (type: string) => {
  switch (type) {
    case NodeType.PC: return '#00973c'; // theme.colors.green[9]
    case NodeType.UA: return '#9f003e'; // theme.colors.red[9]
    case NodeType.OA: return '#0043b5'; // theme.colors.blue[9]
    case NodeType.U: return '#e3366c'; // theme.colors.red[4]
    case NodeType.O: return '#3884fe'; // theme.colors.blue[4]
    default: return '#adb5bd'; // theme.colors.gray[5]
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
  const pcs = nodes.filter(n => n.data.type === NodeType.PC).map(n => ({
    id: parseId(n.id),
    name: n.data.name,
    properties: [],
  }));
  const uas = nodes.filter(n => n.data.type === NodeType.UA).map(n => ({
    id: parseId(n.id),
    name: n.data.name,
    assignments: edges.filter(e => e.data?.edgeType === 'assignment' && e.source === n.id).map(e => parseId(e.target)),
    associations: edges.filter(e => e.data?.edgeType === 'association' && e.source === n.id).map(e => ({
      target: parseId(e.target),
      arset: [], // No access rights in edge data; stub as empty array
    })),
    properties: [],
  }));
  const oas = nodes.filter(n => n.data.type === NodeType.OA).map(n => ({
    id: parseId(n.id),
    name: n.data.name,
    assignments: edges.filter(e => e.data?.edgeType === 'assignment' && e.source === n.id).map(e => parseId(e.target)),
    properties: [],
  }));
  const users = nodes.filter(n => n.data.type === NodeType.U).map(n => ({
    id: parseId(n.id),
    name: n.data.name,
    assignments: edges.filter(e => e.data?.edgeType === 'assignment' && e.source === n.id).map(e => parseId(e.target)),
    properties: [],
  }));
  const objects = nodes.filter(n => n.data.type === NodeType.O).map(n => ({
    id: parseId(n.id),
    name: n.data.name,
    assignments: edges.filter(e => e.data?.edgeType === 'assignment' && e.source === n.id).map(e => parseId(e.target)),
    properties: [],
  }));

  return JSON.stringify({
    graph: { pcs, uas, oas, users, objects }
  }, null, 2);
}

// Converts Policy Machine JSON schema's 'graph' element to nodes and edges arrays
function jsonToGraph(json: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  if (!json || !json.graph) {return { nodes, edges };}
  const { pcs = [], uas = [], oas = [], users = [], objects = [] } = json.graph;

  // Helper to make string IDs (for ReactFlow)
  const idStr = (id: any) => String(id);

  // Add all nodes
  (pcs as any[]).forEach((n: any) => nodes.push({ id: idStr(n.id), type: 'dagNode', position: { x: 0, y: 0 }, data: { name: n.name, type: NodeType.PC } }));
  (uas as any[]).forEach((n: any) => nodes.push({ id: idStr(n.id), type: 'dagNode', position: { x: 0, y: 0 }, data: { name: n.name, type: NodeType.UA } }));
  (oas as any[]).forEach((n: any) => nodes.push({ id: idStr(n.id), type: 'dagNode', position: { x: 0, y: 0 }, data: { name: n.name, type: NodeType.OA } }));
  (users as any[]).forEach((n: any) => nodes.push({ id: idStr(n.id), type: 'dagNode', position: { x: 0, y: 0 }, data: { name: n.name, type: NodeType.U } }));
  (objects as any[]).forEach((n: any) => nodes.push({ id: idStr(n.id), type: 'dagNode', position: { x: 0, y: 0 }, data: { name: n.name, type: NodeType.O } }));

  // Add assignment edges (source = node.id, target = assignment id)
  const addAssignmentEdges = (arr: any[], type: string) => {
    arr.forEach((n: any) => {
      if (Array.isArray(n.assignments)) {
        n.assignments.forEach((targetId: any) => {
          edges.push({
            id: `e${n.id}-${targetId}`,
            source: idStr(n.id),
            target: idStr(targetId),
            type: getEdgeType('assignment'),
            sourceHandle: 'assignment-out',
            targetHandle: 'assignment-in',
            data: { edgeType: 'assignment' },
            style: getEdgeStyle('assignment', false, false),
            markerEnd: getMarkerEnd('assignment', false, false),
          } as Edge);
        });
      }
    });
  };
  addAssignmentEdges(uas as any[], 'UA');
  addAssignmentEdges(oas as any[], 'OA');
  addAssignmentEdges(users as any[], 'U');
  addAssignmentEdges(objects as any[], 'O');

  // Add association edges (UA only)
  (uas as any[]).forEach((n: any) => {
    if (Array.isArray(n.associations)) {
      n.associations.forEach((assoc: any, i: number) => {
        edges.push({
          id: `a${n.id}-${assoc.target}-${i}`,
          source: idStr(n.id),
          target: idStr(assoc.target),
          type: getEdgeType('association'),
          sourceHandle: 'association-out',
          targetHandle: 'association-in',
          data: { edgeType: 'association' },
          style: getEdgeStyle('association', false, false),
          markerEnd: getMarkerEnd('association', false, false),
        } as Edge);
      });
    }
  });

  return { nodes, edges };
}

function createHandle(data: any, id: string, handleType: 'target' | 'source', position: Position, top: string, right: string, bottom: string, left: string) {
  const nodeType = data.type;

  let color;
  if (id.startsWith('assignment')) {
    color = 'black';
  } else {
    color = 'var(--mantine-color-green-7)';
  }

  return (
      (
          <Handle
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
      )
  )
}

// Custom Node Component with specific handles
function CustomDAGNode({ data, selected }: NodeProps) {
  const theme = useMantineTheme();
  const nodeType = data.type;
  const typeColor = getNodeTypeColorFromTheme(nodeType);
  const isHighlighted = data.isHighlighted;
  
  // Determine which handles to show based on node type
  const showAssignmentIn = nodeType === NodeType.PC || nodeType === NodeType.UA || nodeType === NodeType.OA;
  const showAssignmentOut = nodeType === NodeType.UA || nodeType === NodeType.OA || nodeType === NodeType.U || nodeType === NodeType.O;
  const showAssociationIn = nodeType === NodeType.UA || nodeType === NodeType.OA || nodeType === NodeType.O;
  const showAssociationOut = nodeType === NodeType.UA;
  
  // Determine highlight color based on node type
  const highlightColor = nodeType === NodeType.PC 
    ? getNodeTypeColorFromTheme(NodeType.PC)  // Green for PC
    : nodeType === NodeType.UA 
    ? getNodeTypeColorFromTheme(NodeType.UA)  // Red for UA
    : nodeType === NodeType.OA || nodeType === NodeType.O
    ? getNodeTypeColorFromTheme(NodeType.OA)  // Blue for OA/O
    : getNodeTypeColorFromTheme(NodeType.U);  // Red for U
  
  return (
    <div 
      style={{
        background: 'transparent',
        borderRadius: 6,
        border: `2px solid ${typeColor}`,
        padding: '6px 4px',
        fontSize: '14px',
        color: 'black',
        boxShadow: isHighlighted ? `0 0 0 3px ${highlightColor}` : (selected ? `0 0 0 2px ${typeColor}` : 'none'),
        whiteSpace: 'nowrap',
      }}
    >
        {nodeType == 'PC' && [
          createHandle(data, 'assignment-in', 'target', Position.Right, '50%', '-5', 'auto', 'auto')
        ]}

        {nodeType == 'UA' && [
          createHandle(data, 'association-in', 'target', Position.Left, '30%', 'auto', 'auto', '-5'),
          createHandle(data, 'assignment-in', 'target', Position.Left, '70%', 'auto', 'auto', '-5'),
          createHandle(data, 'association-out', 'source', Position.Right, '30%', '-5', 'auto', 'auto'),
          createHandle(data, 'assignment-out', 'source', Position.Right, '70%', '-5', 'auto', 'auto')
        ]}
      
        {nodeType == 'OA' && [
          createHandle(data, 'association-in', 'target', Position.Left, '30%', 'auto', 'auto', '-5'),
          createHandle(data, 'assignment-out', 'source', Position.Left, '70%', 'auto', 'auto', '-5'),
          createHandle(data, 'assignment-in', 'target', Position.Right, '50%', '-5', 'auto', 'auto')
        ]}

        {nodeType == 'O' && [
          createHandle(data, 'association-in', 'target', Position.Left, '30%', 'auto', 'auto', '-5'),
          createHandle(data, 'assignment-out', 'source', Position.Left, '70%', 'auto', 'auto', '-5'),
        ]}
      
        {nodeType == 'U' && [
          createHandle(data, 'assignment-out', 'source', Position.Right, '50%', '-5', 'auto', 'auto'),
        ]}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <div style={{
          fontSize: '10px',
          lineHeight: '14px',
          display: 'flex',
        }}>
          <NodeIcon 
            type={nodeType} 
            style={{
              fontSize: '10px',
              lineHeight: '14px',
              width: 'auto',
              height: 'auto'
            }}
          />
        </div>
        <span style={{ fontWeight: 800, lineHeight: '14px', fontSize: '14px' }}>{data.name}</span>
      </div>
    </div>
  );
}

// Node types for ReactFlow
const nodeTypes = {
  dagNode: CustomDAGNode,
};

// Edge types with specific styling
const getEdgeStyle = (edgeType: 'assignment' | 'association', isHighlighted: boolean, isObjectDag: boolean) => {
  // If edge is highlighted, use OA blue color
  if (isHighlighted) {
    return {
      stroke: isObjectDag ? getNodeTypeColorFromTheme(NodeType.OA) : getNodeTypeColorFromTheme(NodeType.UA),
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

const getEdgeType = (edgeType: 'assignment' | 'association') => {
  return edgeType === 'assignment' ? 'smoothstep' : 'default';
};

const getMarkerEnd = (edgeType: 'assignment' | 'association', isHighlighted: boolean, isObjectDag: boolean) => {
  // If edge is highlighted, use OA blue color
  if (isHighlighted) {
    return {
      type: MarkerType.ArrowClosed,
      color: isObjectDag ? getNodeTypeColorFromTheme(NodeType.OA) : getNodeTypeColorFromTheme(NodeType.UA),
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
      { "id": 1749733028334, "name": "Emergency", "properties": [] },
      { "id": 1749733033759, "name": "Wards", "properties": [] },
      { "id": 1749733037102, "name": "RBAC", "properties": [] }
    ],
    // "uas": [
    //   { "id": 1749732983642, "name": "doctor", "assignments": [ 1749733019171, 1749732997042 ], "associations": [ { "target": 1749733043029, "arset": [] } ], "properties": [] },
    //   { "id": 1749732997042, "name": "Intern", "assignments": [], "associations": [ { "target": 1749733043029, "arset": [] } ], "properties": [] },
    //   { "id": 1749733003607, "name": "Ward1", "assignments": [], "associations": [ { "target": 1749733052466, "arset": [] } ], "properties": [] },
    //   { "id": 1749733013979, "name": "Ward2", "assignments": [], "associations": [ { "target": 1749733048000, "arset": [] } ], "properties": [] },
    //   { "id": 1749733019171, "name": "Emergency", "assignments": [], "associations": [ { "target": 1749733056543, "arset": [] } ], "properties": [] }
    // ],
    "oas": [
      { "id": 1749733043029, "name": "Med Records", "assignments": [ 1749733037102 ], "properties": [] },
      { "id": 1749733048000, "name": "Ward2", "assignments": [ 1749733033759 ], "properties": [] },
      { "id": 1749733052466, "name": "Ward1", "assignments": [ 1749733033759 ], "properties": [] },
      { "id": 1749733056543, "name": "Critical", "assignments": [ 1749733033759, 1749733028334 ], "properties": [] }
    ],
    // "users": [
    //   { "id": 1749732986909, "name": "u3", "assignments": [ 1749732983642, 1749733013979 ], "properties": [] },
    //   { "id": 1749732993217, "name": "u4", "assignments": [ 1749732997042, 1749733003607 ], "properties": [] }
    // ],
    "objects": [
      { "id": 1749733072107, "name": "o5", "assignments": [ 1749733043029, 1749733048000 ], "properties": [] },
      { "id": 1749733076157, "name": "o6", "assignments": [ 1749733043029, 1749733052466 ], "properties": [] },
      { "id": 1749733079076, "name": "o7", "assignments": [ 1749733043029, 1749733056543 ], "properties": [] }
    ]
  }
};

const { nodes: initialNodes, edges: initialEdges } = jsonToGraph(initialGraphJson);

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  return layoutPCOAONodes(nodes, edges);
};

// Custom layout function for PC, OA, and O nodes following specific rules
function layoutPCOAONodes(nodes: Node[], edges: Edge[]) {
  // Filter only PC, OA, and O nodes
  const filteredNodes = nodes.filter(node => 
    node.data.type === NodeType.PC || 
    node.data.type === NodeType.OA || 
    node.data.type === NodeType.O
  );
  
  if (filteredNodes.length === 0) {
    return { nodes, edges };
  }

  // Constants for layout
  const PC_X = -200; // All PCs aligned at x=-200 (left of center)
  const LEVEL_SPACING = 200; // Horizontal spacing between levels (moving right)
  const NODE_SPACING_Y = 60; // Vertical spacing between nodes
  const SUBGRAPH_SPACING = 20; // Vertical spacing between PC subgraphs
  const NODE_HEIGHT = 40; // Approximate node height

  // Find PC nodes and create subgraphs
  const pcNodes = filteredNodes.filter(node => node.data.type === NodeType.PC);
  const oaNodes = filteredNodes.filter(node => node.data.type === NodeType.OA);
  const oNodes = filteredNodes.filter(node => node.data.type === NodeType.O);

  // Build reachability map from PC nodes
  const subgraphs = new Map<string, Set<string>>();
  
  // Initialize each PC with its own subgraph
  pcNodes.forEach(pc => {
    subgraphs.set(pc.id, new Set<string>());
  });

  // Find all nodes reachable from each PC through assignment edges
  // In Policy Machine, assignment edges go child -> parent, so we need to find incoming edges to PC
  const findReachableNodes = (pcNodeId: string): Set<string> => {
    const reachable = new Set<string>();
    reachable.add(pcNodeId); // PC is part of its own subgraph
    
    // BFS to find all nodes that can reach this PC through assignment edges
    const queue = [pcNodeId];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);
      
      // Find all nodes that assign to the current node
      const incomingEdges = edges.filter(edge => 
        edge.target === currentNodeId && edge.data?.edgeType === 'assignment'
      );
      
      incomingEdges.forEach(edge => {
        if (!visited.has(edge.source)) {
          reachable.add(edge.source);
          queue.push(edge.source);
        }
      });
    }
    
    return reachable;
  };

  // Build subgraphs for each PC
  pcNodes.forEach(pc => {
    const reachable = findReachableNodes(pc.id);
    subgraphs.set(pc.id, reachable);
  });

  // Assign nodes to subgraphs (prefer higher subgraph = lower Y value)
  // First pass: collect all PC memberships for each node
  const nodeToMultiplePCs = new Map<string, string[]>();
  const allOAONodes = [...oaNodes, ...oNodes];
  
  allOAONodes.forEach(node => {
    const belongsToPCs: string[] = [];
    
    for (const [pcId, subgraph] of subgraphs.entries()) {
      if (subgraph.has(node.id)) {
        belongsToPCs.push(pcId);
      }
    }
    
    if (belongsToPCs.length > 0) {
      nodeToMultiplePCs.set(node.id, belongsToPCs);
    }
  });

  // Second pass: assign each node to the PC that will have the lowest Y (highest in view)
  // This ensures nodes are above all their assignment targets
  const nodeToSubgraph = new Map<string, string>();
  
  nodeToMultiplePCs.forEach((pcIds, nodeId) => {
    // Sort PCs by ID to ensure consistent assignment - first PC will be positioned highest
    const sortedPCIds = pcIds.sort();
    nodeToSubgraph.set(nodeId, sortedPCIds[0]);
  });

  // Validate assignment edge directions and adjust node positions if needed
  const validateAssignmentDirection = () => {
    const violations: Array<{source: string, target: string}> = [];
    
    edges.forEach(edge => {
      if (edge.data?.edgeType === 'assignment') {
        const sourcePC = nodeToSubgraph.get(edge.source);
        const targetPC = nodeToSubgraph.get(edge.target);
        
        // Source should be in higher subgraph (lower index, more negative Y) than target
        if (sourcePC && targetPC) {
          const sourcePCIndex = sortedPCs.findIndex(pc => pc.id === sourcePC);
          const targetPCIndex = sortedPCs.findIndex(pc => pc.id === targetPC);
          
          // If source is in a lower subgraph (higher index) than target, move source up
          if (sourcePCIndex > targetPCIndex) {
            violations.push({source: edge.source, target: edge.target});
            // Move source to higher subgraph (target's subgraph or higher)
            nodeToSubgraph.set(edge.source, targetPC);
          }
        }
      }
    });
    
    return violations.length === 0;
  };

  // Create horizontal layout within each subgraph using levels
  // Level 0 = PC, Level 1 = nodes that assign directly to PC, etc.
  const getNodeLevel = (nodeId: string, pcId: string): number => {
    if (nodeId === pcId) return 0; // PC is always at level 0
    
    // BFS from PC, following assignment edges backwards (from target to source)
    const queue: Array<{ nodeId: string, level: number }> = [{ nodeId: pcId, level: 0 }];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { nodeId: currentNodeId, level } = queue.shift()!;
      
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);
      
      if (currentNodeId === nodeId) {
        return level;
      }
      
      // Find nodes that assign to the current node (incoming assignment edges)
      const incomingEdges = edges.filter(edge => 
        edge.target === currentNodeId && edge.data?.edgeType === 'assignment'
      );
      
      incomingEdges.forEach(edge => {
        if (!visited.has(edge.source)) {
          queue.push({ nodeId: edge.source, level: level + 1 });
        }
      });
    }
    
    return 1; // Default level if not found in graph
  };

  // Group nodes by PC subgraph and level
  const subgraphLevels = new Map<string, Map<number, Node[]>>();
  
  pcNodes.forEach(pc => {
    const levels = new Map<number, Node[]>();
    levels.set(0, [pc]); // PC is at level 0
    subgraphLevels.set(pc.id, levels);
  });

  // Add OA and O nodes to their respective subgraph levels
  allOAONodes.forEach(node => {
    const pcId = nodeToSubgraph.get(node.id);
    if (pcId && subgraphLevels.has(pcId)) {
      const levels = subgraphLevels.get(pcId)!;
      const level = getNodeLevel(node.id, pcId);
      
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(node);
    }
  });

  // Sort PCs by ID for consistent ordering (first PC will be highest)
  const sortedPCs = pcNodes.sort((a, b) => a.id.localeCompare(b.id));

  // Validate and fix assignment edge directions
  let validationPasses = 0;
  while (!validateAssignmentDirection() && validationPasses < 5) {
    validationPasses++;
  }

  // Position nodes
  const layoutedNodes = [...nodes]; // Copy all original nodes
  let currentSubgraphY = -400; // Start high up (negative Y)

  sortedPCs.forEach(pc => {
    const levels = subgraphLevels.get(pc.id);
    if (!levels) return;

    // Get all nodes in this subgraph for topological sorting
    const subgraphNodes: Node[] = [];
    for (const [level, nodesInLevel] of levels.entries()) {
      subgraphNodes.push(...nodesInLevel);
    }

    // Topological sort within subgraph to ensure assignment sources come before targets
    const topologicalSort = (nodes: Node[]): Node[] => {
      const visited = new Set<string>();
      const visiting = new Set<string>();
      const result: Node[] = [];
      
      const visit = (node: Node): boolean => {
        if (visiting.has(node.id)) return false; // Cycle detected
        if (visited.has(node.id)) return true;
        
        visiting.add(node.id);
        
        // Visit all nodes this node assigns to (targets come after sources)
        const assignmentTargets = edges
          .filter(edge => edge.source === node.id && edge.data?.edgeType === 'assignment')
          .map(edge => nodes.find(n => n.id === edge.target))
          .filter(Boolean) as Node[];
        
        for (const target of assignmentTargets) {
          if (!visit(target)) return false;
        }
        
        visiting.delete(node.id);
        visited.add(node.id);
        result.unshift(node); // Add to beginning (reverse topological order)
        return true;
      };
      
      for (const node of nodes) {
        if (!visited.has(node.id)) {
          if (!visit(node)) {
            // Fallback to original order if cycle detected
            return nodes;
          }
        }
      }
      
      return result;
    };

    const sortedSubgraphNodes = topologicalSort(subgraphNodes);

    // Calculate subgraph height
    const subgraphHeight = Math.max(sortedSubgraphNodes.length * (NODE_HEIGHT + NODE_SPACING_Y), 100);

    // Position sorted nodes respecting their levels but maintaining topological order
    // Start positioning at the top of the subgraph (most negative Y in this subgraph)
    let cumulativeY = currentSubgraphY;
    
    sortedSubgraphNodes.forEach(node => {
      if (node.id === pc.id) return; // Skip PC, will position at end
      
      const level = getNodeLevel(node.id, pc.id);
      const levelX = PC_X + level * LEVEL_SPACING; // Move right for each level
      
      const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id);
      if (nodeIndex !== -1) {
        layoutedNodes[nodeIndex].position = {
          x: levelX,
          y: cumulativeY
        };
        cumulativeY += NODE_SPACING_Y; // Move down (increase Y)
      }
    });

    // Position PC at the bottom of its subgraph (highest Y value in subgraph)
    const pcNodeIndex = layoutedNodes.findIndex(n => n.id === pc.id);
    if (pcNodeIndex !== -1) {
      layoutedNodes[pcNodeIndex].position = {
        x: PC_X,
        y: cumulativeY // PC at the bottom of its subgraph
      };
    }

    // Update current Y position for next subgraph (move further down)
    // Add extra spacing to account for the PC position
    currentSubgraphY += subgraphHeight + SUBGRAPH_SPACING;
  });

  return { nodes: layoutedNodes, edges };
}

function DAGContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>(NodeType.PC);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [connectingHandleType, setConnectingHandleType] = useState<'assignment' | 'association' | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  
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

  const formatGraph = useCallback((nodesToFormat: Node[], edgesToUse: Edge[]) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodesToFormat, edgesToUse);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    // Longer delay and more padding to ensure proper fit
    setTimeout(() => fitView({ padding: 0.3 }), 300);
  }, [setNodes, setEdges, fitView]);

  useEffect(() => {
    if (nodes.length > 0) {
      formatGraph(nodes, edges);
    }
  }, [nodes.length, formatGraph]);

  // Additional effect to ensure fit view on initial load
  useEffect(() => {
    if (initialNodes.length > 0) {
      // Small delay to ensure nodes are rendered
      setTimeout(() => {
        fitView({ padding: 0.3 });
      }, 200);
    }
  }, [fitView]);

  const onConnectStart = useCallback((event: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
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
    document.querySelectorAll(`.handle.${oppositeClass}-in`).forEach(handle => {
      (handle as HTMLElement).style.opacity = '0.3';
    });
    document.querySelectorAll(`.handle.${handleClass}-in`).forEach(handle => {
      (handle as HTMLElement).style.opacity = '1';
    });
  }, []);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    setConnectingNodeId(null);
    setConnectingHandleType(null);
    
    // Reset all handle visibility
    document.querySelectorAll('.handle').forEach(handle => {
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
      if ((sourceIsAssignment && !targetIsAssignment) || 
          (sourceIsAssociation && !targetIsAssociation) ||
          (!sourceIsAssignment && targetIsAssignment) ||
          (!sourceIsAssociation && targetIsAssociation)) {
        console.warn('Invalid connection: Assignment handles can only connect to assignment handles, and association handles can only connect to association handles');
        return;
      }
      
      // Determine edge type based on handles
      let edgeType: 'assignment' | 'association' = 'assignment';
      
      if (params.sourceHandle?.includes('association') || params.targetHandle?.includes('association')) {
        edgeType = 'association';
      }
      
      // Additional validation for assignment edges using Policy Machine rules
      if (edgeType === 'assignment') {
        const sourceNode = nodes.find(n => n.id === params.source);
        const targetNode = nodes.find(n => n.id === params.target);
        
        if (sourceNode && targetNode) {
          if (!isValidAssignment(sourceNode.data.type, targetNode.data.type)) {
            console.warn(`Invalid assignment: ${sourceNode.data.type} (${sourceNode.data.name}) cannot be assigned to ${targetNode.data.type} (${targetNode.data.name})`);
            return;
          }
        }
      }
      
      const newEdge = {
        ...params,
        type: getEdgeType(edgeType),
        data: { edgeType },
        style: getEdgeStyle(edgeType, false, false),
        markerEnd: getMarkerEnd(edgeType, false, false),
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, nodes],
  );

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

  const resetGraph = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges]);

  // Handle node click to highlight outgoing paths using BFS
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    // Toggle selection - if same node clicked again, deselect
    const newSelectedNodeId = selectedNodeId === node.id ? null : node.id;
    setSelectedNodeId(newSelectedNodeId);

    if (!newSelectedNodeId) {
      // Clear all highlighting
      setEdges((currentEdges) => {
        return currentEdges.map(edge => ({
          ...edge,
          style: getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
          markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
        }));
      });
      setNodes((currentNodes) => {
        return currentNodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            isHighlighted: false,
          },
        }));
      });
      return;
    }
    
    // Use BFS to find all reachable nodes and edges
    const visitedNodes = new Set<string>();
    const highlightedEdges = new Set<string>();
    const queue: string[] = [newSelectedNodeId];
    
    visitedNodes.add(newSelectedNodeId);
    
    // Get current edges for BFS traversal
    const currentEdges = edges;
    
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      
      // Find all outgoing edges from current node
      const outgoingEdges = currentEdges.filter(edge => edge.source === currentNodeId);
      
      outgoingEdges.forEach(edge => {
        highlightedEdges.add(edge.id);
        
        // Add target node to queue if not visited
        if (!visitedNodes.has(edge.target)) {
          visitedNodes.add(edge.target);
          queue.push(edge.target);
        }
      });
    }
    
    const nodeType = node.data.type;
    const isObjectDag = nodeType === NodeType.OA || nodeType === NodeType.O;
    // Update edges with highlighting
    setEdges((currentEdges) => {
      return currentEdges.map(edge => {
        const isHighlighted = highlightedEdges.has(edge.id);
        return {
          ...edge,
          style: getEdgeStyle(edge.data?.edgeType || 'assignment', isHighlighted, isObjectDag),
          markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', isHighlighted, isObjectDag),
        };
      });
    });
    
    // Update nodes with border highlighting (not selection)
    setNodes((currentNodes) => {
      return currentNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          isHighlighted: visitedNodes.has(n.id),
        },
      }));
    });
  }, [selectedNodeId, setEdges, setNodes, edges]);

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
      nodeType: NodeType.PC 
    });
  }, []);

  // Handle node type selection from context menu
  const handleNodeTypeSelect = useCallback((nodeType: NodeType, event: React.MouseEvent) => {
    setContextMenuOpened(false);
    
    // Convert screen coordinates to ReactFlow coordinates
    const flowPosition = screenToFlowPosition({
      x: contextMenuPosition.x,
      y: contextMenuPosition.y,
    });

    // Get screen position relative to the ReactFlow container for text input
    const reactFlowBounds = document.querySelector('.react-flow__pane')?.getBoundingClientRect();
    const screenPosition = reactFlowBounds ? {
      x: contextMenuPosition.x - reactFlowBounds.left,
      y: contextMenuPosition.y - reactFlowBounds.top,
    } : { x: 0, y: 0 };
    
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
  }, [contextMenuPosition, screenToFlowPosition]);

  // Handle inline text input
  const handleInlineKeyDown = useCallback((event: React.KeyboardEvent) => {
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
        nodeType: NodeType.PC 
      });
      setInlineText('');
    } else if (event.key === 'Escape') {
      // Cancel creation
      setInlineTextBox({ 
        visible: false, 
        screenPosition: { x: 0, y: 0 }, 
        flowPosition: { x: 0, y: 0 }, 
        nodeType: NodeType.PC 
      });
      setInlineText('');
    }
  }, [inlineText, inlineTextBox, setNodes]);

  // Handle clicks outside the inline text box and context menu
  const handlePaneClick = useCallback(() => {
    if (inlineTextBox.visible) {
      setInlineTextBox({ 
        visible: false, 
        screenPosition: { x: 0, y: 0 }, 
        flowPosition: { x: 0, y: 0 }, 
        nodeType: NodeType.PC 
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
      setEdges((currentEdges) => {
        return currentEdges.map(edge => ({
          ...edge,
          style: getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
          markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
        }));
      });
      setNodes((currentNodes) => {
        return currentNodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            isHighlighted: false,
          },
        }));
      });
    }
  }, [inlineTextBox.visible, contextMenuOpened, downloadMenuOpened, selectedNodeId, setEdges, setNodes]);

  // Handle clicks outside download menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && event.target && !downloadMenuRef.current.contains(event.target as Element)) {
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

  // Download image functionality
  const downloadImage = useCallback((format: 'png' | 'jpeg' | 'svg') => {
    // Target only the ReactFlow viewport (graph area) excluding controls and UI
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) {
      console.error('ReactFlow viewport not found');
      return;
    }

    const options = {
      cacheBust: true,
      backgroundColor: 'transparent', // Transparent background
      filter: (node: Element) => {
        // Exclude controls, minimap, handles, and other UI elements
        if (
          node?.classList?.contains('react-flow__controls') ||
          node?.classList?.contains('react-flow__minimap') ||
          node?.classList?.contains('react-flow__background') ||
          node?.classList?.contains('react-flow__panel') ||
          node?.classList?.contains('react-flow__handle') ||
          node?.classList?.contains('handle')
        ) {
          return false;
        }
        return true;
      },
    };

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

    // Get the ReactFlow wrapper to capture the entire flow area with proper dimensions
    const reactFlowElement = document.querySelector('.react-flow') as HTMLElement;
    if (!reactFlowElement) {
      console.error('ReactFlow element not found');
      return;
    }

    downloadFunction(reactFlowElement, options)
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `dag-graph.${fileExtension}`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Error downloading image:', err);
      });
  }, []);

  useEffect(() => {
    if (jsonModalOpened) {
      setJsonEditValue(graphToJson(nodes, edges));
      setJsonError(null);
    }
  }, [jsonModalOpened]);

  return (
    <AppShell
      header={{ height: 0 }}
      navbar={{
        width: 75,
        breakpoint: 'sm',
      }}
      padding="md"
    >
      <AppShell.Navbar p="sm" style={{ height: '100vh' }} className={classes.navbar}>
        <NavBar activePageIndex={1} />
      </AppShell.Navbar>
      <AppShell.Main style={{ height: '100vh', padding: '0 0 0 75px'  }}>
        <UserMenu />
          <Stack gap="md" style={{ height: '100%' }}>
           <Paper shadow="sm" radius="md" style={{ height: '100%', position: 'relative' }}>
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
              connectionMode={ConnectionMode.Loose}
              fitView
              style={{
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <Controls>
                <ControlButton 
                  onClick={() => setDownloadMenuOpened(true)}
                  title="Download Image"
                >
                  <IconCamera />
                </ControlButton>
                <ControlButton 
                  onClick={() => setJsonModalOpened(true)}
                  title="View Graph JSON"
                >
                  <IconJson size={16} />
                </ControlButton>
                <ControlButton
                  onClick={() => formatGraph(nodes, edges)}
                  title="Format Graph"
                >
                  <IconSitemap size={16} />
                </ControlButton>
              </Controls>
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
            
            {/* Download Menu positioned next to download button */}
            {downloadMenuOpened && (
              <div 
                ref={downloadMenuRef}
                style={{
                  position: 'absolute',
                  bottom: 50, // Position right above the controls
                  left: 10,   // Align with the controls panel
                  zIndex: 1000,
                  background: 'white',
                  border: '1px solid var(--mantine-color-gray-4)',
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  padding: '8px',
                  minWidth: '150px'
                }}
                onClick={(e) => e.stopPropagation()} // Prevent menu from closing when clicking inside it
              >
                <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--mantine-color-gray-7)' }}>
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
                      transition: 'background-color 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                      transition: 'background-color 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                      transition: 'background-color 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                    }
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
              zIndex: 9999
            }
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
              <Button onClick={addNode}>
                Add Node
              </Button>
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
              onChange={e => setJsonEditValue(e.currentTarget.value)}
              style={{ fontFamily: 'monospace', fontSize: 10 }}
              spellCheck={false}
            />
            {jsonError && (
              <Text c="red" size="sm">{jsonError}</Text>
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
                    const { nodes: newNodes, edges: newEdges } = jsonToGraph(parsed);
                    setEdges(newEdges);
                    formatGraph(newNodes, newEdges);
                    setJsonModalOpened(false);
                    setJsonError(null);
                  } catch (err: any) {
                    setJsonError(`Invalid JSON: ${  err?.message || err}`);
                  }
                }}
              >
                Apply
              </Button>
            </Group>
          </Stack>
        </Modal>
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