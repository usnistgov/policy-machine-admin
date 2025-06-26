import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Group, Stack, Text, Alert, LoadingOverlay, Box } from '@mantine/core';
import { IconPlayerPlay, IconTrash, IconInfoCircle, IconFileUpload } from '@tabler/icons-react';
import { AdjudicationService } from '@/api/pdp.api';

interface PMLEditorProps {
  title: string;
  placeholder?: string;
  initialValue?: string;
}

export function PMLEditor({ title, placeholder, initialValue = '' }: PMLEditorProps) {
  const [code, setCode] = useState(initialValue);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monaco Editor configuration for PML syntax highlighting
  useEffect(() => {
    // Configuration will be handled when Monaco mounts
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    // Configure PML language when editor mounts
    const configurePMLLanguage = (monaco: any) => {
      // Register PML language if not already registered
      if (!monaco.languages.getLanguages().find((lang: any) => lang.id === 'pml')) {
        monaco.languages.register({ id: 'pml' });

        // Define PML tokens based on the ANTLR4 lexer
        monaco.languages.setMonarchTokensProvider('pml', {
          tokenizer: {
            root: [
              // Keywords
              [/\b(operation|check|routine|function|create|delete)\b/, 'keyword'],
              [/\b(policy element|pe|contained|rule|when|performs|as|on|in|do|any)\b/, 'keyword'],
              [/\b(ascendant of|intersection|inter|union|process)\b/, 'keyword'],
              [/\b(set resource operations|assign|deassign|from|set properties|of|to)\b/, 'keyword'],
              [/\b(associate|and|with|dissociate|deny|prohibition|obligation|access rights)\b/, 'keyword'],
              [/\b(node|policy class|pc|PC|object attribute|oa|OA|user attribute|ua|UA)\b/, 'keyword'],
              [/\b(user attributes|uas|object attributes|oas|object|o|O|user|u|U)\b/, 'keyword'],
              [/\b(attribute|break|map|else|const|if|continue)\b/, 'keyword'],
              [/\b(foreach|return|var|string|bool|void|true|false|ctx|args)\b/, 'keyword'],

              // Node types
              [/\b(PC|OA|UA|O|U)\b/, 'type'],

              // Strings
              [/"([^"\\]|\\.)*$/, 'string.invalid'],
              [/"/, 'string', '@string'],

              // Comments
              [/\/\*/, 'comment', '@comment'],
              [/\/\/.*$/, 'comment'],

              // Numbers
              [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
              [/\d+/, 'number'],

              // Identifiers
              [/[a-zA-Z0-9_]+/, 'identifier'],

              // Operators and punctuation
              [/[{}()\[\]]/, '@brackets'],
              [/[<>](?!@symbols)/, '@brackets'],
              [/@symbols/, 'operator'],

              // Whitespace
              [/[ \t\r\n]+/, 'white'],
            ],

            comment: [
              [/[^\/*]+/, 'comment'],
              [/\/\*/, 'comment', '@push'],
              [/\*\//, 'comment', '@pop'],
              [/[\/*]/, 'comment']
            ],

            string: [
              [/[^\\"]+/, 'string'],
              [/\\./, 'string.escape.invalid'],
              [/"/, 'string', '@pop']
            ],
          },

          symbols: /[=><!~?:&|+\-*\/\^%]+/,
        });

        monaco.languages.setLanguageConfiguration('pml', {
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
              { open: '"', close: '"' },
              { open: '\'', close: '\'' }
            ],
            surroundingPairs: [
              { open: '{', close: '}' },
              { open: '[', close: ']' },
              { open: '(', close: ')' },
              { open: '"', close: '"' },
              { open: '\'', close: '\'' }
            ]
          });

        // Auto-completion suggestions
        monaco.languages.registerCompletionItemProvider('pml', {
          provideCompletionItems: () => {
            const suggestions = [
              // Basic keywords
              { label: 'create', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'create ' },
              { label: 'delete', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'delete ' },
              { label: 'assign', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'assign ' },
              { label: 'deassign', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'deassign ' },
              { label: 'associate', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'associate ' },
              { label: 'dissociate', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'dissociate ' },
              
              // Context keywords
              { label: 'ctx', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'ctx' },
              { label: 'args', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'args' },
              { label: 'ctx.args', kind: monaco.languages.CompletionItemKind.Property, insertText: 'ctx.args' },
              
              // Node types
              { label: 'policy class', kind: monaco.languages.CompletionItemKind.Class, insertText: 'PC ' },
              { label: 'user attribute', kind: monaco.languages.CompletionItemKind.Class, insertText: 'UA ' },
              { label: 'object attribute', kind: monaco.languages.CompletionItemKind.Class, insertText: 'OA ' },
              { label: 'user', kind: monaco.languages.CompletionItemKind.Class, insertText: 'U ' },
              { label: 'object', kind: monaco.languages.CompletionItemKind.Class, insertText: 'O ' },
              
              // Basic Statements
              { 
                label: 'variable declaration', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'var ${1:varName} = ${2:value}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'foreach statement', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'foreach ${1:item} in ${2:collection} {\n\t${3:// statements}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'return statement', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'return ${1:value}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'break statement', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'break',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'continue statement', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'continue',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'if statement', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'if (${1:condition}) {\n\t${2:// statements}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'function definition', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'function ${1:name}(${2:params}) {\n\t${3:// function body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },

              // Operation Statements
              { 
                label: 'create policy class', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'create PC "${1:name}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'create user attribute', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'create UA "${1:name}" in ["${2:parent}"]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'create object attribute', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'create OA "${1:name}" in ["${2:parent}"]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'create user', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'create U "${1:name}" in ["${2:parent}"]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'create object', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'create O "${1:name}" in ["${2:parent}"]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'create obligation', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'create obligation "${1:name}" {\n\tcreate rule "${2:ruleName}"\n\twhen ${3}\n\tperforms ["${4:operation}"]\n\ton {${5}}\n\tdo(ctx){${6}}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'create prohibition', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'create prohibition "${1:name}" \n\tdeny ${2:subject_type} ${3:subject}\n\taccess rights ["${4:ar}"]\n\ton ${5:intersection_union}\n\tof {"${6:container}": ${7:false}}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'set node properties', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'set properties of "${1:nodeName}" to {"${2:key}": "${3:value}"}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'assign statement', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'assign "${1:child}" to ["${2:parent}"]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'deassign statement', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'deassign "${1:child}" from ["${2:parent}"]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'associate with access rights', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'associate "${1:ua}" and "${2:target}" with ["${3:read}"]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'dissociate statement', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'dissociate "${1:ua}" and "${2:target}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'set resource operations', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'set resource operations ["${1:operations}"]',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'delete node', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'delete "${1:nodeName}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'delete rule', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'delete rule "${1:ruleName}" from "${2:obligation}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'operation definition', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'operation ${1:name}(${2:params}) {\n\t${3:// operation body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
              { 
                label: 'routine definition', 
                kind: monaco.languages.CompletionItemKind.Snippet, 
                insertText: 'routine ${1:name}(${2:params}) {\n\t${3:// routine body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              },
            ];

            return { suggestions };
          }
        });
      }
    };

    configurePMLLanguage(monaco);
    
    // Set the theme after language configuration
    monaco.editor.setTheme('pml-theme');
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Please enter some PML code before submitting.');
      return;
    }

    setIsExecuting(true);
    setError('');
    setResult('');

    try {
      const response = await AdjudicationService.executePML(code);
      setResult('PML executed successfully!');
      console.log('PML execution result:', response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Execution failed: ${errorMessage}`);
      console.error('PML execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setResult('');
    setError('');
    setFileName('');
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a .pml file
    if (!file.name.toLowerCase().endsWith('.pml')) {
      setError('Please select a .pml file');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setCode(content);
        setFileName(file.name);
        setError('');
        setResult('');
        if (editorRef.current) {
          editorRef.current.setValue(content);
        }
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
    
    // Reset the file input so the same file can be selected again
    event.target.value = '';
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text size="lg" fw={600}>
        {fileName ? `${title} - ${fileName}` : title}
      </Text>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pml"
        style={{ display: 'none' }}
      />
      
      <div style={{ 
        flex: 1, 
        border: '1px solid #e9ecef', 
        borderRadius: '8px',
        position: 'relative',
        minHeight: '500px'
      }}>
        <LoadingOverlay visible={isExecuting} />
        <Editor
          height="100%"
          language="pml"
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 12,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            suggest: {
              snippetsPreventQuickSuggestions: false,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            accessibilitySupport: 'off',
            bracketPairColorization: { enabled: false },
          }}
        />
      </div>

      {placeholder && !code && (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {placeholder}
        </Alert>
      )}

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      {result && (
        <Alert color="green" variant="light">
          {result}
        </Alert>
      )}

      <Group justify="flex-end">
        <Button 
          variant="outline" 
          leftSection={<IconFileUpload size={16} />}
          onClick={handleOpenFile}
          disabled={isExecuting}
        >
          Open .pml
        </Button>
        <Button 
          variant="outline" 
          leftSection={<IconTrash size={16} />}
          onClick={handleClear}
          disabled={isExecuting}
        >
          Clear
        </Button>
        <Button 
          leftSection={<IconPlayerPlay size={16} />}
          onClick={handleSubmit}
          loading={isExecuting}
          disabled={!code.trim()}
        >
          Execute PML
        </Button>
      </Group>
    </div>
  );
} 