import {atom, PrimitiveAtom} from "jotai";
import {OpenMap} from "react-arborist/dist/main/state/open-slice";
import {TreeNode} from "@/utils/tree.utils";

// Main tree data atoms
export const userTreeDataAtom: PrimitiveAtom<TreeNode[]> = atom<TreeNode[]>([]);
export const userOpenTreeNodesAtom: PrimitiveAtom<OpenMap> = atom<OpenMap>({});

export const targetTreeDataAtom: PrimitiveAtom<TreeNode[]> = atom<TreeNode[]>([]);
export const targetOpenTreeNodesAtom: PrimitiveAtom<OpenMap> = atom<OpenMap>({});