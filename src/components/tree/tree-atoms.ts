import { atom } from 'jotai';
import { TreeNode } from "@/utils/tree.utils";

// Create atoms to track descendant nodes and selected user node
export const descendantNodesAtom = atom<Set<string>>(new Set<string>());
export const selectedUserNodeAtom = atom<TreeNode | null>(null);
export const selectedTargetNodeAtom = atom<TreeNode | null>(null);
export const activeDescendantsNodeAtom = atom<string | null>(null);
export const hideUserNodesAtom = atom<boolean>(false);

// Re-export existing atoms for convenience
export { targetTreeDataAtom, userTreeDataAtom, targetTreeFilterAtom, type TargetTreeFilter } from './tree-atom'; 