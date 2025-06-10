import React, { useRef, useEffect } from 'react';
import { NodeApi, TreeApi } from 'react-arborist';
import { AdjudicationService } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import { v4 as uuidv4 } from 'uuid';

interface InputProps {
	node: NodeApi;
	tree: TreeApi<TreeNode>;
}

export function Input({ node, tree }: InputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	// Ensure focus when component mounts
	useEffect(() => {
		// Use requestAnimationFrame to ensure this runs after the tree library's focus management
		requestAnimationFrame(() => {
			setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
					inputRef.current.select();
				}
			}, 10);
		});
	}, []);

	const handleCreateNode = async (name: string) => {
		try {
			const nodeType = node.data.type;
			const parentId = node.parent?.data?.pmId || "0";
			
			let result;
			switch (nodeType) {
				case 'PC':
					result = await AdjudicationService.createPolicyClass(name);
					break;
				case 'UA':
					result = await AdjudicationService.createUserAttribute(name, parentId !== "0" ? [parentId] : []);
					break;
				case 'OA':
					result = await AdjudicationService.createObjectAttribute(name, parentId !== "0" ? [parentId] : []);
					break;
				case 'U':
					result = await AdjudicationService.createUser(name, parentId !== "0" ? [parentId] : []);
					break;
				case 'O':
					result = await AdjudicationService.createObject(name, parentId !== "0" ? [parentId] : []);
					break;
				default:
					console.error('Unknown node type:', nodeType);
					return;
			}
			
			// Get the created node ID from the response
			const nodeIds = result.nodeIds;
			const createdId = nodeIds[name];
			
			if (createdId) {
				// Update the node with the actual ID from the server
				node.data.pmId = createdId;
				node.data.id = uuidv4();
				node.data.name = name;
				console.log(`Created ${nodeType} node "${name}" with ID: ${createdId}`);
			}
			
		} catch (error) {
			console.error('Failed to create node:', error);
			// Reset the node on error
			node.reset();
			return;
		}
	};

	return (
		<input
			id={`node-input-${node.data.id}`}
			ref={inputRef}
			autoFocus
			type="text"
			defaultValue={node.data.name}
			onFocus={(e) => e.currentTarget.select()}
			onBlur={() => node.reset()}
			onKeyDown={async (e) => {
				if (e.key === "Escape") {
					node.reset();
				}
				if (e.key === "Enter") {
					const name = e.currentTarget.value.trim();
					if (name) {
						await handleCreateNode(name);
						node.submit(name);
					}
					node.focus();
				}
			}}
		/>
	);
} 