import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MantineTheme } from '@mantine/core';
import { lightTheme, darkTheme } from '@/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: any; // Using any to avoid complex type issues
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  
  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    
    // Update the document's data attribute for proper CSS variable switching
    document.documentElement.setAttribute('data-mantine-color-scheme', newMode);
  };

  // Set initial color scheme on mount
  React.useEffect(() => {
    document.documentElement.setAttribute('data-mantine-color-scheme', themeMode);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}