import {useMemo, useState} from "react";
import {CreateHandler, DeleteHandler, MoveHandler, RenameHandler} from "react-arborist";
import {PrimitiveAtom, useAtom} from "jotai";
import {targetTreeDataAtom, userTreeDataAtom} from "@/components/tree/tree-atom";
import {TreeNode, addChildToTreeNode, removeTreeNodeById, updateTreeNodeById, findTreeNodeById} from "@/utils/tree.utils";
import {v4 as uuidv4} from "uuid";

export function useUserDynamicTree() {
	return buildHook(userTreeDataAtom);
}

export function useTargetDynamicTree() {
	return buildHook(targetTreeDataAtom);
}

function buildHook(atom: PrimitiveAtom<TreeNode[]>) {
	const [data, setData] = useAtom(atom);

	const onCreate: CreateHandler<TreeNode> = async ({parentId, index, type}) => {
		// Create untitled node for editing
		const nodeId = uuidv4();
		const newNode: TreeNode = {
			id: nodeId,
			pmId: "0", // Will be set when actually created via API
			name: "",
			type: type as string,
			properties: {},
			children: [],
			parent: parentId || undefined,
			expanded: false,
			selected: false
		};

		if (parentId) {
			// Add as child to existing parent
			const updatedData = [...data];
			addChildToTreeNode(updatedData, parentId, newNode);
			setData(updatedData);
		} else {
			// Add as root node
			setData([...data, newNode]);
		}

		console.log("created node:", nodeId);
		return { id: nodeId };
	};

	const onDelete: DeleteHandler<TreeNode> = async (args: { ids: string[] }) => {
		const updatedData = [...data];
		
		// Remove each node by ID
		args.ids.forEach(id => {
			removeTreeNodeById(updatedData, id);
		});
		
		setData(updatedData);
		console.log("deleted nodes:", args.ids);
	};

	const onRename: RenameHandler<TreeNode> = ({ name, id }) => {
		const updatedData = [...data];
		updateTreeNodeById(updatedData, id, { name });
		setData(updatedData);
		
		console.log("renamed node:", id, "to:", name);
		// TODO: Actually update node in PDP if it has a real pmId
	};

	const onMove: MoveHandler<TreeNode> = (args: {
		dragIds: string[];
		parentId: null | string;
		index: number;
	}) => {
		const updatedData = [...data];
		
		// For each dragged node, remove it and re-add to new location
		args.dragIds.forEach(id => {
			const node = findTreeNodeById(updatedData, id);
			if (node) {
				// Remove from current location
				removeTreeNodeById(updatedData, id);
				
				// Update parent reference
				node.parent = args.parentId || undefined;
				
				if (args.parentId) {
					// Add to new parent
					addChildToTreeNode(updatedData, args.parentId, node);
				} else {
					// Add as root node at specified index
					updatedData.splice(args.index, 0, node);
				}
			}
		});
		
		setData(updatedData);
		console.log("moved nodes:", args.dragIds, "to parent:", args.parentId);
	};

	const controllers = {onCreate, onDelete, onRename, onMove};
	return {data, setData, controllers} as const;
}