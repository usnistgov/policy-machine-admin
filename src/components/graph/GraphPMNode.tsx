import React, { useState } from "react";
import {ActionIcon, Button, Group, useMantineTheme} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { PMNode, PMNodeProps } from "@/components/pmtree/PMNode";
import { NodeType } from "@/api/pdp.api";
import {NodeIcon} from "@/components/pmtree/tree-utils";
import { NodeApi } from "react-arborist";
import { TreeNode } from "@/utils/tree.utils";

export interface GraphPMNodeProps extends PMNodeProps {
  // Additional props can be added here later
}

function NewNodeInput({ node }: { node: NodeApi<TreeNode> }) {
    return (
        <input
            autoFocus
            type="text"
            defaultValue={node.data.name}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => node.reset()}
            onKeyDown={(e) => {
                if (e.key === "Escape") {node.reset();}
                if (e.key === "Enter") {node.submit(e.currentTarget.value);}
            }}
        />
    );
}

export function GraphPMNode(props: GraphPMNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const theme = useMantineTheme();
  const { node } = props;

  // Helper function to get type color without calling hooks
  const getTypeColor = (type: NodeType): string => {
    switch (type) {
      case NodeType.PC:
        return theme.colors.green[9];
      case NodeType.UA:
        return theme.colors.red[6];
      case NodeType.OA:
        return theme.colors.blue[6];
      case NodeType.U:
        return theme.colors.red[3];
      case NodeType.O:
        return theme.colors.blue[3];
      default:
        return theme.colors.gray[5];
    }
  };

  // Get the button types to show on hover
  const getHoverButtons = (): { type: NodeType; label: string }[] => {
    if (node.data.type === NodeType.PC) {
      return [
        { type: NodeType.UA, label: 'UA +' },
        { type: NodeType.OA, label: 'OA +' }
      ];
    } else {
      return [{ type: node.data.type as NodeType, label: `${node.data.type} +` }];
    }
  };

  const handleButtonClick = (nodeType: NodeType) => {
    console.log(`Creating ${nodeType} node for parent: ${node.data.name}`);
    // TODO: Implement node creation logic
  };

  // If this node is in creation mode, show the NewNodeInput instead
  if (node.data.isCreating) {
    return <NewNodeInput node={node} />;
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
    >
      <PMNode {...props} />
      
      {isHovered && (
        <div style={{
          marginLeft: '5px'
        }}>
          <Group gap="xs">
            {getHoverButtons().map(({ type, label }) => (
              <Button
                key={type}
                style={{backgroundColor: getTypeColor(type), height: 18, width: 40, padding: 2}}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleButtonClick(type);
                }}
                title={`Create ${type} node`}
              >
                {type} +
              </Button>
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}