import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Group, Text, Alert, LoadingOverlay } from '@mantine/core';
import { IconPlayerPlay, IconTrash, IconInfoCircle, IconFileUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import * as AdjudicationService from '@/shared/api/pdp_adjudication.api';
import { useTheme } from '@/shared/theme/ThemeContext';
import {
  PML_LANGUAGE_ID,
  PML_LANGUAGE_CONFIG,
  PML_MONARCH_LANGUAGE,
  PML_THEME
} from './pml-language';
import { getAllCompletions } from './pml-completions';

interface PMLEditorProps {
  title?: string;
  placeholder?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
  onExecute?: (pml: string) => Promise<void> | void;
  readOnly?: boolean;
  hideButtons?: boolean;
  containerHeight?: number;
  autoFocus?: boolean;
}


export function PMLEditor({ title, placeholder, initialValue = '', onChange, onExecute, readOnly = false, hideButtons = false, containerHeight, autoFocus = false }: PMLEditorProps) {
  const { themeMode } = useTheme();
  const [code, setCode] = useState(initialValue);
  const [isExecuting, setIsExecuting] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with initialValue prop changes
  useEffect(() => {
    if (initialValue !== code) {
      setCode(initialValue);
      if (editorRef.current) {
        editorRef.current.setValue(initialValue);
      }
    }
  }, [initialValue]);

  // Monaco Editor configuration for PML syntax highlighting
  useEffect(() => {
    // Configuration will be handled when Monaco mounts
  }, []);

  // Update Monaco theme when theme mode changes
  useEffect(() => {
    if (editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco?.editor) {
        monaco.editor.setTheme(themeMode === 'dark' ? 'pml-dark' : 'pml-light');
      }
    }
  }, [themeMode]);

  // Force Monaco to resize when container height changes
  useEffect(() => {
    if (editorRef.current && containerHeight) {
      // Small delay to ensure DOM has updated
      const timeoutId = setTimeout(() => {
        editorRef.current.layout();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [containerHeight]);

  // Use ResizeObserver to detect container size changes
  useEffect(() => {
    if (!editorRef.current || !containerRef.current) {return;}

    const resizeObserver = new ResizeObserver((_) => {
      if (editorRef.current) {
        // Force layout recalculation with a small delay
        setTimeout(() => {
          editorRef.current.layout();
        }, 50);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [editorRef.current]);

  // Auto-focus the editor when requested
  useEffect(() => {
    if (autoFocus && editorRef.current && !readOnly) {
      // Small delay to ensure the editor is fully rendered
      const timeoutId = setTimeout(() => {
        editorRef.current.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus, readOnly]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Register the PML language only once
    if (!monaco.languages.getLanguages().find((lang: any) => lang.id === PML_LANGUAGE_ID)) {
      // Register the language
      monaco.languages.register({ id: PML_LANGUAGE_ID });

      // Set the language configuration
      monaco.languages.setLanguageConfiguration(PML_LANGUAGE_ID, PML_LANGUAGE_CONFIG);

      // Set the syntax highlighting rules
      monaco.languages.setMonarchTokensProvider(PML_LANGUAGE_ID, PML_MONARCH_LANGUAGE);

      // Register completion provider
      monaco.languages.registerCompletionItemProvider(PML_LANGUAGE_ID, {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };

          const suggestions = getAllCompletions(monaco).map(completion => ({
            ...completion,
            range
          }));

          return {
            suggestions
          };
        }
      });

      // Define custom theme
      monaco.editor.defineTheme('pml-light', PML_THEME);
      
      // Define dark theme
      monaco.editor.defineTheme('pml-dark', {
        ...PML_THEME,
        base: 'vs-dark',
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          ...PML_THEME.colors
        }
      });
    }

    // Set the custom PML theme based on current theme mode
    monaco.editor.setTheme(themeMode === 'dark' ? 'pml-dark' : 'pml-light');

    // Auto-focus the editor if requested
    if (autoFocus && !readOnly) {
      setTimeout(() => {
        editor.focus();
      }, 100);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter some PML code before submitting.',
        color: 'red',
      });
      return;
    }

    setIsExecuting(true);

    try {
      if (onExecute) {
        // Use custom execute handler if provided
        await onExecute(code);
      } else {
        // Default execute behavior
        const response = await AdjudicationService.executePML(code);
        notifications.show({
          title: 'Success',
          message: 'PML executed successfully!',
          color: 'green',
        });
        console.log('PML execution result:', response);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notifications.show({
        title: 'Error',
        message: `Execution failed: ${errorMessage}`,
        color: 'red',
      });
      console.error('PML execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setCode('');
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
    if (!file) {return;}

    // Check if it's a .pml file
    if (!file.name.toLowerCase().endsWith('.pml')) {
      notifications.show({
        title: 'Error',
        message: 'Please select a .pml file',
        color: 'red',
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setCode(content);
        setFileName(file.name);
        if (editorRef.current) {
          editorRef.current.setValue(content);
        }
        notifications.show({
          title: 'Success',
          message: `File "${file.name}" loaded successfully`,
          color: 'green',
        });
      }
    };

    reader.onerror = () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to read file',
        color: 'red',
      });
    };

    reader.readAsText(file);

    // Reset the file input so the same file can be selected again
    event.target.value = '';
  };
  return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: hideButtons ? '0px' : '12px' }}>
        {!hideButtons && title && (
            <Text size="lg" fw={600}>
              {fileName ? `${title} - ${fileName}` : title}
            </Text>
        )}

        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pml"
            style={{ display: 'none' }}
        />

        <div
            ref={containerRef}
            data-editor-container
            style={{
              flex: 1,
              border: `1px solid var(--mantine-color-gray-${themeMode === 'dark' ? '7' : '3'})`,
              borderRadius: '8px',
              position: 'relative'
            }}
        >
          <LoadingOverlay visible={isExecuting} />
          <Editor
              height={containerHeight && hideButtons ? `${containerHeight}px` : (containerHeight ? `${containerHeight - 120}px` : "100%")}
              language={PML_LANGUAGE_ID}
              value={code}
              onChange={(value) => {
                const newValue = value || '';
                setCode(newValue);
                onChange?.(newValue);
              }}
              onMount={handleEditorDidMount}
              options={{
                readOnly,
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: "'Source Code Pro', 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace",
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

        {!hideButtons && (
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
        )}
      </div>
  );
} 