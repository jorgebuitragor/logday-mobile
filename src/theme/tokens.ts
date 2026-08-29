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
