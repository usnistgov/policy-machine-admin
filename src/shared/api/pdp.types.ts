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
  isConjunctive: boolean;
  inclusionSet: PMNode[];
  exclusionSet: PMNode[];
}

export interface Obligation {
  name: string;
  author?: PMNode;
  pml: string;
}

export type Node = PMNode;

export type { Signature, ParamType } from '@/generated/grpc/v1/pdp_query';
export type { AdminOperationCommand } from '@/generated/grpc/v1/cmd';
export type { OperationRequest, AdjudicateOperationResponse, RoutineRequest, AdjudicateRoutineResponse } from '@/generated/grpc/v1/pdp_adjudication';
export * as Model from '@/generated/grpc/v1/model';
