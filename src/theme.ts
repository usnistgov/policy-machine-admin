import {createTheme, MantineColorsTuple} from '@mantine/core';

const violet: MantineColorsTuple = [
  "#f7ecff",
  "#e7d6fb",
  "#caaaf1",
  "#ac7ce8",
  "#9354e0",
  "#833bdb",
  "#7b2eda",
  "#6921c2",
  "#5d1cae",
  "#501599"
];

const blue: MantineColorsTuple = [
  "#e5f3ff",
  "#cde2ff",
  "#9ac2ff",
  "#64a0ff",
  "#3884fe",
  "#1d72fe",
  "#0969ff",
  "#0058e4",
  "#004ecd",
  "#0043b5"
];

const green: MantineColorsTuple = [
  "#e6ffee",
  "#d3f9e0",
  "#a8f2c0",
  "#7aea9f",
  "#54e382",
  "#3bdf70",
  "#2bdd66",
  "#1bc455",
  "#0bae4a",
  "#00973c"
];

const red: MantineColorsTuple = [
  "#ffeaf3",
  "#fcd4e1",
  "#f4a7bf",
  "#ec779c",
  "#e64f7e",
  "#e3366c",
  "#e22862",
  "#c91a52",
  "#b41148",
  "#9f003e"
]


export const lightTheme = createTheme({
  colors: {
    violet,
    blue,
    green,
    red
  },
  primaryColor: 'violet',  // Set primary color for light theme
  primaryShade: 6,
  other: {
    intellijContentBg: '#ffffff',
    intellijPanelBg: '#fcfcfc',
  },
});

export const darkTheme = createTheme({
  colors: {
    violet,
    blue,
    green,
    red
  },
  primaryColor: 'violet',  // Changed from 'blue' to 'violet'
  primaryShade: 6,
  other: {
    intellijContentBg: '#1e1e1e',  // VS Code Dark+ editor background
    intellijPanelBg: '#252526',    // VS Code Dark+ sidebar/panel background
  },
});

export const theme = lightTheme; // Default theme
