import { grpc } from '@improbable-eng/grpc-web';
import { BrowserHeaders } from 'browser-headers';

// Generated protobuf imports
import {
  PolicyQueryServiceClientImpl,
} from '@/generated/grpc/pdp_query';
import {
  AdjudicationServiceClientImpl,
  ResourcePDPServiceClientImpl,
} from '@/generated/grpc/pdp_adjudication';
import {
  EPPClientImpl,
} from '@/generated/grpc/epp';

// Message types
import * as PdpQuery from '@/generated/grpc/pdp_query';
import * as PdpAdjudication from '@/generated/grpc/pdp_adjudication';
import * as Model from '@/generated/grpc/model';
import * as Epp from '@/generated/grpc/epp';
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

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  properties: Record<string, string>;
}

export interface Association {
  ua?: Node;
  target?: Node;
  accessRights: string[];
}

export interface NodePrivilegeInfo {
  node?: Node;
  accessRights: string[];
}

export interface UserContext {
  id?: string;
  attributes?: string[];
  process?: string;
}

export interface TargetContext {
  id?: string;
  attributes?: string[];
}

export interface Prohibition {
  name: string;
  node?: Node;
  process?: string;
  accessRights: string[];
  intersection: boolean;
  containerConditions: ContainerCondition[];
}

export interface ContainerCondition {
  container?: Node;
  complement: boolean;
}

export interface Obligation {
  name: string;
  author?: Node;
  pml: string;
}

export interface ExplainAssociation {
  ua?: Node;
  accessRights: string[];
  userPaths: Path[];
}

export interface Path {
  nodes: Node[];
}

export interface ExplainNode {
  node?: Node;
  associations: ExplainAssociation[];
}

export interface ExplainNodePath {
  nodes: ExplainNode[];
}

export interface PolicyClassExplain {
  pc?: Node;
  accessRights: string[];
  paths: ExplainNodePath[];
}

export interface ExplainResult {
  privileges: string[];
  policyClasses: PolicyClassExplain[];
  deniedPrivileges: string[];
  prohibitions: Prohibition[];
}

export interface Subgraph {
  node?: Node;
  subgraph: Subgraph[];
}

export interface SubgraphPrivileges {
  node?: Node;
  accessRights: string[];
  ascendants: SubgraphPrivileges[];
}

export interface CreatedNodeIds {
  nodeIds: Record<string, number>;
}

export interface AdjudicateGenericResult {
  value?: any;
  explain?: ExplainResult;
}

export interface AdjudicateResourceOperationResult {
  node?: Node;
  explain?: ExplainResult;
}

export interface EventContext {
  user: string;
  process: string;
  opName: string;
  args: Array<{
    name: string;
    value: string | string[];
  }>;
}

export interface EPPResult {
  // Define based on actual EPP response structure
  [key: string]: any;
}

// === Transformation Utilities ===

function transformNodeType(type: Model.NodeProto_NodeTypeProto): NodeType {
  switch (type) {
    case Model.NodeProto_NodeTypeProto.PC: return NodeType.PC;
    case Model.NodeProto_NodeTypeProto.UA: return NodeType.UA;
    case Model.NodeProto_NodeTypeProto.OA: return NodeType.OA;
    case Model.NodeProto_NodeTypeProto.U: return NodeType.U;
    case Model.NodeProto_NodeTypeProto.O: return NodeType.O;
    case Model.NodeProto_NodeTypeProto.ANY: return NodeType.ANY;
    default: return NodeType.ANY;
  }
}

function transformNode(node: Model.NodeProto): Node {
  return {
    id: node.id,
    name: node.name,
    type: transformNodeType(node.type),
    properties: node.properties
  };
}

function transformUserContext(ctx: PdpQuery.UserContextProto): UserContext {
  return {
    id: ctx.id,
    attributes: ctx.attributes?.ids,
    process: ctx.process
  };
}

function transformTargetContext(ctx: PdpQuery.TargetContextProto): TargetContext {
  return {
    id: ctx.id,
    attributes: ctx.attributes?.ids,
  };
}

function transformProhibition(prohibition: Model.ProhibitionProto): Prohibition {
  return {
    name: prohibition.name,
    node: prohibition.node ? transformNode(prohibition.node) : undefined,
    process: prohibition.process,
    accessRights: prohibition.arset,
    intersection: prohibition.intersection,
    containerConditions: prohibition.containerConditions.map(cc => ({
      container: cc.container ? transformNode(cc.container) : undefined,
      complement: cc.complement
    }))
  };
}

function transformObligation(obligation: PdpQuery.ObligationProto): Obligation {
  return {
    name: obligation.name,
    author: obligation.author ? transformNode(obligation.author) : undefined,
    pml: obligation.pml
  };
}

function transformAssociation(association: PdpQuery.AssociationProto): Association {
  return {
    ua: association.ua ? transformNode(association.ua) : undefined,
    target: association.target ? transformNode(association.target) : undefined,
    accessRights: association.arset
  };
}

function transformExplainResult(explain: Model.ExplainProto): ExplainResult {
  return {
    privileges: explain.privileges,
    policyClasses: explain.policyClasses.map((pc: any) => ({
      pc: pc.pc ? transformNode(pc.pc) : undefined,
      accessRights: pc.arset,
      paths: pc.paths.map((path: any) => ({
        nodes: path.nodes.map((explainNode: any) => ({
          node: explainNode.node ? transformNode(explainNode.node) : undefined,
          associations: explainNode.associations.map((assoc: any) => ({
            ua: assoc.ua ? transformNode(assoc.ua) : undefined,
            accessRights: assoc.arset,
            userPaths: assoc.userPaths.map((userPath: any) => ({
              nodes: userPath.nodes.map(transformNode)
            }))
          }))
        }))
      }))
    })),
    deniedPrivileges: explain.deniedPrivileges,
    prohibitions: explain.prohibitions.map(transformProhibition)
  };
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
const adjudicationClient = new AdjudicationServiceClientImpl(rpc);
const resourcePDPClient = new ResourcePDPServiceClientImpl(rpc);
const eppClient = new EPPClientImpl(rpc);

// === Query Service Methods ===

export namespace QueryService {
  // Node operations
  export async function nodeExists(idOrName: string | number): Promise<boolean> {
    const request = PdpQuery.IdOrNameQuery.create();
    if (typeof idOrName === 'string') {
      request.name = idOrName;
    } else {
      request.id = idOrName.toString();
    }
    
    const response = await queryClient.NodeExists(request);
    return response.result;
  }

  export async function getNode(idOrName: string): Promise<Node> {
    const request = PdpQuery.IdOrNameQuery.create();
    if (/^\d+$/.test(idOrName)) {
      // If it's all digits, treat as ID
      request.id = idOrName;
    } else {
      // Otherwise treat as name
      request.name = idOrName;
    }
    
    const response = await queryClient.GetNode(request);
    return transformNode(response);
  }

  export async function getNodeId(name: string): Promise<string> {
    const request = PdpQuery.IdOrNameQuery.create({ name });
    const response = await queryClient.GetNodeId(request);
    return response.id;
  }

  export async function searchNodes(
    type: NodeType,
    properties?: Record<string, string>
  ): Promise<Node[]> {
    // Convert domain NodeType to protobuf enum
    let protoType: Model.NodeProto_NodeTypeProto;
    switch (type) {
      case NodeType.PC: protoType = Model.NodeProto_NodeTypeProto.PC; break;
      case NodeType.UA: protoType = Model.NodeProto_NodeTypeProto.UA; break;
      case NodeType.OA: protoType = Model.NodeProto_NodeTypeProto.OA; break;
      case NodeType.U: protoType = Model.NodeProto_NodeTypeProto.U; break;
      case NodeType.O: protoType = Model.NodeProto_NodeTypeProto.O; break;
      case NodeType.ANY: protoType = Model.NodeProto_NodeTypeProto.ANY; break;
      default: protoType = Model.NodeProto_NodeTypeProto.ANY;
    }

    const request = PdpQuery.SearchQuery.create({
      type: protoType,
      properties: properties || {},
    });
    
    const response = await queryClient.SearchNodes(request);
    return response.nodes.map(transformNode);
  }

  export async function getPolicyClasses(): Promise<Node[]> {
    const request = Empty.create();
    const response = await queryClient.GetPolicyClasses(request);
    return response.nodes.map(transformNode);
  }

  // Access queries
  export async function computePrivileges(
    userContext: UserContext,
    targetContext: TargetContext
  ): Promise<string[]> {
    const request = PdpQuery.ComputePrivilegesQuery.create({
      userCtx: {
        id: userContext.id,
        attributes: userContext.attributes ? { ids: userContext.attributes } : undefined,
        process: userContext.process
      },
      targetCtx: {
        id: targetContext.id,
        attributes: targetContext.attributes ? { ids: targetContext.attributes } : undefined
      }
    });
    
    const response = await queryClient.ComputePrivileges(request);
    return response.values;
  }

  export async function computePersonalObjectSystem(
    userContext: UserContext
  ): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.ComputePOSQuery.create({
      userCtx: {
        id: userContext.id,
        attributes: userContext.attributes ? { ids: userContext.attributes } : undefined,
        process: userContext.process
      }
    });
    
    const response = await queryClient.ComputePersonalObjectSystem(request);
    return response.privileges.map(priv => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function computeAdjacentAscendantPrivileges(
    userContext: UserContext,
    rootId: string
  ): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.AccessWithRootQuery.create({
      userCtx: {
        id: userContext.id,
        attributes: userContext.attributes ? { ids: userContext.attributes } : undefined,
        process: userContext.process
      },
      root: rootId,
    });
    
    const response = await queryClient.ComputeAdjacentAscendantPrivileges(request);
    return response.privileges.map(priv => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function computeAdjacentDescendantPrivileges(
    userContext: UserContext,
    rootId: string
  ): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.AccessWithRootQuery.create({
      userCtx: {
        id: userContext.id,
        attributes: userContext.attributes ? { ids: userContext.attributes } : undefined,
        process: userContext.process
      },
      root: rootId,
    });
    
    const response = await queryClient.ComputeAdjacentDescendantPrivileges(request);
    return response.privileges.map(priv => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  // Self access queries (using current user context)
  export async function selfComputePersonalObjectSystem(): Promise<NodePrivilegeInfo[]> {
    const request = Empty.create();
    const response = await queryClient.SelfComputePersonalObjectSystem(request);
    return response.privileges.map(priv => ({
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
    return response.privileges.map(priv => ({
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
    return response.privileges.map(priv => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  // Graph structure queries
  export async function getAdjacentAscendants(nodeId: string): Promise<Node[]> {
    const request = PdpQuery.GetAdjacentAssignmentsQuery.create({
      nodeId: nodeId,
    });
    
    const response = await queryClient.GetAdjacentAscendants(request);
    return response.nodes.map(transformNode);
  }

  export async function getAdjacentDescendants(nodeId: string): Promise<Node[]> {
    const request = PdpQuery.GetAdjacentAssignmentsQuery.create({
      nodeId: nodeId,
    });
    
    const response = await queryClient.GetAdjacentDescendants(request);
    return response.nodes.map(transformNode);
  }

  // Additional query methods
  export async function explain(
    userContext: UserContext,
    targetContext: TargetContext
  ): Promise<ExplainResult> {
    const request = PdpQuery.ExplainQuery.create({
      userCtx: {
        id: userContext.id,
        attributes: userContext.attributes ? { ids: userContext.attributes } : undefined,
        process: userContext.process
      },
      targetCtx: {
        id: targetContext.id,
        attributes: targetContext.attributes ? { ids: targetContext.attributes } : undefined
      }
    });
    
    const response = await queryClient.Explain(request);
    return transformExplainResult(response);
  }

  export async function getProhibitions(): Promise<Prohibition[]> {
    const request = Empty.create();
    const response = await queryClient.GetProhibitions(request);
    return response.prohibitions.map(transformProhibition);
  }

  export async function getObligations(): Promise<Obligation[]> {
    const request = Empty.create();
    const response = await queryClient.GetObligations(request);
    return response.obligations.map(transformObligation);
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

  // === Subgraph Queries ===
  export async function getAscendantSubgraph(nodeId: string): Promise<PdpQuery.SubgraphProto> {
    const request = PdpQuery.GetSubgraphQuery.create({ nodeId });
    return queryClient.GetAscendantSubgraph(request);
  }

  export async function getDescendantSubgraph(nodeId: string): Promise<PdpQuery.SubgraphProto> {
    const request = PdpQuery.GetSubgraphQuery.create({ nodeId });
    return queryClient.GetDescendantSubgraph(request);
  }

  // === Descendant Queries ===
  export async function getAttributeDescendants(nodeId: string): Promise<PdpQuery.NodeList> {
    const request = PdpQuery.GetDescendantsQuery.create({ nodeId });
    return queryClient.GetAttributeDescendants(request);
  }

  export async function getPolicyClassDescendants(nodeId: string): Promise<PdpQuery.NodeList> {
    const request = PdpQuery.GetDescendantsQuery.create({ nodeId });
    return queryClient.GetPolicyClassDescendants(request);
  }

  // === Ancestor/Descendant Relationship Queries ===
  export async function isAscendant(ascendantId: string, descendantId: string): Promise<PdpQuery.BooleanResponse> {
    const request = PdpQuery.IsAncestorQuery.create({ ascendantId, descendantId });
    return queryClient.IsAscendant(request);
  }

  export async function isDescendant(ascendantId: string, descendantId: string): Promise<PdpQuery.BooleanResponse> {
    const request = PdpQuery.IsAncestorQuery.create({ ascendantId, descendantId });
    return queryClient.IsDescendant(request);
  }

  // === Advanced Prohibition Queries ===
  export async function getProhibitionsBySubject(nodeId?: string, process?: string): Promise<PdpQuery.ProhibitionList> {
    const request = PdpQuery.GetProhibitionBySubjectQuery.create({ nodeId, process });
    return queryClient.GetProhibitionsBySubject(request);
  }

  export async function getProhibition(name: string): Promise<Model.ProhibitionProto> {
    const request = PdpQuery.GetByNameQuery.create({ name });
    return queryClient.GetProhibition(request);
  }

  export async function getInheritedProhibitions(subjectId: string): Promise<PdpQuery.ProhibitionList> {
    const request = PdpQuery.GetInheritedProhibitionsQuery.create({ subjectId });
    return queryClient.GetInheritedProhibitions(request);
  }

  export async function getProhibitionsWithContainer(containerId: string): Promise<PdpQuery.ProhibitionList> {
    const request = PdpQuery.GetProhibitionsWithContainerQuery.create({ containerId });
    return queryClient.GetProhibitionsWithContainer(request);
  }

  // === Advanced Obligation Queries ===
  export async function getObligation(name: string): Promise<PdpQuery.ObligationProto> {
    const request = PdpQuery.GetByNameQuery.create({ name });
    return queryClient.GetObligation(request);
  }

  export async function getObligationsByAuthor(authorId: string): Promise<PdpQuery.ObligationList> {
    const request = PdpQuery.GetObligationByAuthorQuery.create({ authorId });
    return queryClient.GetObligationsByAuthor(request);
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

  // === Advanced Access Queries ===
  export async function computeDeniedPrivileges(
    userContext: PdpQuery.UserContextProto,
    targetContext: PdpQuery.TargetContextProto
  ): Promise<Model.StringList> {
    const request = PdpQuery.ComputeDeniedPrivilegesQuery.create({
      userCtx: userContext,
      targetCtx: targetContext,
    });
    
    return queryClient.ComputeDeniedPrivileges(request);
  }

  export async function computeCapabilityList(
    userContext: PdpQuery.UserContextProto
  ): Promise<PdpQuery.AccessQueryMapping> {
    const request = PdpQuery.ComputeCapabilityListQuery.create({
      userCtx: userContext,
    });
    
    return queryClient.ComputeCapabilityList(request);
  }

  export async function computeACL(
    targetContext: PdpQuery.TargetContextProto
  ): Promise<PdpQuery.AccessQueryMapping> {
    const request = PdpQuery.ComputeACLQuery.create({
      targetCtx: targetContext,
    });
    
    return queryClient.ComputeACL(request);
  }

  export async function computeDestinationAttributes(
    userContext: PdpQuery.UserContextProto
  ): Promise<PdpQuery.AccessQueryMapping> {
    const request = PdpQuery.ComputeDestinationAttributesQuery.create({
      userCtx: userContext,
    });
    
    return queryClient.ComputeDestinationAttributes(request);
  }

  export async function computeSubgraphPrivileges(
    userContext: PdpQuery.UserContextProto,
    rootId: string
  ): Promise<PdpQuery.SubgraphPrivilegesProto> {
    const request = PdpQuery.AccessWithRootQuery.create({
      userCtx: userContext,
      root: rootId,
    });
    
    return queryClient.ComputeSubgraphPrivileges(request);
  }

  // === Self Access Queries (Additional) ===
  export async function selfComputePrivileges(
    targetContext: PdpQuery.TargetContextProto
  ): Promise<Model.StringList> {
    return queryClient.SelfComputePrivileges(targetContext);
  }

  export async function selfComputeSubgraphPrivileges(
    rootId: string
  ): Promise<PdpQuery.SubgraphPrivilegesProto> {
    const request = PdpQuery.SelfAccessWithRootQuery.create({
      root: rootId,
    });
    
    return queryClient.SelfComputeSubgraphPrivileges(request);
  }
}

// === Adjudication Service Methods ===

export namespace AdjudicationService {
  export async function adjudicateAdminCmd(
    commands: PdpAdjudication.AdminCommand[]
  ): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const request = PdpAdjudication.AdjudicateAdminCmdRequest.create({
      commands,
    });
    
    return adjudicationClient.AdjudicateAdminCmd(request);
  }

  export async function adjudicateGenericOperation(
    opName: string,
    args: Record<string, any>
  ): Promise<PdpAdjudication.AdjudicateGenericResponse> {
    const argsMap: Record<string, PdpAdjudication.Arg> = {};
    
    Object.entries(args).forEach(([key, value]) => {
      const arg = PdpAdjudication.Arg.create();
      if (typeof value === 'string') {
        arg.stringValue = value;
      } else if (typeof value === 'number') {
        arg.int64Value = value.toString();
      } else if (typeof value === 'boolean') {
        arg.boolValue = value;
      }
      argsMap[key] = arg;
    });

    const request = PdpAdjudication.GenericAdminCmd.create({
      opName,
      args: argsMap,
    });
    
    return adjudicationClient.AdjudicateGenericOperation(request);
  }

  export async function adjudicateGenericRoutine(
    opName: string,
    args: Record<string, any>
  ): Promise<PdpAdjudication.AdjudicateGenericResponse> {
    const argsMap: Record<string, PdpAdjudication.Arg> = {};
    
    Object.entries(args).forEach(([key, value]) => {
      const arg = PdpAdjudication.Arg.create();
      if (typeof value === 'string') {
        arg.stringValue = value;
      } else if (typeof value === 'number') {
        arg.int64Value = value.toString();
      } else if (typeof value === 'boolean') {
        arg.boolValue = value;
      }
      argsMap[key] = arg;
    });

    const request = PdpAdjudication.GenericAdminCmd.create({
      opName,
      args: argsMap,
    });
    
    return adjudicationClient.AdjudicateGenericRoutine(request);
  }

  // === Admin Command Helper Methods ===

  // Node creation commands
  export async function createPolicyClass(name: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreatePolicyClassCmd.create({ name });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createPolicyClassCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function createUserAttribute(name: string, descendants: string[] = []): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreateUserAttributeCmd.create({
      name,
      descendants,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createUserAttributeCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function createObjectAttribute(name: string, descendants: string[] = []): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreateObjectAttributeCmd.create({
      name,
      descendants,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createObjectAttributeCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function createUser(name: string, descendants: string[] = []): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreateUserCmd.create({
      name,
      descendants,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createUserCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function createObject(name: string, descendants: string[] = []): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreateObjectCmd.create({
      name,
      descendants,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createObjectCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Node management commands
  export async function setNodeProperties(id: string, properties: Record<string, string>): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.SetNodePropertiesCmd.create({
      id,
      properties,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      setNodePropertiesCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function deleteNode(id: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.DeleteNodeCmd.create({ id });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      deleteNodeCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Assignment commands
  export async function assign(ascendantId: string, descendantIds: string[]): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.AssignCmd.create({
      ascendantId,
      descendantIds,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      assignCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function deassign(ascendantId: string, descendantIds: string[]): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.DeassignCmd.create({
      ascendantId,
      descendantIds,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      deassignCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Association commands
  export async function associate(uaId: string, targetId: string, accessRights: string[]): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.AssociateCmd.create({
      uaId,
      targetId,
      arset: accessRights,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      associateCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function dissociate(uaId: string, targetId: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.DissociateCmd.create({
      uaId,
      targetId,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      dissociateCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Prohibition commands
  export async function createProhibition(prohibition: {
    name: string;
    nodeId?: string;
    process?: string;
    arset: string[];
    intersection: boolean;
    containerConditions: Array<{
      containerId: string;
      complement: boolean;
    }>;
  }): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreateProhibitionCmd.create(prohibition);
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createProhibitionCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function deleteProhibition(name: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.DeleteProhibitionCmd.create({ name });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      deleteProhibitionCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Obligation commands
  export async function createObligation(pml: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreateObligationCmd.create({ pml });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createObligationCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function deleteObligation(name: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.DeleteObligationCmd.create({ name });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      deleteObligationCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Admin operation commands
  export async function createAdminOperation(pml: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreateAdminOperationCmd.create({ pml });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createAdminOperationCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function deleteAdminOperation(name: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.DeleteAdminOperationCmd.create({ name });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      deleteAdminOperationCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Resource operations command
  export async function setResourceOperations(operations: string[]): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.SetResourceOperationsCmd.create({
      operations,
    });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      setResourceOperationsCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Admin routine commands
  export async function createAdminRoutine(pml: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.CreateAdminRoutineCmd.create({ pml });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      createAdminRoutineCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  export async function deleteAdminRoutine(name: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.DeleteAdminRoutineCmd.create({ name });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      deleteAdminRoutineCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Execute PML command
  export async function executePML(pml: string): Promise<PdpAdjudication.CreatedNodeIdsResponse> {
    const cmd = PdpAdjudication.ExecutePMLCmd.create({ pml });
    const adminCmd = PdpAdjudication.AdminCommand.create({
      executePmlCmd: cmd,
    });
    
    return adjudicateAdminCmd([adminCmd]);
  }

  // Generic command helper
  export async function executeGeneric(opName: string, args: Record<string, any>): Promise<PdpAdjudication.AdjudicateGenericResponse> {
    return adjudicateGenericOperation(opName, args);
  }
}

// === Resource PDP Service Methods ===

export namespace ResourcePDPService {
  export async function adjudicateResourceOperation(
    operation: string,
    targetId: string
  ): Promise<PdpAdjudication.AdjudicateGenericResponse> {
    return AdjudicationService.adjudicateGenericOperation(operation, { targetId });
  }
}

// === EPP Service Methods ===

export namespace EPPService {
  export async function processEvent(
    user: string,
    process: string,
    opName: string,
    args: Array<{ name: string; value: string | string[] }>
  ): Promise<Epp.EPPResponse> {
    const argsList = args.map(arg => {
      const eventArg = Epp.EventContextArg.create({
        name: arg.name,
      });
      
      if (Array.isArray(arg.value)) {
        eventArg.listValue = Model.StringList.create({
          values: arg.value,
        });
      } else {
        eventArg.stringValue = arg.value;
      }
      
      return eventArg;
    });

    const request = Epp.EventContextProto.create({
      user,
      process,
      opName,
      args: argsList,
    });
    
    return eppClient.processEvent(request);
  }
}

// Export service clients for advanced usage
export { queryClient, adjudicationClient, resourcePDPClient, eppClient };

// Export types for convenience
export type UserContextProto = PdpQuery.UserContextProto;
export type TargetContextProto = PdpQuery.TargetContextProto;
export type NodePrivilegeList = PdpQuery.NodePrivilegeList;
export type NodePrivilege = PdpQuery.NodePrivilege;

export type NodeProto = Model.NodeProto;
export type ProhibitionProto = Model.ProhibitionProto;
export type ExplainProto = Model.ExplainProto;
export type StringList = Model.StringList;

export type AdminCommand = PdpAdjudication.AdminCommand;
export type CreatedNodeIdsResponse = PdpAdjudication.CreatedNodeIdsResponse;
export type AdjudicateGenericResponse = PdpAdjudication.AdjudicateGenericResponse;

export type EventContextProto = Epp.EventContextProto;
export type EPPResponse = Epp.EPPResponse;

export type SignatureList = PdpQuery.SignatureList;
export type Signature = PdpQuery.Signature;
export type AssociationProto = PdpQuery.AssociationProto;
export type AssociationList = PdpQuery.AssociationList;
export type SubgraphProto = PdpQuery.SubgraphProto;
export type SubgraphPrivilegesProto = PdpQuery.SubgraphPrivilegesProto;
export type ObligationProto = PdpQuery.ObligationProto;
export type AccessQueryMapping = PdpQuery.AccessQueryMapping;
export type BooleanResponse = PdpQuery.BooleanResponse;
export type NodeList = PdpQuery.NodeList;
export type NodeIdResponse = PdpQuery.NodeIdResponse;
export type ProhibitionList = PdpQuery.ProhibitionList;
export type ObligationList = PdpQuery.ObligationList;