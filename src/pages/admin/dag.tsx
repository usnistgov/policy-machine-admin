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

// Static color mapping function (no hooks)
const getStaticTypeColor = (type: string) => {
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
  if (!json || !json.graph) return { nodes, edges };
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
            style: getEdgeStyle('assignment'),
            markerEnd: getMarkerEnd('assignment'),
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
          style: getEdgeStyle('association'),
          markerEnd: getMarkerEnd('association'),
        } as Edge);
      });
    }
  });

  return { nodes, edges };
}

// Custom Node Component with specific handles
function CustomDAGNode({ data, selected }: NodeProps) {
  const theme = useMantineTheme();
  const nodeType = data.type;
  const typeColor = getStaticTypeColor(nodeType);
  
  // Determine which handles to show based on node type
  const showAssignmentIn = nodeType === NodeType.PC || nodeType === NodeType.UA || nodeType === NodeType.OA;
  const showAssignmentOut = nodeType === NodeType.UA || nodeType === NodeType.OA || nodeType === NodeType.U || nodeType === NodeType.O;
  const showAssociationIn = nodeType === NodeType.UA || nodeType === NodeType.OA || nodeType === NodeType.O;
  const showAssociationOut = nodeType === NodeType.UA;
  
  return (
    <div 
      style={{
        background: 'transparent',
        borderRadius: 6,
        border: '2px solid ' + typeColor,
        padding: '2px 2px',
        fontSize: '14px',
        color: 'black',
        boxShadow: selected ? '0 0 0 2px ' + typeColor : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Assignment In (Top) - PC, UA, OA */}
      {showAssignmentIn && (
        <Handle
          type="target"
          position={Position.Top}
          id="assignment-in"
          className="handle assignment-in"
          style={{
            background: 'black',
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '1px solid black',
            top: -5,
          }}
        />
      )}
      
      {/* Association In (Left) - UA, OA */}
      {showAssociationIn && (
        <Handle
          type="target"
          position={Position.Left}
          id="association-in"
          className="handle association-in"
          style={{
            background: 'var(--mantine-color-green-7)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '1px solid var(--mantine-color-green-7)',
            left: -5,
          }}
        />
      )}
      
      {/* Node Content */}
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
      
      {/* Assignment Out (Bottom) - UA, OA, U, O */}
      {showAssignmentOut && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="assignment-out"
          className="handle assignment-out"
          style={{
            background: 'black',
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '1px solid black',
            bottom: -5,
          }}
        />
      )}
      
      {/* Association Out (Right) - UA only */}
      {showAssociationOut && (
        <Handle
          type="source"
          position={Position.Right}
          id="association-out"
          className="handle association-out"
          style={{
            background: 'var(--mantine-color-green-7)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '1px solid var(--mantine-color-green-7)',
            right: -5,
          }}
        />
      )}
    </div>
  );
}

// Node types for ReactFlow
const nodeTypes = {
  dagNode: CustomDAGNode,
};

// Edge types with specific styling
const getEdgeStyle = (edgeType: 'assignment' | 'association') => {
  if (edgeType === 'assignment') {
    return {
      stroke: 'black',
      strokeWidth: 2,
      strokeDasharray: 'none',
    };
  } else {
    return {
      stroke: 'var(--mantine-color-green-7)',
      strokeWidth: 2,
      strokeDasharray: '5,5',
    };
  }
};

const getEdgeType = (edgeType: 'assignment' | 'association') => {
  return edgeType === 'assignment' ? 'smoothstep' : 'smoothstep';
};

const getMarkerEnd = (edgeType: 'assignment' | 'association') => {
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
    "uas": [
      { "id": 1749732983642, "name": "doctor", "assignments": [ 1749733019171, 1749732997042 ], "associations": [ { "target": 1749733043029, "arset": [] } ], "properties": [] },
      { "id": 1749732997042, "name": "Intern", "assignments": [], "associations": [ { "target": 1749733043029, "arset": [] } ], "properties": [] },
      { "id": 1749733003607, "name": "Ward1", "assignments": [], "associations": [ { "target": 1749733052466, "arset": [] } ], "properties": [] },
      { "id": 1749733013979, "name": "Ward2", "assignments": [], "associations": [ { "target": 1749733048000, "arset": [] } ], "properties": [] },
      { "id": 1749733019171, "name": "Emergency", "assignments": [], "associations": [ { "target": 1749733056543, "arset": [] } ], "properties": [] }
    ],
    "oas": [
      { "id": 1749733043029, "name": "Med Records", "assignments": [ 1749733037102 ], "properties": [] },
      { "id": 1749733048000, "name": "Ward2", "assignments": [ 1749733033759 ], "properties": [] },
      { "id": 1749733052466, "name": "Ward1", "assignments": [ 1749733033759 ], "properties": [] },
      { "id": 1749733056543, "name": "Critical", "assignments": [ 1749733033759, 1749733028334 ], "properties": [] }
    ],
    "users": [
      { "id": 1749732986909, "name": "u3", "assignments": [ 1749732983642, 1749733013979 ], "properties": [] },
      { "id": 1749732993217, "name": "u4", "assignments": [ 1749732997042, 1749733003607 ], "properties": [] }
    ],
    "objects": [
      { "id": 1749733072107, "name": "o5", "assignments": [ 1749733043029, 1749733048000 ], "properties": [] },
      { "id": 1749733076157, "name": "o6", "assignments": [ 1749733043029, 1749733052466 ], "properties": [] },
      { "id": 1749733079076, "name": "o7", "assignments": [ 1749733043029, 1749733056543 ], "properties": [] }
    ]
  }
};

const { nodes: initialNodes, edges: initialEdges } = jsonToGraph(initialGraphJson);

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const rankdir = 'RL';
  dagreGraph.setGraph({ rankdir, nodesep: 100, ranksep: 100 });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 50 });
  });

  edges.forEach((edge) => {
    if (edge.data.edgeType !== 'association') {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newPosition = {
      x: nodeWithPosition.x - 150 / 2,
      y: nodeWithPosition.y - 50 / 2,
    };

    return { ...node, position: newPosition };
  });

  return { nodes: layoutedNodes, edges };
};

function DAGContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>(NodeType.PC);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [connectingHandleType, setConnectingHandleType] = useState<'assignment' | 'association' | null>(null);
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

    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
  }, [setNodes, setEdges, fitView]);

  useEffect(() => {
    if (nodes.length > 0) {
      formatGraph(nodes, edges);
    }
  }, []);

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
        style: getEdgeStyle(edgeType),
        markerEnd: getMarkerEnd(edgeType),
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
  }, [inlineTextBox.visible, contextMenuOpened, downloadMenuOpened]);

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
                  return getStaticTypeColor(type);
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
                    border: `2px solid ${getStaticTypeColor(inlineTextBox.nodeType)}`,
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
                    setJsonError('Invalid JSON: ' + (err?.message || err));
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