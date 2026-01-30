import type * as monaco from 'monaco-editor';

// Base completion item without range (range will be added by provider)
type BaseCompletionItem = Omit<monaco.languages.CompletionItem, 'range'>;

// Completion items for basic statements
export function getBasicStatementCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    {
      label: 'var',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'var ${1:name} = ${2:value}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Variable declaration'
    },
    {
      label: 'if',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'if ${1:condition} {\n\t${2}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'If statement'
    },
    {
      label: 'foreach',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'foreach ${1:item} in ${2:collection} {\n\t${3}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Foreach loop'
    },
    {
      label: 'return',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'return ${1:value}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Return statement'
    },
    {
      label: 'break',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'break',
      documentation: 'Break statement'
    },
    {
      label: 'continue',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'continue',
      documentation: 'Continue statement'
    },
    {
      label: 'function',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Function definition'
    },
  ];
}

// Completion items for operation definitions
export function getOperationDefinitionCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    {
      label: 'adminop',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'adminop ${1:name}(${2:params}) {\n\t${3}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Admin operation definition'
    },
    {
      label: 'resourceop',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'resourceop ${1:name}(${2:params}) {\n\t${3}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Resource operation definition'
    },
    {
      label: 'query',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'query ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Query operation definition'
    },
    {
      label: 'routine',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'routine ${1:name}(${2:params}) {\n\t${3}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Routine definition'
    },
    {
      label: 'check',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: 'check "${1:accessRight}" on ${2:target}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Check access rights on target'
    },
  ];
}

// Completion items for admin statements
export function getAdminStatementCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    {
      label: 'pc',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'create PC "${1:name}"',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create policy class'
    },
    {
      label: 'oa',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'create OA "${1:name}" in ["${2:parent}"]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create object attribute'
    },
    {
      label: 'ua',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'create UA "${1:name}" in ["${2:parent}"]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create user attribute'
    },
    {
      label: 'u',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'create U "${1:name}" in ["${2:parent}"]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create user'
    },
    {
      label: 'o',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'create O "${1:name}" in ["${2:parent}"]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create object'
    },
    {
      label: 'delete node',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'delete node "${1:name}"',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Delete node'
    },
    {
      label: 'delete obligation',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'delete obligation "${1:name}"',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Delete obligation'
    },
    {
      label: 'delete prohibition',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'delete prohibition "${1:name}"',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Delete prohibition'
    },
    {
      label: 'assign',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'assign "${1:child}" to ["${2:parent}"]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Assign node to parent'
    },
    {
      label: 'deassign',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'deassign "${1:child}" from ["${2:parent}"]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Deassign node from parent'
    },
    {
      label: 'associate',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'associate "${1:ua}" and "${2:target}" with ["${3:accessRight}"]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create association with access rights'
    },
    {
      label: 'dissociate',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'dissociate "${1:ua}" and "${2:target}"',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Remove association'
    },
    {
      label: 'set properties',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'set properties of "${1:node}" to {"${2:key}": "${3:value}"}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Set node properties'
    },
    {
      label: 'set resource access rights',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'set resource access rights ["${1:read}", "${2:write}"]',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Set resource access rights'
    },
  ];
}

// Completion items for obligation creation
export function getObligationCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    {
      label: 'create obligation',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: `create obligation "$\{1:name}"
when $\{2:userPattern}
performs "$\{3:operationName}" on ($\{4:argsPattern})
do (ctx) {
\t$\{5}
}`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create obligation'
    },
  ];
}

// Completion items for prohibition creation
export function getProhibitionCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    {
      label: 'create prohibition',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'create prohibition "${1:name}"\ndeny UA "${2:subject}"\naccess rights ["${3:read}"]\non intersection of {$\{4:containers}}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Create prohibition'
    },
  ];
}

// Completion items for types
export function getTypeCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    {
      label: 'string',
      kind: monaco.languages.CompletionItemKind.TypeParameter,
      insertText: 'string',
      documentation: 'String type'
    },
    {
      label: 'bool',
      kind: monaco.languages.CompletionItemKind.TypeParameter,
      insertText: 'bool',
      documentation: 'Boolean type'
    },
    {
      label: 'int64',
      kind: monaco.languages.CompletionItemKind.TypeParameter,
      insertText: 'int64',
      documentation: '64-bit integer type'
    },
    {
      label: 'any',
      kind: monaco.languages.CompletionItemKind.TypeParameter,
      insertText: 'any',
      documentation: 'Any type'
    },
    {
      label: '[]string',
      kind: monaco.languages.CompletionItemKind.TypeParameter,
      insertText: '[]string',
      documentation: 'Array of strings'
    },
    {
      label: 'map[string]any',
      kind: monaco.languages.CompletionItemKind.TypeParameter,
      insertText: 'map[string]any',
      documentation: 'Map type'
    },
  ];
}

// Completion items for literals
export function getLiteralCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    {
      label: 'true',
      kind: monaco.languages.CompletionItemKind.Constant,
      insertText: 'true',
      documentation: 'Boolean true'
    },
    {
      label: 'false',
      kind: monaco.languages.CompletionItemKind.Constant,
      insertText: 'false',
      documentation: 'Boolean false'
    }
  ];
}

// Completion items for @node annotation
export function getAnnotationCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    {
      label: 'node annotation',
      kind: monaco.languages.CompletionItemKind.Property,
      insertText: `@node("$\{2:reqcap}")`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Node argument annotation'
    },
  ];
}

// All completions combined
export function getAllCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    ...getBasicStatementCompletions(monaco),
    ...getOperationDefinitionCompletions(monaco),
    ...getAdminStatementCompletions(monaco),
    ...getObligationCompletions(monaco),
    ...getProhibitionCompletions(monaco),
    ...getTypeCompletions(monaco),
    ...getLiteralCompletions(monaco),
    ...getAnnotationCompletions(monaco),
  ];
}
