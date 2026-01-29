import * as Model from '@/generated/grpc/v1/model';
import { AdminAdjudicationServiceClientImpl, ResourceAdjudicationServiceClientImpl } from '@/generated/grpc/v1/pdp_adjudication';
import * as PdpAdjudication from '@/generated/grpc/v1/pdp_adjudication';
import {
  AdminOperationCommand,
  AssignCmd,
  AssociateCmd,
  CreateObjectAttributeCmd,
  CreateObjectCmd,
  CreatePolicyClassCmd,
  CreateProhibitionCmd,
  CreateUserAttributeCmd,
  CreateUserCmd,
  DeassignCmd,
  DeleteNodeCmd,
  DeleteObligationCmd,
  DeleteProhibitionCmd,
  DissociateCmd,
  ExecutePMLCmd,
  SetNodePropertiesCmd,
  SetResourceAccessRightsCmd,
  DeleteOperationCmd,
  DeserializeCmd
} from '@/generated/grpc/v1/cmd';
import { rpc, createNodeRef, argsToValueMap } from './pdp.utils';

const adjudicationClient = new AdminAdjudicationServiceClientImpl(rpc);
const resourceAdjudicationClient = new ResourceAdjudicationServiceClientImpl(rpc);

// === Adjudication Methods ===

export async function adjudicateOperation(
  operationName: string,
  args: Record<string, any>
): Promise<PdpAdjudication.AdjudicateOperationResponse> {
  const request = PdpAdjudication.OperationRequest.create({
    opName: operationName,
    args: argsToValueMap(args),
  });

  return adjudicationClient.adjudicateOperation(request);
}

export async function adjudicateRoutine(
  commands: AdminOperationCommand[]
): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
  const request = PdpAdjudication.RoutineRequest.create({
    commands,
  });

  return adjudicationClient.adjudicateRoutine(request);
}

export async function adjudicateResourceOperation(
  operationName: string,
  args: Record<string, any>
): Promise<PdpAdjudication.AdjudicateOperationResponse> {
  const request = PdpAdjudication.OperationRequest.create({
    opName: operationName,
    args: argsToValueMap(args),
  });

  return resourceAdjudicationClient.adjudicateResourceOperation(request);
}

// === Node Creation Commands ===

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

// === Node Management Commands ===

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

// === Assignment Commands ===

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

// === Association Commands ===

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

// === PML Commands ===

export async function executePML(pml: string): Promise<PdpAdjudication.AdjudicateRoutineResponse> {
  const cmd = ExecutePMLCmd.create({ pml });
  const adminCmd = AdminOperationCommand.create({
    executePmlCmd: cmd,
  });

  return adjudicateRoutine([adminCmd]);
}

// === Resource Access Rights Commands ===

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
