import {atom, PrimitiveAtom} from "jotai";
import {TreeApi} from "react-arborist";
import {OpenMap} from "react-arborist/dist/main/state/open-slice";
import {TreeNode} from "@/utils/tree.utils";

export const userTreeDataAtom: PrimitiveAtom<TreeNode[]> = atom<TreeNode[]>([]);
export const userTreeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null> = atom<TreeApi<TreeNode> | null>(null);
export const userOpenTreeNodesAtom: PrimitiveAtom<OpenMap> = atom<OpenMap>({});

export const targetTreeDataAtom: PrimitiveAtom<TreeNode[]> = atom<TreeNode[]>([]);
export const targetTreeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null> = atom<TreeApi<TreeNode> | null>(null);
export const targetOpenTreeNodesAtom: PrimitiveAtom<OpenMap> = atom<OpenMap>({});

// Tree visibility atoms
export const userTreeVisibleAtom: PrimitiveAtom<boolean> = atom<boolean>(true);
export const targetTreeVisibleAtom: PrimitiveAtom<boolean> = atom<boolean>(true);

// Target tree filtering options
export type TargetTreeFilter = 'both' | 'users' | 'objects';
export const targetTreeFilterAtom: PrimitiveAtom<TargetTreeFilter> = atom<TargetTreeFilter>('both');