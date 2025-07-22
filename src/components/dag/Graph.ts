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

const SPACE_BTW_PC_AND_SUBGRAPH = 200;
const SPACE_BTW_LEVELS = 100;
const SPACE_BTW_NODES = 20;

export type PolicyClass = {
    name: string;
    levels: Node[][];
}

export type GraphNode = {
    name: string,
    type: NodeType,
    properties: Map<string, string>
}

export type NodeWithPolicyClassLevel = {
    pc: string,
    source: Node,
    target: string,
    level: number,
}

export enum NodeType {
    PC = "PC",
    OA = "OA",
    UA = "UA",
    O = "O",
    U = "U"
}

export function node(name: string, type: NodeType, properties?: Map<string, string>) {
    return {name, type, properties}
}

export function layout(nodes: Node[]) {
    // console.log("layouting", nodes);

    // // reset node position to avoid applying layout twice
    // nodes.forEach(node => {
    //     node.position = {x: 0, y: 0};
    // })

    // // split into user dag and target dag nodes
    // const userDAG: Node[] = [];
    // const targetDAG: Node[] = [];

    // nodes.forEach(node => {
    //     if (node.data.layout.targetDAG) {
    //         targetDAG.push(node);
    //     } else {
    //         userDAG.push(node);
    //     }
    // })

    // layoutUserDAG(userDAG);
    // layoutTargetDAG(targetDAG);
}

function layoutTargetDAG(nodes: Node[]) {
    // compute each policy class subgraph positions as if there was only one (policy class node at 0,0)
    computeAnchors(nodes);

    // shift policy classes vertically according to their order, highest order at top
    shiftVertically(nodes);

    // shift policy classes horizontally according to the order identified above
    // policy classes lower in order will anchor thier subgraphs further away from x=0 then higher order policy classes
    shiftHorizontally(nodes);
}

function layoutUserDAG(nodes: Node[]) {
    let i = 0;
    nodes.forEach(node => {
        node.position = {x: -300, y: i* node.computed.height + SPACE_BTW_NODES};
        i++;
    })
}

function computeAnchors(nodes: Node[]) {
    const seen = new Set();

    for (const node of nodes) {
        const level = node.data.layout.level;
        const width = node.computed.width;

        node.position.x -= (width / 2);
        node.position.y -= level * SPACE_BTW_LEVELS;

        node.computed.positionAbsolute = node.position;
    }
}

function shiftVertically(nodes: Node[]) {
    const heights = calcSubgraphHeights(nodes);

    let currentShift = 0;
    let pcCount = 0;
    for (const node of nodes) {
        if (node.data.type === NodeType.PC) {
            pcCount++;

            if (pcCount > 1) {
                currentShift = heights.get(node.id) * (node.computed.height + SPACE_BTW_LEVELS) + SPACE_BTW_LEVELS + currentShift;
            }
        }

        if (pcCount <= 1) {
            continue;
        }

        node.position.y += currentShift;
        node.computed.positionAbsolute = node.position;
    }
}

function shiftHorizontally(nodes: Node[]) {
    let nextX = SPACE_BTW_PC_AND_SUBGRAPH;
    let prevLevel = 0;
    for (const node of nodes) {
        // pc nodes do not need to be shifted
        if (node.data.type == NodeType.PC) {
            nextX = SPACE_BTW_PC_AND_SUBGRAPH;
            prevLevel = 0;

            continue;
        }

        const level = node.data.layout.level;
        const width = node.computed.width;

        if (level > prevLevel) {
            node.position.x = nextX - (width/2);
        } else {
            node.position.x = nextX + SPACE_BTW_NODES + (width/2);
            nextX += width + SPACE_BTW_NODES;
        }

        node.computed.positionAbsolute = node.position;

        prevLevel = level;
    }
}

function calcSubgraphHeights(nodes: Node[]): Map<string, number> {
    const heightsMap = new Map();

    let currentPC;
    let height = 0;
    for (const node of nodes) {
        if (node.data.type === NodeType.PC) {
            if (currentPC) {
                heightsMap.set(currentPC, height);
            }

            currentPC = node.id;
            height = 0;
        } else {
            if (height < node.data.layout.level) {
                height = node.data.layout.level;
            }
        }
    }

    if (currentPC) {
        heightsMap.set(currentPC, height);
    }

    return heightsMap;
}
