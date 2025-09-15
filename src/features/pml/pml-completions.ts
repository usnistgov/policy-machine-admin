import type * as monaco from 'monaco-editor';

// Base completion item without range (range will be added by provider)
type BaseCompletionItem = Omit<monaco.languages.CompletionItem, 'range'>;

// Completion items for basic statements
export function getBasicStatementCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
  // Variable operations
  {
    label: 'var',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'var ${1:name} = ${2:value}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Variable declaration'
  },
  {
    label: 'var assignment',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: 'var ${1:name} = ${2:value}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Variable declaration with assignment'
  },
  {
    label: 'short declaration',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: '${1:name} := ${2:value}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Short variable declaration'
  },

  // Control flow
  {
    label: 'if',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'if ${1:condition} {\n\t${2}\n}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'If statement'
  },
  {
    label: 'if else',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: 'if ${1:condition} {\n\t${2}\n} else {\n\t${3}\n}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'If-else statement'
  },
  {
    label: 'foreach',
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: 'foreach ${1:key} in ${2:collection} {\n\t${3}\n}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Foreach loop'
  },
  {
    label: 'foreach key-value',
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: 'foreach ${1:key}, ${2:value} in ${3:collection} {\n\t${4}\n}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Foreach loop with key and value'
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
    insertText: 'continue;',
    documentation: 'Continue statement'
  },

  // Function definitions
  {
    label: 'function',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'function ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Function definition'
  }
  ];
}

// Completion items for operation statements
export function getOperationStatementCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
  // Create operations
  {
    label: 'create PC',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'create PC "${1:name}"',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Create policy class'
  },
  {
    label: 'create OA',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'create OA "${1:name}" in ["${2:parent}"]',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Create object attribute'
  },
  {
    label: 'create UA',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'create UA "${1:name}" in ["{2:parent}"]',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Create user attribute'
  },
  {
    label: 'create U',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'create U "${1:name}" in ["${2:parent}"]',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Create user'
  },
  {
    label: 'create O',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'create O "${1:name}" in ["${2:parent}"]',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Create object'
  },

  // Delete operations
  {
    label: 'delete node',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'delete node ${1:name}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Delete node'
  },
  {
    label: 'delete if exists',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'delete if exists node ${1:name}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Delete node if it exists'
  },
  {
    label: 'delete obligation',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'delete obligation ${1:name}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Delete obligation'
  },
  {
    label: 'delete prohibition',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'delete prohibition ${1:name}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Delete prohibition'
  },

  // Assignment operations
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
    insertText: 'deassign ${1:child} from ["${2:parent}"]',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Deassign node from parent'
  },

  // Association operations
  {
    label: 'associate',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'associate "${1:ua}" and "${2:target}" with [${3:accessRights}]',
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

  // Property operations
  {
    label: 'set properties',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'set properties of "${1:node}" to {${2:properties}}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Set node properties'
  },
  {
    label: 'set resource operations',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'set resource operations [${1:operations};]',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Set resource operations'
  },

  // Obligation creation
  {
    label: 'create obligation',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'create obligation "${1:name}" {\n\tcreate rule "${2:ruleName}"\n\t\twhen ${3:subject}\n\t\tperforms "${4:operation}"\n\t\ton {${5:target}}\n\t\tdo (ctx) {\n\t\t\t${7}\n\t\t}\n}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Create obligation with a single rule'
  },

  // Prohibition creation
  {
    label: 'create prohibition',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'create prohibition "${1:name}"\n\tdeny "${2:subject}"\n\taccess rights [${3:rights}]\n\ton {${4:containers};}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Create prohibition'
  },

  // Operation and routine definitions
  {
    label: 'operation',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'operation ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Operation definition'
  },
  {
    label: 'routine',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'routine ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Routine definition'
  }
  ];
}

// All completions combined
export function getAllCompletions(monaco: typeof import('monaco-editor')): BaseCompletionItem[] {
  return [
    ...getBasicStatementCompletions(monaco),
    ...getOperationStatementCompletions(monaco)
  ];
}