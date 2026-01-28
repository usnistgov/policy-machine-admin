import { grpc } from '@improbable-eng/grpc-web';
import { AdminOperationCommand, AssignCmd, AssociateCmd, CreateObjectAttributeCmd, CreateObjectCmd, CreatePolicyClassCmd, CreateProhibitionCmd, CreateUserAttributeCmd, CreateUserCmd, DeassignCmd, DeleteNodeCmd, DeleteObligationCmd, DeleteProhibitionCmd, DissociateCmd, ExecutePMLCmd, SetNodePropertiesCmd, SetResourceAccessRightsCmd, DeleteOperationCmd, DeserializeCmd } from '@/generated/grpc/v1/cmd';
import * as Model from '@/generated/grpc/v1/model';
import { AdminAdjudicationServiceClientImpl, ResourceAdjudicationServiceClientImpl } from '@/generated/grpc/v1/pdp_adjudication';
import * as PdpAdjudication from '@/generated/grpc/v1/pdp_adjudication';
// Generated protobuf imports
import { PolicyQueryServiceClientImpl } from '@/generated/grpc/v1/pdp_query';
// Message types
import * as PdpQuery from '@/generated/grpc/v1/pdp_query';
import { getRequestMetadata, grpcConfig, handleGrpcError } from '@/lib/grpc-client';


// === Domain Object Interfaces ===

export enum NodeType {
  PC = 'PC',
  UA = 'UA',
  OA = 'OA',
  U = 'U',
  O = 'O',
  ANY = 'ANY'
}

export const NODE_TYPES = [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O];

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

// Helper function to create NodeRef from ID
function createNodeRef(id: string): Model.NodeRef {
  return Model.NodeRef.create({ id });
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

  const toModelValue = (value: any): Model.Value | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return Model.Value.create({ stringValue: value });
    }

    if (typeof value === 'number') {
      return Model.Value.create({ int64Value: value.toString() });
    }

    if (typeof value === 'boolean') {
      return Model.Value.create({ boolValue: value });
    }

    if (Array.isArray(value)) {
      const convertedItems = value
        .map(item => toModelValue(item))
        .filter((item): item is Model.Value => item !== undefined);

      return Model.Value.create({
        listValue: Model.ValueList.create({ values: convertedItems })
      });
    }

    if (typeof value === 'object') {
      const entries: Record<string, Model.Value> = {};
      for (const [entryKey, entryValue] of Object.entries(value)) {
        const converted = toModelValue(entryValue);
        if (converted !== undefined) {
          entries[String(entryKey)] = converted;
        }
      }

      return Model.Value.create({
        mapValue: Model.ValueMap.create({ values: entries })
      });
    }

    return Model.Value.create({ stringValue: String(value) });
  };

  for (const [key, rawValue] of Object.entries(args)) {
    const converted = toModelValue(rawValue);
    if (converted !== undefined) {
      valueMap[key] = converted;
    }
  }

  return Model.ValueMap.create({ values: valueMap });
}

// RPC adapter for gRPC-Web that implements the Rpc interface
class GrpcWebRpc {
  private host: string;
  private transport: grpc.TransportFactory;
  private debug: boolean;
  private timeout: number;

  constructor(host: string, transport: grpc.TransportFactory, debug: boolean = false, timeout: number = 60000) {
    this.host = host;
    this.transport = transport;
    this.debug = debug;
    this.timeout = timeout;
  }

  unary<T extends grpc.UnaryMethodDefinition<any, any>>(
    methodDesc: T,
    _request: any,
    metadata: grpc.Metadata | undefined
  ): Promise<any> {
    const request = { ..._request, ...methodDesc.requestType };
    const combinedMetadata = metadata || getRequestMetadata();

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      }, this.timeout);

      grpc.unary(methodDesc, {
        request,
        host: this.host,
        metadata: combinedMetadata,
        transport: this.transport,
        debug: this.debug,
        onEnd: (response) => {
          clearTimeout(timeoutId);

          if (this.debug) {
            console.log('[gRPC] Response received:', {
              status: response.status,
              statusMessage: response.statusMessage,
              hasMessage: !!response.message,
              trailers: response.trailers
            });
          }

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
const rpc = new GrpcWebRpc(grpcConfig.host, grpcConfig.transport, grpcConfig.debug, grpcConfig.timeout);

// Initialize service clients
const queryClient = new PolicyQueryServiceClientImpl(rpc);
const adjudicationClient = new AdminAdjudicationServiceClientImpl(rpc);
const resourceAdjudicationClient = new ResourceAdjudicationServiceClientImpl(rpc);

// === Query Service Methods ===

export namespace QueryService {
  // === Node Queries ===
  export async function nodeExists(id: string): Promise<boolean> {
    const request = PdpQuery.NodeExistsRequest.create({ node: createNodeRef(id) });
    const response = await queryClient.NodeExists(request);
    return response.exists;
  }

  export async function getNode(id: string): Promise<PMNode> {
    const request = PdpQuery.GetNodeRequest.create({ node: createNodeRef(id) });
    const response = await queryClient.GetNode(request);
    return transformNode(response.node!);
  }

  export async function getNodeId(name: string): Promise<string> {
    const request = PdpQuery.GetNodeIdRequest.create({ name });
    const response = await queryClient.GetNodeId(request);
    return response.id;
  }

  export async function searchNodes(type: NodeType, properties?: Record<string, string>): Promise<PMNode[]> {
    const request = PdpQuery.SearchNodesRequest.create({
      type: Model.NodeType[type],
      properties: properties || {}
    });
    const response = await queryClient.SearchNodes(request);
    return response.nodes.map(transformNode);
  }

  // === Graph Queries ===
  export async function getPolicyClasses(): Promise<PMNode[]> {
    const request = PdpQuery.GetPolicyClassesRequest.create({});
    const response = await queryClient.GetPolicyClasses(request);
    return response.policyClasses.map(transformNode);
  }

  export async function getAdjacentDescendants(nodeId: string): Promise<PMNode[]> {
    const request = PdpQuery.GetAdjacentDescendantsRequest.create({ node: createNodeRef(nodeId) });
    const response = await queryClient.GetAdjacentDescendants(request);
    return response.nodes.map(transformNode);
  }

  export async function getAdjacentAscendants(nodeId: string): Promise<PMNode[]> {
    const request = PdpQuery.GetAdjacentAscendantsRequest.create({ node: createNodeRef(nodeId) });
    const response = await queryClient.GetAdjacentAscendants(request);
    return response.nodes.map(transformNode);
  }

  export async function getAscendantSubgraph(nodeId: string): Promise<PdpQuery.Subgraph | undefined> {
    const request = PdpQuery.GetAscendantSubgraphRequest.create({ node: createNodeRef(nodeId) });
    const response = await queryClient.GetAscendantSubgraph(request);
    return response.subgraph;
  }

  export async function getDescendantSubgraph(nodeId: string): Promise<PdpQuery.Subgraph | undefined> {
    const request = PdpQuery.GetDescendantSubgraphRequest.create({ node: createNodeRef(nodeId) });
    const response = await queryClient.GetDescendantSubgraph(request);
    return response.subgraph;
  }

  export async function getAttributeDescendants(attributeId: string): Promise<PMNode[]> {
    const request = PdpQuery.GetAttributeDescendantsRequest.create({ node: createNodeRef(attributeId) });
    const response = await queryClient.GetAttributeDescendants(request);
    return response.nodes.map(transformNode);
  }

  export async function getPolicyClassDescendants(policyClassId: string): Promise<PMNode[]> {
    const request = PdpQuery.GetPolicyClassDescendantsRequest.create({ node: createNodeRef(policyClassId) });
    const response = await queryClient.GetPolicyClassDescendants(request);
    return response.nodes.map(transformNode);
  }

  export async function isAscendant(ascendantId: string, descendantId: string): Promise<boolean> {
    const request = PdpQuery.IsAscendantRequest.create({
      ascendant: createNodeRef(ascendantId),
      descendant: createNodeRef(descendantId)
    });
    const response = await queryClient.IsAscendant(request);
    return response.result;
  }

  export async function isDescendant(descendantId: string, ascendantId: string): Promise<boolean> {
    const request = PdpQuery.IsDescendantRequest.create({
      descendant: createNodeRef(descendantId),
      ascendant: createNodeRef(ascendantId)
    });
    const response = await queryClient.IsDescendant(request);
    return response.result;
  }

  // === Association Queries ===
  export async function getAssociationsWithSource(nodeId: string): Promise<Association[]> {
    const request = PdpQuery.GetAssociationsWithSourceRequest.create({ node: createNodeRef(nodeId) });
    const response = await queryClient.GetAssociationsWithSource(request);
    return response.associations.map(transformAssociation);
  }

  export async function getAssociationsWithTarget(nodeId: string): Promise<Association[]> {
    const request = PdpQuery.GetAssociationsWithTargetRequest.create({ node: createNodeRef(nodeId) });
    const response = await queryClient.GetAssociationsWithTarget(request);
    return response.associations.map(transformAssociation);
  }

  // === Prohibition Queries ===
  export async function getProhibitions(): Promise<Prohibition[]> {
    const request = PdpQuery.GetProhibitionsRequest.create({});
    const response = await queryClient.GetProhibitions(request);
    return response.prohibitions.map(p => ({
      name: p.name,
      subject: p.node ? {
        node: p.node ? transformNode(p.node) : undefined,
        process: p.process
      } : undefined,
      accessRights: p.arset,
      intersection: p.intersection,
      containerConditions: p.containerConditions.map(cc => ({
        container: cc.container ? transformNode(cc.container) : undefined,
        complement: cc.complement
      }))
    }));
  }

  export async function getProhibitionsBySubject(subjectId: string): Promise<Prohibition[]> {
    const request = PdpQuery.GetProhibitionsBySubjectRequest.create({ node: createNodeRef(subjectId) });
    const response = await queryClient.GetProhibitionsBySubject(request);
    return response.prohibitions.map(p => ({
      name: p.name,
      subject: p.node ? {
        node: p.node ? transformNode(p.node) : undefined,
        process: p.process
      } : undefined,
      accessRights: p.arset,
      intersection: p.intersection,
      containerConditions: p.containerConditions.map(cc => ({
        container: cc.container ? transformNode(cc.container) : undefined,
        complement: cc.complement
      }))
    }));
  }

  export async function getProhibition(name: string): Promise<Prohibition> {
    const request = PdpQuery.GetProhibitionRequest.create({ name });
    const response = await queryClient.GetProhibition(request);
    const p = response.prohibition!;
    return {
      name: p.name,
      subject: p.node ? {
        node: p.node ? transformNode(p.node) : undefined,
        process: p.process
      } : undefined,
      accessRights: p.arset,
      intersection: p.intersection,
      containerConditions: p.containerConditions.map(cc => ({
        container: cc.container ? transformNode(cc.container) : undefined,
        complement: cc.complement
      }))
    };
  }

  export async function getInheritedProhibitions(nodeId: string): Promise<Prohibition[]> {
    const request = PdpQuery.GetInheritedProhibitionsRequest.create({ subject: createNodeRef(nodeId) });
    const response = await queryClient.GetInheritedProhibitions(request);
    return response.prohibitions.map(p => ({
      name: p.name,
      subject: p.node ? {
        node: p.node ? transformNode(p.node) : undefined,
        process: p.process
      } : undefined,
      accessRights: p.arset,
      intersection: p.intersection,
      containerConditions: p.containerConditions.map(cc => ({
        container: cc.container ? transformNode(cc.container) : undefined,
        complement: cc.complement
      }))
    }));
  }

  export async function getProhibitionsWithContainer(containerId: string): Promise<Prohibition[]> {
    const request = PdpQuery.GetProhibitionsWithContainerRequest.create({ container: createNodeRef(containerId) });
    const response = await queryClient.GetProhibitionsWithContainer(request);
    return response.prohibitions.map(p => ({
      name: p.name,
      subject: p.node ? {
        node: p.node ? transformNode(p.node) : undefined,
        process: p.process
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
    const request = PdpQuery.GetObligationsRequest.create({});
    const response = await queryClient.GetObligations(request);
    return response.obligations.map(o => ({
      name: o.name,
      author: o.author ? transformNode(o.author) : undefined,
      pml: o.pml
    }));
  }

  export async function getObligation(name: string): Promise<Obligation> {
    const request = PdpQuery.GetObligationRequest.create({ name });
    const response = await queryClient.GetObligation(request);
    const o = response.obligation!;
    return {
      name: o.name,
      author: o.author ? transformNode(o.author) : undefined,
      pml: o.pml
    };
  }

  export async function getObligationsByAuthor(authorId: string): Promise<Obligation[]> {
    const request = PdpQuery.GetObligationsByAuthorRequest.create({ author: createNodeRef(authorId) });
    const response = await queryClient.GetObligationsByAuthor(request);
    return response.obligations.map(o => ({
      name: o.name,
      author: o.author ? transformNode(o.author) : undefined,
      pml: o.pml
    }));
  }

  // === Operation Queries ===
  export async function getResourceAccessRights(): Promise<string[]> {
    const request = PdpQuery.GetResourceAccessRightsRequest.create({});
    const response = await queryClient.GetResourceAccessRights(request);
    return response.accessRights;
  }

  export async function getResourceOperationSignatures(): Promise<PdpQuery.Signature[]> {
    const request = PdpQuery.GetResourceOperationSignaturesRequest.create({});
    const response = await queryClient.GetResourceOperationSignatures(request);
    return response.signatures;
  }

  export async function getResourceOperationSignature(name: string): Promise<PdpQuery.Signature> {
    const request = PdpQuery.GetResourceOperationSignatureRequest.create({ name });
    const response = await queryClient.GetResourceOperationSignature(request);
    return response.signature!;
  }

  export async function getAdminOperationSignatures(): Promise<PdpQuery.Signature[]> {
    const request = PdpQuery.GetAdminOperationSignaturesRequest.create({});
    const response = await queryClient.GetAdminOperationSignatures(request);
    return response.signatures;
  }

  export async function getAdminOperationSignature(name: string): Promise<PdpQuery.Signature> {
    const request = PdpQuery.GetAdminOperationSignatureRequest.create({ name });
    const response = await queryClient.GetAdminOperationSignature(request);
    return response.signature!;
  }

  // === Routine Queries ===
  export async function getRoutineSignatures(): Promise<PdpQuery.Signature[]> {
    const request = PdpQuery.GetRoutineSignaturesRequest.create({});
    const response = await queryClient.GetRoutineSignatures(request);
    return response.signatures;
  }

  export async function getRoutineSignature(name: string): Promise<PdpQuery.Signature> {
    const request = PdpQuery.GetRoutineSignatureRequest.create({ name });
    const response = await queryClient.GetRoutineSignature(request);
    return response.signature!;
  }

  // === Query/Function Queries ===
  export async function getQuerySignatures(): Promise<PdpQuery.Signature[]> {
    const request = PdpQuery.GetQuerySignaturesRequest.create({});
    const response = await queryClient.GetQuerySignatures(request);
    return response.signatures;
  }

  export async function getQuerySignature(name: string): Promise<PdpQuery.Signature> {
    const request = PdpQuery.GetQuerySignatureRequest.create({ name });
    const response = await queryClient.GetQuerySignature(request);
    return response.signature!;
  }

  export async function getFunctionSignatures(): Promise<PdpQuery.Signature[]> {
    const request = PdpQuery.GetFunctionSignaturesRequest.create({});
    const response = await queryClient.GetFunctionSignatures(request);
    return response.signatures;
  }

  export async function getFunctionSignature(name: string): Promise<PdpQuery.Signature> {
    const request = PdpQuery.GetFunctionSignatureRequest.create({ name });
    const response = await queryClient.GetFunctionSignature(request);
    return response.signature!;
  }

  // === Access Control Queries ===
  export async function computePrivileges(userId: string, targetId: string): Promise<string[]> {
    const request = PdpQuery.ComputePrivilegesRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) }),
      targetCtx: PdpQuery.TargetContext.create({ targetNode: createNodeRef(targetId) })
    });
    const response = await queryClient.ComputePrivileges(request);
    return response.privileges;
  }

  export async function computeDeniedPrivileges(userId: string, targetId: string): Promise<string[]> {
    const request = PdpQuery.ComputeDeniedPrivilegesRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) }),
      targetCtx: PdpQuery.TargetContext.create({ targetNode: createNodeRef(targetId) })
    });
    const response = await queryClient.ComputeDeniedPrivileges(request);
    return response.privileges;
  }

  export async function computeCapabilityList(userId: string): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.ComputeCapabilityListRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) })
    });
    const response = await queryClient.ComputeCapabilityList(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function computeACL(targetId: string): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.ComputeACLRequest.create({
      targetCtx: PdpQuery.TargetContext.create({ targetNode: createNodeRef(targetId) })
    });
    const response = await queryClient.ComputeACL(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function computeDestinationAttributes(userId: string): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.ComputeDestinationAttributesRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) })
    });
    const response = await queryClient.ComputeDestinationAttributes(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function computeSubgraphPrivileges(userId: string, rootId: string): Promise<PdpQuery.SubgraphPrivileges | undefined> {
    const request = PdpQuery.ComputeSubgraphPrivilegesRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) }),
      root: createNodeRef(rootId)
    });
    const response = await queryClient.ComputeSubgraphPrivileges(request);
    return response.subgraphPrivileges;
  }

  export async function computeAdjacentAscendantPrivileges(userId: string, rootId: string): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.ComputeAdjacentAscendantPrivilegesRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) }),
      root: createNodeRef(rootId)
    });
    const response = await queryClient.ComputeAdjacentAscendantPrivileges(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function computeAdjacentDescendantPrivileges(userId: string, rootId: string): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.ComputeAdjacentDescendantPrivilegesRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) }),
      root: createNodeRef(rootId)
    });
    const response = await queryClient.ComputeAdjacentDescendantPrivileges(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function explain(userId: string, targetId: string): Promise<PdpQuery.ExplainResponse> {
    const request = PdpQuery.ExplainRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) }),
      targetCtx: PdpQuery.TargetContext.create({ targetNode: createNodeRef(targetId) })
    });
    return queryClient.Explain(request);
  }

  export async function computePersonalObjectSystem(userId: string): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.ComputePersonalObjectSystemRequest.create({
      userCtx: PdpQuery.UserContext.create({ userNode: createNodeRef(userId) })
    });
    const response = await queryClient.ComputePersonalObjectSystem(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  // === Self Access Control Queries ===
  export async function selfComputePrivileges(targetId: string): Promise<string[]> {
    const request = PdpQuery.SelfComputePrivilegesRequest.create({
      targetCtx: PdpQuery.TargetContext.create({ targetNode: createNodeRef(targetId) })
    });
    const response = await queryClient.SelfComputePrivileges(request);
    return response.privileges;
  }

  export async function selfComputeSubgraphPrivileges(rootId: string): Promise<PdpQuery.SubgraphPrivileges | undefined> {
    const request = PdpQuery.SelfComputeSubgraphPrivilegesRequest.create({ root: createNodeRef(rootId) });
    const response = await queryClient.SelfComputeSubgraphPrivileges(request);
    return response.subgraphPrivileges;
  }

  export async function selfComputeAdjacentAscendantPrivileges(rootId: string): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.SelfComputeAdjacentAscendantPrivilegesRequest.create({ root: createNodeRef(rootId) });
    const response = await queryClient.SelfComputeAdjacentAscendantPrivileges(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function selfComputeAdjacentDescendantPrivileges(rootId: string): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.SelfComputeAdjacentDescendantPrivilegesRequest.create({ root: createNodeRef(rootId) });
    const response = await queryClient.SelfComputeAdjacentDescendantPrivileges(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  export async function selfComputePersonalObjectSystem(): Promise<NodePrivilegeInfo[]> {
    const request = PdpQuery.SelfComputePersonalObjectSystemRequest.create({});
    const response = await queryClient.SelfComputePersonalObjectSystem(request);
    return response.nodePrivileges.map((priv: PdpQuery.NodePrivileges) => ({
      node: priv.node ? transformNode(priv.node) : undefined,
      accessRights: priv.arset
    }));
  }

  // === Serialization ===
  export async function serialize(format: Model.SerializationFormat): Promise<string> {
    const request = PdpQuery.SerializeRequest.create({ format });
    const response = await queryClient.Serialize(request);
    return response.serialized;
  }
}

// === Adjudication Service Methods ===

export namespace AdjudicationService {
  // New adjudication methods for operations and routines
  export async function adjudicateOperation(
    operationName: string,
    args: Record<string, any>
  ): Promise<PdpAdjudication.AdjudicateOperationResponse> {
    const request = PdpAdjudication.OperationRequest.create({
      opName: operationName,
      args: argsToValueMap(args),
    });

    return adjudicationClient.AdjudicateOperation(request);
  }

  export async function adjudicateRoutine(
    commands: AdminOperationCommand[]
  ): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const request = PdpAdjudication.RoutineRequest.create({
      commands,
    });

    return adjudicationClient.AdjudicateRoutine(request);
  }

  export async function adjudicateResourceOperation(
    operationName: string,
    args: Record<string, any>
  ): Promise<PdpAdjudication.AdjudicateOperationResponse> {
    const request = PdpAdjudication.OperationRequest.create({
      opName: operationName,
      args: argsToValueMap(args),
    });

    return resourceAdjudicationClient.AdjudicateResourceOperation(request);
  }

  // === Admin Command Helper Methods ===

  // Node creation commands
  export async function createPolicyClass(name: string): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = CreatePolicyClassCmd.create({ name });
    const adminCmd = AdminOperationCommand.create({
      createPolicyClassCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function createUserAttribute(name: string, descendants: string[] = []): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = CreateUserAttributeCmd.create({
      name,
      descendants: descendants.map(createNodeRef),
    });
    const adminCmd = AdminOperationCommand.create({
      createUserAttributeCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function createObjectAttribute(name: string, descendants: string[] = []): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = CreateObjectAttributeCmd.create({
      name,
      descendants: descendants.map(createNodeRef),
    });
    const adminCmd = AdminOperationCommand.create({
      createObjectAttributeCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function createUser(name: string, descendants: string[] = []): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = CreateUserCmd.create({
      name,
      descendants: descendants.map(createNodeRef),
    });
    const adminCmd = AdminOperationCommand.create({
      createUserCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function createObject(name: string, descendants: string[] = []): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = CreateObjectCmd.create({
      name,
      descendants: descendants.map(createNodeRef),
    });
    const adminCmd = AdminOperationCommand.create({
      createObjectCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  // Node management commands
  export async function deleteNode(id: string): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = DeleteNodeCmd.create({ node: createNodeRef(id) });
    const adminCmd = AdminOperationCommand.create({
      deleteNodeCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function setNodeProperties(id: string, properties: Record<string, string>): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = SetNodePropertiesCmd.create({
      node: createNodeRef(id),
      properties,
    });
    const adminCmd = AdminOperationCommand.create({
      setNodePropertiesCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  // Assignment commands
  export async function assign(ascendantId: string, descendantIds: string[]): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = AssignCmd.create({
      ascendant: createNodeRef(ascendantId),
      descendants: descendantIds.map(createNodeRef),
    });
    const adminCmd = AdminOperationCommand.create({
      assignCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function deassign(ascendantId: string, descendantIds: string[]): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = DeassignCmd.create({
      ascendant: createNodeRef(ascendantId),
      descendants: descendantIds.map(createNodeRef),
    });
    const adminCmd = AdminOperationCommand.create({
      deassignCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  // Association commands
  export async function associate(uaId: string, targetId: string, accessRights: string[]): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = AssociateCmd.create({
      ua: createNodeRef(uaId),
      target: createNodeRef(targetId),
      arset: accessRights,
    });
    const adminCmd = AdminOperationCommand.create({
      associateCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function dissociate(uaId: string, targetId: string): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = DissociateCmd.create({
      ua: createNodeRef(uaId),
      target: createNodeRef(targetId),
    });
    const adminCmd = AdminOperationCommand.create({
      dissociateCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  // Execute PML command
  export async function executePML(pml: string): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = ExecutePMLCmd.create({ pml });
    const adminCmd = AdminOperationCommand.create({
      executePmlCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  // Resource access rights commands
  export async function setResourceAccessRights(accessRights: string[]): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = SetResourceAccessRightsCmd.create({ accessRights });
    const adminCmd = AdminOperationCommand.create({
      setResourceOperationsCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function deleteAdminOperation(name: string): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = DeleteOperationCmd.create({ name });
    const adminCmd = AdminOperationCommand.create({
      deleteAdminOperationCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function deserialize(serialized: string, format: Model.SerializationFormat): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = DeserializeCmd.create({ serialized, format });
    const adminCmd = AdminOperationCommand.create({
      deserializeCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  // === Prohibition Commands ===

  export async function createProhibition(
    name: string,
    subjectNodeId: string | undefined,
    subjectProcess: string | undefined,
    accessRights: string[],
    intersection: boolean,
    containerConditions: Array<{ containerId: string; complement: boolean }>
  ): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = CreateProhibitionCmd.create({
      name,
      node: subjectNodeId ? createNodeRef(subjectNodeId) : undefined,
      process: subjectProcess,
      arset: accessRights,
      intersection,
      containerConditions: containerConditions.map(cc => ({
        container: createNodeRef(cc.containerId),
        complement: cc.complement
      }))
    });
    const adminCmd = AdminOperationCommand.create({
      createProhibitionCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  export async function deleteProhibition(name: string): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = DeleteProhibitionCmd.create({ name });
    const adminCmd = AdminOperationCommand.create({
      deleteProhibitionCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

  // === Obligation Commands ===

  export async function createObligation(
    name: string,
    authorNodeId: string,
    pml: string
  ): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    // Use PML execution to create obligation
    const obligationPML = `obligation "${name}" {
  author: "${authorNodeId}"
  ${pml}
}`;

    return executePML(obligationPML);
  }

  export async function deleteObligation(name: string): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
    const cmd = DeleteObligationCmd.create({ name });
    const adminCmd = AdminOperationCommand.create({
      deleteObligationCmd: cmd,
    });

    return adjudicateRoutine([adminCmd]);
  }

}

// Export types for convenience
export type Signature = PdpQuery.Signature;
export type ParamType = PdpQuery.ParamType;
export type { AdminOperationCommand };
export type { OperationRequest, AdjudicateOperationResponse, RoutineRequest, AdjudicateRoutineResponse } from '@/generated/grpc/v1/pdp_adjudication';
export { Model };
