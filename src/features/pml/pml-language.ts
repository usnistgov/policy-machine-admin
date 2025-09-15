import type * as monaco from 'monaco-editor';

// PML Language Definition
export const PML_LANGUAGE_ID = 'pml';

// Keywords from the lexer
export const PML_KEYWORDS = [
  // Basic keywords
  'operation', 'check', 'routine', 'function', 'create', 'delete', 'if exists',
  
  // Obligation keywords
  'rule', 'when', 'performs', 'on', 'in', 'do', 'any', 'ascendant of',
  
  // Set operations
  'intersection', 'inter', 'union', 'process',
  
  // Assignment and association
  'set resource operations', 'assign', 'deassign', 'from', 'set properties',
  'of', 'to', 'associate', 'and', 'with', 'dissociate', 'deny',
  'prohibition', 'obligation', 'access rights',
  
  // Node types
  'pc', 'oa', 'ua', 'u', 'o', 'node', 'user', 'PC', 'OA', 'UA', 'U', 'O',
  
  // Control flow
  'break', 'default', 'map', 'else', 'const', 'if', 'range', 'continue',
  'foreach', 'return', 'var',
  
  // Types
  'string', 'bool', 'void', 'array', 'nil', 'true', 'false'
];

// Operators from the lexer
export const PML_OPERATORS = [
  '=', '==', '!=', '||', '&&', '!', '+', ':=', '(', ')', '{', '}', '[', ']',
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

// Tokenizer rules
export const PML_MONARCH_LANGUAGE: monaco.languages.IMonarchLanguage = {
  keywords: PML_KEYWORDS,
  operators: PML_OPERATORS,
  
  tokenizer: {
    root: [
      // Keywords
      [/\b(operation|check|routine|function)\b/, 'keyword.declaration'],
      [/\b(create|delete|assign|deassign|associate|dissociate)\b/, 'keyword.operation'],
      [/\b(if|else|foreach|return|break|continue)\b/, 'keyword.control'],
      [/\b(rule|when|performs|on|in|do|obligation|prohibition)\b/, 'keyword.obligation'],
      
      // Node type keywords with specific colors
      [/\bpc\b/, 'keyword.type.pc'],
      [/\bua\b/, 'keyword.type.ua'],
      [/\boa\b/, 'keyword.type.oa'],
      [/\bu\b/, 'keyword.type.u'],
      [/\bo\b/, 'keyword.type.o'],
      [/\bPC\b/, 'keyword.type.PC'],
      [/\bUA\b/, 'keyword.type.UA'],
      [/\bOA\b/, 'keyword.type.OA'],
      [/\bU\b/, 'keyword.type.U'],
      [/\bO\b/, 'keyword.type.O'],
      [/\b(node|user|process)\b/, 'keyword.type'],
      
      [/\b(string|bool|void|array|map|any)\b/, 'keyword.datatype'],
      [/\b(true|false|nil)\b/, 'constant.language'],
      [/\b(var|const)\b/, 'keyword.variable'],
      [/\b(intersection|inter|union|access rights|set resource operations|set properties|if exists|ascendant of)\b/, 'keyword.compound'],
      
      // Comments
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
      
      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],
      
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
      [/\{/, 'delimiter.curly.open'],
      [/\}/, 'delimiter.curly.close'],
      [/\(/, 'delimiter.parenthesis.open'],
      [/\)/, 'delimiter.parenthesis.close'],
      [/\[/, 'delimiter.bracket.open'],
      [/\]/, 'delimiter.bracket.close'],
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

// Mantine color values (approximated to hex)
const MANTINE_COLORS = {
  green9: '#2b8a3e',   // theme.colors.green[9] - dark green for PC
  red6: '#e03131',     // theme.colors.red[6] - medium red for UA
  blue6: '#228be6',    // theme.colors.blue[6] - medium blue for OA
  red3: '#ffa8a8',     // theme.colors.red[3] - light red for U
  blue3: '#a5b4fc',    // theme.colors.blue[3] - light blue for O
};

// Theme colors for PML
export const PML_THEME: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    // Regular keywords use the same blue color
    { token: 'keyword.declaration', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.operation', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.obligation', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.type', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.datatype', foreground: '0066CC', fontStyle: 'bold' },
    { token: 'keyword.compound', foreground: '0066CC', fontStyle: 'bold' },
    
    // Node type keywords with specific colors matching getTypeColor
    { token: 'keyword.type.pc', foreground: '2b8a3e', fontStyle: 'bold' }, // Green[9] - PC
    { token: 'keyword.type.ua', foreground: 'e03131', fontStyle: 'bold' }, // Red[6] - UA
    { token: 'keyword.type.oa', foreground: '228be6', fontStyle: 'bold' }, // Blue[6] - OA
    { token: 'keyword.type.u', foreground: 'ffa8a8', fontStyle: 'bold' },  // Red[3] - U
    { token: 'keyword.type.o', foreground: 'a5b4fc', fontStyle: 'bold' },  // Blue[3] - O
    { token: 'keyword.type.PC', foreground: '2b8a3e', fontStyle: 'bold' }, // Green[9] - PC
    { token: 'keyword.type.UA', foreground: 'e03131', fontStyle: 'bold' }, // Red[6] - UA
    { token: 'keyword.type.OA', foreground: '228be6', fontStyle: 'bold' }, // Blue[6] - OA
    { token: 'keyword.type.U', foreground: 'ffa8a8', fontStyle: 'bold' },  // Red[3] - U
    { token: 'keyword.type.O', foreground: 'a5b4fc', fontStyle: 'bold' },  // Blue[3] - O
    
    { token: 'constant.language', foreground: '008080', fontStyle: 'bold' },
    { token: 'string', foreground: 'A31515' },
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'operator', foreground: '000000' },
    { token: 'operator.assignment', foreground: '000000' },
    { token: 'operator.comparison', foreground: '000000' },
    { token: 'operator.logical', foreground: '000000' },
    { token: 'delimiter', foreground: '000000' },
    { token: 'delimiter.bracket', foreground: '000000' },
    { token: 'delimiter.curly.open', foreground: '000000' },
    { token: 'delimiter.curly.close', foreground: '000000' },
    { token: 'delimiter.parenthesis.open', foreground: '000000' },
    { token: 'delimiter.parenthesis.close', foreground: '000000' },
    { token: 'delimiter.bracket.open', foreground: '000000' },
    { token: 'delimiter.bracket.close', foreground: '000000' },
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