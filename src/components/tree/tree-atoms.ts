import { atom } from 'jotai';
import { TreeNode } from "@/utils/tree.utils";

// Create atoms to track descendant nodes and selected user node
export const descendantNodesAtom = atom<Set<string>>(new Set<string>());
export const selectedUserNodeAtom = atom<TreeNode | null>(null);
export const selectedTargetNodeAtom = atom<TreeNode | null>(null);
export const activeDescendantsNodeAtom = atom<string | null>(null);
export const visibleNodeTypesAtom = atom<Set<string>>(new Set(['PC', 'UA', 'OA', 'U', 'O']));

// Tree direction atom for API calls
export const treeDirectionAtom = atom<'ascendant' | 'descendant'>('descendant');

// Callback atoms for opening side panel tabs
export const onOpenDescendantsAtom = atom<((node: TreeNode, isUserTree: boolean) => void) | null>(null);
export const onOpenAssociationAtom = atom<((node: TreeNode, selectedUserNode: TreeNode | null, selectedTargetNode: TreeNode | null, isUserTree: boolean) => void) | null>(null);

// Callback atoms for node click events
export const onLeftClickAtom = atom<((node: TreeNode) => void) | null>(null);
export const onRightClickAtom = atom<((node: TreeNode) => void) | null>(null);

// Re-export existing atoms for convenience
export { targetTreeDataAtom, userTreeDataAtom, targetTreeFilterAtom, type TargetTreeFilter } from './tree-atom'; 