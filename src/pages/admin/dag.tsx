import React, { useCallback, useState } from 'react';
import { AppShell, Button, Group, Paper, Stack, Text, TextInput, Modal, Select } from '@mantine/core';
import { NavBar } from '@/components/navbar/NavBar';
import { UserMenu } from '@/components/UserMenu';
import classes from './navbar.module.css';
import {
  ReactFlow,
  MiniMap,
  Controls,
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodeType } from '@/api/pdp.api';
import { NodeIcon, getTypeColor } from '@/components/tree/util';
import { useMantineTheme } from '@mantine/core';

// Custom Node Component with specific handles
function CustomDAGNode({ data, selected }: NodeProps) {
  const theme = useMantineTheme();
  const typeColor = getTypeColor(data.type);
  
  return (
    <div 
      style={{
        background: 'white',
        borderRadius: 8,
        padding: '4px 6px',
        minWidth: 80,
        fontSize: '14px',
        color: 'black',
        boxShadow: selected ? '0 0 0 2px var(--mantine-color-blue-2)' : 'none',
      }}
    >
      {/* Assignment In (Top) */}
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
          border: '2px solid white',
          top: -6,
        }}
      />
      
      {/* Association In (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="association-in"
        className="handle association-in"
        style={{
          background: 'var(--mantine-color-green-6)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          border: '2px solid white',
          left: -6,
        }}
      />
      
      {/* Node Content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <NodeIcon 
          type={data.type} 
          classes={{ nodeRowItem: '' }}
        />
        <span style={{ fontWeight: 500 }}>{data.name}</span>
      </div>
      
      {/* Assignment Out (Bottom) */}
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
          border: '2px solid white',
          bottom: -6,
        }}
      />
      
      {/* Association Out (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="association-out"
        className="handle association-out"
        style={{
          background: 'var(--mantine-color-green-6)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          border: '2px solid white',
          right: -6,
        }}
      />
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
      stroke: 'var(--mantine-color-green-6)',
      strokeWidth: 2,
      strokeDasharray: '5,5',
    };
  }
};

const getMarkerEnd = (edgeType: 'assignment' | 'association') => {
  return {
    type: 'arrowclosed' as const,
    color: edgeType === 'assignment' ? 'black' : 'var(--mantine-color-green-6)',
    width: 20,
    height: 20,
  };
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'dagNode',
    position: { x: 100, y: 100 },
    data: { 
      name: 'Users PC',
      type: NodeType.PC,
    },
  },
  {
    id: '2',
    type: 'dagNode',
    position: { x: 300, y: 200 },
    data: { 
      name: 'Admin UA',
      type: NodeType.UA,
    },
  },
  {
    id: '3',
    type: 'dagNode',
    position: { x: 500, y: 100 },
    data: { 
      name: 'Files PC',
      type: NodeType.PC,
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    sourceHandle: 'assignment-out',
    targetHandle: 'assignment-in',
    data: { edgeType: 'assignment' },
    style: getEdgeStyle('assignment'),
    markerEnd: getMarkerEnd('assignment'),
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    sourceHandle: 'association-out',
    targetHandle: 'association-in',
    data: { edgeType: 'association' },
    style: getEdgeStyle('association'),
    markerEnd: getMarkerEnd('association'),
  },
];

export function DAG() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>(NodeType.PC);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [connectingHandleType, setConnectingHandleType] = useState<'assignment' | 'association' | null>(null);

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
      // Determine edge type based on handles
      let edgeType: 'assignment' | 'association' = 'assignment';
      
      if (params.sourceHandle?.includes('association') || params.targetHandle?.includes('association')) {
        edgeType = 'association';
      }
      
      const newEdge = {
        ...params,
        data: { edgeType },
        style: getEdgeStyle(edgeType),
        markerEnd: getMarkerEnd(edgeType),
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
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
      <AppShell.Main style={{ height: '100vh' }}>
        <UserMenu />
        
        <Stack gap="md" style={{ height: '95%' }}>
          <Paper shadow="sm" p="md" radius="md">
            <Group justify="space-between" align="center">
              <Text size="lg" fw={600}>DAG Builder</Text>
              <Group>
                <Button 
                  variant="filled" 
                  color="blue"
                  onClick={() => setIsModalOpen(true)}
                >
                  Add Node
                </Button>
                <Button 
                  variant="outline" 
                  color="orange"
                  onClick={resetGraph}
                >
                  Reset
                </Button>
                <Button 
                  variant="outline" 
                  color="red"
                  onClick={clearGraph}
                >
                  Clear All
                </Button>
              </Group>
            </Group>
            <Stack gap="xs" mt="xs">
              <Text size="sm" c="dimmed">
                Create and connect nodes to build your DAG. Drag nodes to reposition them.
              </Text>
              <Group gap="md">
                <Group gap="xs">
                  <div style={{ 
                    width: 20, 
                    height: 2, 
                    background: 'black',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{ 
                      width: 0, 
                      height: 0, 
                      borderLeft: '4px solid black', 
                      borderTop: '3px solid transparent', 
                      borderBottom: '3px solid transparent',
                      marginLeft: 'auto'
                    }} />
                  </div>
                  <Text size="xs" c="dimmed">Assignment</Text>
                </Group>
                <Group gap="xs">
                  <div style={{ 
                    width: 20, 
                    height: 2, 
                    background: 'var(--mantine-color-green-6)',
                    borderStyle: 'dashed',
                    borderWidth: '1px 0',
                    borderColor: 'var(--mantine-color-green-6)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{ 
                      width: 0, 
                      height: 0, 
                      borderLeft: '4px solid var(--mantine-color-green-6)', 
                      borderTop: '3px solid transparent', 
                      borderBottom: '3px solid transparent',
                      marginLeft: 'auto'
                    }} />
                  </div>
                  <Text size="xs" c="dimmed">Association</Text>
                </Group>
              </Group>
            </Stack>
          </Paper>

          <Paper shadow="sm" radius="md" style={{ height: 'calc(100% - 140px)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              style={{
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <Controls />
              <MiniMap 
                style={{
                  backgroundColor: 'var(--mantine-color-gray-1)',
                }}
                nodeColor={(node) => getTypeColor(node.data?.type || NodeType.PC)}
              />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            </ReactFlow>
          </Paper>
        </Stack>

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
      </AppShell.Main>
    </AppShell>
  );
} 