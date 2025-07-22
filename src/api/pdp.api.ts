import { grpc } from '@improbable-eng/grpc-web';

// Generated protobuf imports
import {
  PolicyQueryServiceClientImpl,
} from '@/generated/grpc/v1/pdp_query';
import {
  AdminAdjudicationServiceClientImpl,
} from '@/generated/grpc/v1/pdp_adjudication';

// Message types
import * as PdpQuery from '@/generated/grpc/v1/pdp_query';
import * as PdpAdjudication from '@/generated/grpc/v1/pdp_adjudication';
import * as Model from '@/generated/grpc/v1/model';
import { AdminCommand, CreatePolicyClassCmd, CreateUserAttributeCmd, CreateObjectAttributeCmd, CreateUserCmd, CreateObjectCmd, DeleteNodeCmd, AssignCmd, DeassignCmd, AssociateCmd, DissociateCmd, ExecutePMLCmd, GenericAdminCmd } from '@/generated/grpc/v1/cmd';
import { Empty } from '@/generated/grpc/google/protobuf/empty';

import { grpcConfig, getRequestMetadata, handleGrpcError } from '@/lib/grpc-client';

// === Domain Object Interfaces ===

export enum NodeType {
  PC = 'PC',
  UA = 'UA', 
  OA = 'OA',
  U = 'U',
  O = 'O',
  ANY = 'ANY'
}

export interface PMNode {
  id: string;
  name: string;
  type: NodeType;
  properties: Record<string, string>;
}

export interface Association {
  ua?: PMNode;
  target?: PMNode;
  accessRights: string[];
}

export interface NodePrivilegeInfo {
  node?: PMNode;
  accessRights: string[];
}

export interface Prohibition {
  name: string;
  subject?: {
    node?: PMNode;
    process?: string;
  };
  accessRights: string[];
  intersection: boolean;
  containerConditions: {
    container?: PMNode;
    complement: boolean;
  }[];
}

export interface Obligation {
  name: string;
  author?: PMNode;
  pml: string;
}

// Re-export PMNode as Node for backward compatibility
export type Node = PMNode;

// === Transformation Utilities ===

function transformNodeType(type: Model.NodeType): NodeType {
  switch (type) {
    case Model.NodeType.PC: return NodeType.PC;
    case Model.NodeType.UA: return NodeType.UA;
    case Model.NodeType.OA: return NodeType.OA;
    case Model.NodeType.U: return NodeType.U;
    case Model.NodeType.O: return NodeType.O;
    case Model.NodeType.ANY: return NodeType.ANY;
    default: return NodeType.ANY;
  }
}

function transformNode(node: Model.Node): PMNode {
  return {
    id: node.id,
    name: node.name,
    type: transformNodeType(node.type),
    properties: node.properties
  };
}

function transformAssociation(association: Model.Association): Association {
  return {
    ua: association.ua ? transformNode(association.ua) : undefined,
    target: association.target ? transformNode(association.target) : undefined,
    accessRights: association.arset
  };
}

// Helper function to convert arguments to ValueMap
function argsToValueMap(args: Record<string, any>): Model.ValueMap {
  const valueMap: { [key: string]: Model.Value } = {};
  
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'string') {
        valueMap[key] = Model.Value.create({ stringValue: value });
      } else if (typeof value === 'number') {
        valueMap[key] = Model.Value.create({ int64Value: value.toString() });
      } else if (typeof value === 'boolean') {
        valueMap[key] = Model.Value.create({ boolValue: value });
      } else if (Array.isArray(value)) {
        const valueList = Model.ValueList.create({
          values: value.map(v => 
            typeof v === 'string' 
              ? Model.Value.create({ stringValue: v })
              : Model.Value.create({ stringValue: String(v) })
          )
        });
        valueMap[key] = Model.Value.create({ listValue: valueList });
      } else {
        // For complex objects, convert to string
        valueMap[key] = Model.Value.create({ stringValue: JSON.stringify(value) });
      }
    }
  }
  
  return Model.ValueMap.create({ values: valueMap });
}

// RPC adapter for gRPC-Web that implements the Rpc interface
class GrpcWebRpc {
  private host: string;
  private transport: grpc.TransportFactory;
  private debug: boolean;

  constructor(host: string, transport: grpc.TransportFactory, debug: boolean = false) {
    this.host = host;
    this.transport = transport;
    this.debug = debug;
  }

  unary<T extends grpc.UnaryMethodDefinition<any, any>>(
    methodDesc: T,
    _request: any,
    metadata: grpc.Metadata | undefined
  ): Promise<any> {
    const request = { ..._request, ...methodDesc.requestType };
    const combinedMetadata = metadata || getRequestMetadata();
    
    return new Promise((resolve, reject) => {
      grpc.unary(methodDesc, {
        request,
        host: this.host,
        metadata: combinedMetadata,
        transport: this.transport,
        debug: this.debug,
        onEnd: (response) => {
          if (response.status === grpc.Code.OK) {
            resolve(response.message!.toObject());
          } else {
            reject(handleGrpcError(response.status, response.statusMessage));
          }
        },
      });
    });
  }
}

// Create RPC adapter
const rpc = new GrpcWebRpc(grpcConfig.host, grpcConfig.transport, grpcConfig.debug);

// Initialize service clients
const queryClient = new PolicyQueryServiceClientImpl(rpc);
const adjudicationClient = new AdminAdjudicationServiceClientImpl(rpc);

// === Query Service Methods ===

export namespace QueryService {
  // Access queries
  export async function selfComputePersonalObjectSystem(): Promise<NodePrivilegeInfo[]> {
    const request = Empty.create();
    const response = await queryClient.SelfComputePersonalObjectSystem(request);
    return response.privileges.map((priv: PdpQuery.NodePrivilege) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function selfComputeAdjacentAscendantPrivileges(
    rootId: string
  ): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.SelfAccessWithRootQuery.create({
      root: rootId,
    });
    
    const response = await queryClient.SelfComputeAdjacentAscendantPrivileges(request);
    return response.privileges.map((priv: PdpQuery.NodePrivilege) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function selfComputeAdjacentDescendantPrivileges(
    rootId: string
  ): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.SelfAccessWithRootQuery.create({
      root: rootId,
    });
    
    const response = await queryClient.SelfComputeAdjacentDescendantPrivileges(request);
    return response.privileges.map((priv: PdpQuery.NodePrivilege) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  // === Association Queries ===
  export async function getAssociationsWithSource(nodeId: string): Promise<Association[]> {
    const request = PdpQuery.GetAssociationsQuery.create({ nodeId });
    const response = await queryClient.GetAssociationsWithSource(request);
    return response.associations.map(transformAssociation);
  }

  export async function getAssociationsWithTarget(nodeId: string): Promise<Association[]> {
    const request = PdpQuery.GetAssociationsQuery.create({ nodeId });
    const response = await queryClient.GetAssociationsWithTarget(request);
    return response.associations.map(transformAssociation);
  }

  // === Operation Queries ===
  export async function getResourceOperations(): Promise<Model.StringList> {
    const request = Empty.create();
    return queryClient.GetResourceOperations(request);
  }

  export async function getAdminOperationNames(): Promise<PdpQuery.SignatureList> {
    const result = await queryClient.GetAdminOperationSignatures({});
    return result;
  }

  export async function getAdminOperation(operationName: string): Promise<PdpQuery.Signature> {
    const result = await queryClient.GetAdminOperationSignature({ name: operationName });
    return result;
  }

  // === Routine Queries ===
  export async function getAdminRoutineNames(): Promise<PdpQuery.SignatureList> {
    const result = await queryClient.GetAdminRoutineSignatures({});
    return result;
  }

  export async function getAdminRoutine(routineName: string): Promise<PdpQuery.Signature> {
    const result = await queryClient.GetAdminRoutineSignature({ name: routineName });
    return result;
  }

  // === Prohibition Queries ===
  export async function getProhibitions(): Promise<Prohibition[]> {
    const request = Empty.create();
    const response = await queryClient.GetProhibitions(request);
    return response.prohibitions.map(p => ({
      name: p.name,
      subject: p.subject ? {
        node: p.subject.node ? transformNode(p.subject.node) : undefined,
        process: p.subject.process
      } : undefined,
      accessRights: p.arset,
      intersection: p.intersection,
      containerConditions: p.containerConditions.map(cc => ({
        container: cc.container ? transformNode(cc.container) : undefined,
        complement: cc.complement
      }))
    }));
  }

  // === Obligation Queries ===
  export async function getObligations(): Promise<Obligation[]> {
    const request = Empty.create();
    const response = await queryClient.GetObligations(request);
    return response.obligations.map(o => ({
      name: o.name,
      author: o.author ? transformNode(o.author) : undefined,
      pml: o.pml
    }));
  }
}

// === Adjudication Service Methods ===

export namespace AdjudicationService {
  export async function adjudicateAdminCmd(
    commands: AdminCommand[]
  ): Promise<PdpAdjudication.AdminCmdResponse> {
    const request = PdpAdjudication.AdminCmdRequest.create({
      commands,
    });
    
    return adjudicationClient.AdjudicateAdminCmd(request);
  }

  // === Admin Command Helper Methods ===

  // Node creation commands
  export async function createPolicyClass(name: string): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = CreatePolicyClassCmd.create({ name });
    const adminCmd = AdminCommand.create({
      createPolicyClassCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function createUserAttribute(name: string, descendants: string[] = []): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = CreateUserAttributeCmd.create({
      name,
      descendants,
    });
    const adminCmd = AdminCommand.create({
      createUserAttributeCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function createObjectAttribute(name: string, descendants: string[] = []): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = CreateObjectAttributeCmd.create({
      name,
      descendants,
    });
    const adminCmd = AdminCommand.create({
      createObjectAttributeCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function createUser(name: string, descendants: string[] = []): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = CreateUserCmd.create({
      name,
      descendants,
    });
    const adminCmd = AdminCommand.create({
      createUserCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function createObject(name: string, descendants: string[] = []): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = CreateObjectCmd.create({
      name,
      descendants,
    });
    const adminCmd = AdminCommand.create({
      createObjectCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Node management commands
  export async function deleteNode(id: string): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = DeleteNodeCmd.create({ id });
    const adminCmd = AdminCommand.create({
      deleteNodeCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Assignment commands
  export async function assign(ascendantId: string, descendantIds: string[]): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = AssignCmd.create({
      ascendantId,
      descendantIds,
    });
    const adminCmd = AdminCommand.create({
      assignCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function deassign(ascendantId: string, descendantIds: string[]): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = DeassignCmd.create({
      ascendantId,
      descendantIds,
    });
    const adminCmd = AdminCommand.create({
      deassignCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Association commands
  export async function associate(uaId: string, targetId: string, accessRights: string[]): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = AssociateCmd.create({
      uaId,
      targetId,
      arset: accessRights,
    });
    const adminCmd = AdminCommand.create({
      associateCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function dissociate(uaId: string, targetId: string): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = DissociateCmd.create({
      uaId,
      targetId,
    });
    const adminCmd = AdminCommand.create({
      dissociateCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Execute PML command
  export async function executePML(pml: string): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = ExecutePMLCmd.create({ pml });
    const adminCmd = AdminCommand.create({
      executePmlCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Generic operation and routine execution
  export async function genericAdminCmd(operationName: string, args: Record<string, any>): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = GenericAdminCmd.create({
      opName: operationName,
      args: argsToValueMap(args),
    });
    const adminCmd = AdminCommand.create({
      genericAdminCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function genericRoutineCmd(routineName: string, args: Record<string, any>): Promise<PdpAdjudication.AdminCmdResponse> {
    const cmd = GenericAdminCmd.create({
      opName: routineName,
      args: argsToValueMap(args),
    });
    const adminCmd = AdminCommand.create({
      genericAdminCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }
}

// Export types for convenience
export type Signature = PdpQuery.Signature;
export type ParamType = PdpQuery.ParamType;