import type * as monaco from 'monaco-editor';

// PML Language Definition
export const PML_LANGUAGE_ID = 'pml';

// Keywords from PMLLexer.g4
export const PML_KEYWORDS = {
  // Operation definition keywords
  definitions: ['adminop', 'resourceop', 'routine', 'function', 'query'],

  // Node argument annotation
  annotations: ['@node'],

  // Node types
  nodeTypes: ['node', 'PC', 'OA', 'UA', 'U', 'O', 'pc', 'oa', 'ua', 'u', 'o'],

  // Create/delete keywords
  crud: ['create', 'delete'],

  // Conditional delete
  conditionalDelete: ['if exists'],

  // Obligation keywords
  obligation: ['rule', 'when', 'performs', 'on', 'in', 'do', 'any', 'obligation'],

  // Ascendant
  ascendant: ['ascendant of'],

  // Set operations
  setOps: ['intersection', 'inter', 'union'],

  // Process
  process: ['process'],

  // Resource access rights
  resourceAccess: ['set resource access rights', 'access rights'],

  // Assignment keywords
  assignment: ['assign', 'deassign', 'from', 'to'],

  // Properties
  properties: ['set properties', 'of'],

  // Association keywords
  association: ['associate', 'and', 'with', 'dissociate'],

  // Prohibition/deny
  prohibition: ['deny', 'prohibition'],

  // User keyword
  user: ['user'],

  // Control flow
  control: ['break', 'default', 'else', 'if', 'range', 'continue', 'foreach', 'return'],

  // Variable declaration
  variable: ['var', 'const'],

  // Check statement
  check: ['check'],

  // Data types
  types: ['string', 'bool', 'void', 'array', 'map', 'any', 'int64'],

  // Literals
  literals: ['nil', 'true', 'false'],
};

// Flattened keywords array for Monarch
export const PML_KEYWORDS_FLAT = [
  ...PML_KEYWORDS.definitions,
  ...PML_KEYWORDS.nodeTypes,
  ...PML_KEYWORDS.crud,
  ...PML_KEYWORDS.obligation,
  ...PML_KEYWORDS.setOps,
  ...PML_KEYWORDS.process,
  ...PML_KEYWORDS.assignment,
  ...PML_KEYWORDS.association,
  ...PML_KEYWORDS.prohibition,
  ...PML_KEYWORDS.user,
  ...PML_KEYWORDS.control,
  ...PML_KEYWORDS.variable,
  ...PML_KEYWORDS.check,
  ...PML_KEYWORDS.types,
  ...PML_KEYWORDS.literals,
];

// Operators from PMLLexer.g4
export const PML_OPERATORS = [
  '=', ':=', '==', '!=', '||', '&&', '!', '+',
  '(', ')', '{', '}', '[', ']',
  ',', ';', ':', '.'
];

// Monaco language configuration
export const PML_LANGUAGE_CONFIG: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/']
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' }
  ]
};

// Tokenizer rules based on PMLLexer.g4
export const PML_MONARCH_LANGUAGE: monaco.languages.IMonarchLanguage = {
  keywords: PML_KEYWORDS_FLAT,
  operators: PML_OPERATORS,

  tokenizer: {
    root: [
      // Multi-word keywords (must come before single words)
      [/\bset resource access rights\b/, 'keyword.compound'],
      [/\baccess rights\b/, 'keyword.compound'],
      [/\bset properties\b/, 'keyword.compound'],
      [/\bif exists\b/, 'keyword.compound'],
      [/\bascendant of\b/, 'keyword.compound'],
      [/\bany user\b/, 'keyword.compound'],
      [/\bany operation\b/, 'keyword.compound'],

      // Node argument annotation (use @@ to match literal @)
      [/@@node/, 'annotation'],

      // Operation definition keywords
      [/\b(adminop|resourceop|routine|function|query)\b/, 'keyword.declaration'],

      // CRUD operations
      [/\b(create|delete)\b/, 'keyword.operation'],

      // Check statement
      [/\bcheck\b/, 'keyword.check'],

      // Assignment/association operations
      [/\b(assign|deassign|associate|dissociate)\b/, 'keyword.operation'],

      // Control flow
      [/\b(if|else|foreach|return|break|continue)\b/, 'keyword.control'],

      // Obligation keywords
      [/\b(rule|when|performs|on|in|do|obligation|prohibition)\b/, 'keyword.obligation'],

      // Set operations
      [/\b(intersection|inter|union)\b/, 'keyword.setop'],

      // Deny keyword
      [/\bdeny\b/, 'keyword.deny'],

      // Node type keywords with specific colors (case-insensitive matching for PC, OA, UA)
      [/\bPC\b/, 'keyword.type.pc'],
      [/\bpc\b/, 'keyword.type.pc'],
      [/\bUA\b/, 'keyword.type.ua'],
      [/\bua\b/, 'keyword.type.ua'],
      [/\bOA\b/, 'keyword.type.oa'],
      [/\boa\b/, 'keyword.type.oa'],
      [/\bU\b/, 'keyword.type.u'],
      [/\bu\b/, 'keyword.type.u'],
      [/\bO\b/, 'keyword.type.o'],
      [/\bo\b/, 'keyword.type.o'],
      [/\b(node|user|process)\b/, 'keyword.type'],

      // Data types
      [/\b(string|bool|void|array|map|any|int64)\b/, 'keyword.datatype'],

      // Boolean and nil literals
      [/\b(true|false|nil)\b/, 'constant.language'],

      // Variable keywords
      [/\b(var|const)\b/, 'keyword.variable'],

      // Other keywords
      [/\b(from|to|of|and|with|any|default|range)\b/, 'keyword'],

      // Comments
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],

      // Numbers (int64)
      [/-?[0-9]+/, 'number'],

      // Identifiers
      [/[a-zA-Z_][a-zA-Z0-9_]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],

      // Operators and punctuation
      [/:=/, 'operator.assignment'],
      [/==|!=/, 'operator.comparison'],
      [/\|\||&&/, 'operator.logical'],
      [/[=+!]/, 'operator'],
      [/\{/, 'delimiter.curly'],
      [/\}/, 'delimiter.curly'],
      [/\(/, 'delimiter.parenthesis'],
      [/\)/, 'delimiter.parenthesis'],
      [/\[/, 'delimiter.bracket'],
      [/\]/, 'delimiter.bracket'],
      [/[;,:]/, 'delimiter'],
      [/\./, 'delimiter.dot'],

      // Whitespace
      [/\s+/, 'white']
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment']
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop']
    ]
  }
};

// Theme colors for PML
export const PML_THEME: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    // Annotations
    { token: 'annotation', foreground: '9B59B6', fontStyle: 'bold' },

    // Keywords
    { token: 'keyword.declaration', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.operation', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.obligation', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.type', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.datatype', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.compound', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.variable', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.check', foreground: 'D35400', fontStyle: 'bold' },
    { token: 'keyword.setop', foreground: '8E44AD' },
    { token: 'keyword.deny', foreground: 'C0392B', fontStyle: 'bold' },
    { token: 'keyword', foreground: '0066CC' },

    // Node type keywords with specific colors matching getTypeColor
    { token: 'keyword.type.pc', foreground: '2b8a3e', fontStyle: 'bold' }, // Green[9] - PC
    { token: 'keyword.type.ua', foreground: 'e03131', fontStyle: 'bold' }, // Red[6] - UA
    { token: 'keyword.type.oa', foreground: '228be6', fontStyle: 'bold' }, // Blue[6] - OA
    { token: 'keyword.type.u', foreground: 'c92a2a', fontStyle: 'bold' },  // Red[8] - U
    { token: 'keyword.type.o', foreground: '1864ab', fontStyle: 'bold' },  // Blue[8] - O

    // Literals
    { token: 'constant.language', foreground: '008080', fontStyle: 'bold' },
    { token: 'number', foreground: '098658' },

    // Strings
    { token: 'string', foreground: 'A31515' },
    { token: 'string.escape', foreground: 'EE0000' },
    { token: 'string.invalid', foreground: 'FF0000' },

    // Comments
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },

    // Operators and delimiters
    { token: 'operator', foreground: '000000' },
    { token: 'operator.assignment', foreground: '000000' },
    { token: 'operator.comparison', foreground: '000000' },
    { token: 'operator.logical', foreground: '000000' },
    { token: 'delimiter', foreground: '000000' },
    { token: 'delimiter.bracket', foreground: '000000' },
    { token: 'delimiter.curly', foreground: '000000' },
    { token: 'delimiter.parenthesis', foreground: '000000' },
    { token: 'delimiter.dot', foreground: '000000' },

    // Identifiers
    { token: 'identifier', foreground: '000000' }
  ],
  colors: {
    'editorBracketMatch.border': '#000000',
    'editorBracketMatch.background': '#ffffff00',
    'editorBracketHighlight.foreground1': '#000000',
    'editorBracketHighlight.foreground2': '#000000',
    'editorBracketHighlight.foreground3': '#000000',
    'editorBracketHighlight.foreground4': '#000000',
    'editorBracketHighlight.foreground5': '#000000',
    'editorBracketHighlight.foreground6': '#000000'
  }
};
