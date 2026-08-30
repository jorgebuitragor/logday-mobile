// Copiado literal de task-manager/src/App.css (:root y
// :root[data-theme="light"]) — no reinventar valores acá, ver
// specs/temas/design.md.

export interface ThemeTokens {
  bgBase: string;
  bgPanel: string;
  bgSurface: string;
  bgHover: string;
  bgElevated: string;
  bgInput: string;
  border: string;
  borderCard: string;
  borderHigh: string;
  textPrimary: string;
  textBody: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textHint: string;
  textFaint: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentInk: string;
}

export const dark: ThemeTokens = {
  bgBase: '#121212',
  bgPanel: '#141414',
  bgSurface: '#1c1c1c',
  bgHover: '#242424',
  bgElevated: '#181818',
  bgInput: '#161616',

  border: '#2a2a2a',
  borderCard: '#333333',
  borderHigh: '#4a4a4a',

  textPrimary: '#f2f2f2',
  textBody: '#e4e4e4',
  textSecondary: '#c8c8c8',
  textTertiary: '#aaaaaa',
  textMuted: '#888888',
  textHint: '#848484',
  textFaint: '#7e7e7e',

  accent: '#818cf8',
  accentStrong: '#6366f1',
  accentSoft: 'rgba(129, 140, 248, 0.22)',
  accentInk: '#c7d2fe',
};

export const light: ThemeTokens = {
  bgBase: '#f4f4f5',
  bgPanel: '#ffffff',
  bgSurface: '#f9f9fb',
  bgHover: '#f0f0f2',
  bgElevated: '#ffffff',
  bgInput: '#fafafa',

  border: '#e4e4e7',
  borderCard: '#d4d4d8',
  borderHigh: '#a1a1aa',

  textPrimary: '#09090b',
  textBody: '#18181b',
  textSecondary: '#3f3f46',
  textTertiary: '#52525b',
  textMuted: '#71717a',
  textHint: '#a1a1aa',
  textFaint: '#d4d4d8',

  accent: '#6366f1',
  accentStrong: '#4f46e5',
  accentSoft: 'rgba(99, 102, 241, 0.18)',
  accentInk: '#6366f1',
};

// Agregados 2026-08-30 — mismos 5 temas adicionales que
// task-manager/src/App.css y logday-web (`:root[data-theme="..."]`),
// copiados literal (mismo criterio que dark/light arriba). Mobile
// solo tenía Sistema/Claro/Oscuro — gap encontrado al revisar cómo
// logday-web ofrece la selección de tema, ver specs/temas-adicionales/.
// `accentInline`/`accentLink`/`accentCode` de desktop no se portan —
// `ThemeTokens` no los tiene, no hay ningún componente en mobile que
// distinga link/código inline del acento general todavía.

export const highContrast: ThemeTokens = {
  bgBase: '#000000',
  bgPanel: '#050505',
  bgSurface: '#0a0a0a',
  bgHover: '#141414',
  bgElevated: '#0f0f0f',
  bgInput: '#0a0a0a',

  border: '#5c5c5c',
  borderCard: '#787878',
  borderHigh: '#ffffff',

  textPrimary: '#ffffff',
  textBody: '#ffffff',
  textSecondary: '#f3f3f3',
  textTertiary: '#d8d8d8',
  textMuted: '#c6c6c6',
  textHint: '#b0b0b0',
  textFaint: '#8f8f8f',

  accent: '#818cf8',
  accentStrong: '#6366f1',
  accentSoft: 'rgba(129, 140, 248, 0.24)',
  accentInk: '#c7d2fe',
};

export const visualRest: ThemeTokens = {
  bgBase: '#0f1513',
  bgPanel: '#141d1a',
  bgSurface: '#1a2521',
  bgHover: '#22312b',
  bgElevated: '#16201d',
  bgInput: '#1a2521',

  border: '#2e3d37',
  borderCard: '#3a4d45',
  borderHigh: '#5d7d71',

  textPrimary: '#edf5f1',
  textBody: '#dde8e2',
  textSecondary: '#c6d6cf',
  textTertiary: '#a9bfb5',
  textMuted: '#8da79b',
  textHint: '#7a978b',
  textFaint: '#5f766d',

  accent: '#7ccf9e',
  accentStrong: '#5bbf86',
  accentSoft: 'rgba(124, 207, 158, 0.22)',
  accentInk: '#bde8cf',
};

export const sepia: ThemeTokens = {
  bgBase: '#f2e8d3',
  bgPanel: '#f9f2e4',
  bgSurface: '#ede0c4',
  bgHover: '#e6d7b7',
  bgElevated: '#f9f2e4',
  bgInput: '#efe3c8',

  border: '#ddc9a3',
  borderCard: '#cbb488',
  borderHigh: '#a3895d',

  textPrimary: '#2e2013',
  textBody: '#3d2d1c',
  textSecondary: '#5a4630',
  textTertiary: '#715a3d',
  textMuted: '#725b40',
  textHint: '#796044',
  textFaint: '#7c6346',

  accent: '#b5652f',
  accentStrong: '#7d512a',
  accentSoft: 'rgba(181, 101, 47, 0.18)',
  accentInk: '#b5652f',
};

export const oled: ThemeTokens = {
  bgBase: '#000000',
  bgPanel: '#0a0a0a',
  bgSurface: '#111111',
  bgHover: '#1c1c1c',
  bgElevated: '#0d0d0d',
  bgInput: '#0c0c0c',

  border: '#262626',
  borderCard: '#333333',
  borderHigh: '#4d4d4d',

  textPrimary: '#ededed',
  textBody: '#d6d6d6',
  textSecondary: '#bcbcbc',
  textTertiary: '#9e9e9e',
  textMuted: '#8e8e8e',
  textHint: '#848484',
  textFaint: '#7a7a7a',

  accent: '#38bdf8',
  accentStrong: '#0caef6',
  accentSoft: 'rgba(56, 189, 248, 0.22)',
  accentInk: '#87c4fb',
};

export const nordic: ThemeTokens = {
  bgBase: '#2e3440',
  bgPanel: '#333a47',
  bgSurface: '#3b4252',
  bgHover: '#434c5e',
  bgElevated: '#363d4a',
  bgInput: '#323944',

  border: '#4c566a',
  borderCard: '#4c566a',
  borderHigh: '#6b768c',

  textPrimary: '#eceff4',
  textBody: '#e5e9f0',
  textSecondary: '#d3dae6',
  textTertiary: '#b7c1d1',
  textMuted: '#b2bac7',
  textHint: '#a9b2c1',
  textFaint: '#a0aaba',

  accent: '#88c0d0',
  accentStrong: '#5e81ac',
  accentSoft: 'rgba(136, 192, 208, 0.20)',
  accentInk: '#c2d9e7',
};
