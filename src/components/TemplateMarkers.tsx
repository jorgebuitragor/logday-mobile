import { Platform, StyleSheet, Text, View } from 'react-native';

import { useThemeScheme } from '../theme/ThemeContext';

// Los marcadores de las plantillas (Ajustes → Plantillas) como recuadros de
// color, por grupo: lo del día anterior en ámbar, lo del Daily (y las filas
// del Excel) en índigo, lo del usuario en verde azulado. Un juego de colores
// para temas claros y otro para oscuros, para que se lean en los ocho.

export type MarkerGroup = 'amber' | 'indigo' | 'teal';

const COLORS: Record<'light' | 'dark', Record<MarkerGroup, { bg: string; fg: string; border: string }>> = {
  light: {
    amber: { bg: '#fef3c7', fg: '#92400e', border: '#f59e0b' },
    indigo: { bg: '#e0e7ff', fg: '#3730a3', border: '#818cf8' },
    teal: { bg: '#ccfbf1', fg: '#115e59', border: '#2dd4bf' },
  },
  dark: {
    amber: { bg: '#3b2a0a', fg: '#fcd34d', border: '#b45309' },
    indigo: { bg: '#1e1b4b', fg: '#c7d2fe', border: '#6366f1' },
    teal: { bg: '#0b302c', fg: '#99f6e4', border: '#0f766e' },
  },
};

export const MONO_FONT = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** Grupo de color de un marcador del Daily. */
export function dailyMarkerGroup(name: string): MarkerGroup {
  if (name.startsWith('anterior.')) return 'amber';
  if (name.startsWith('usuario.')) return 'teal';
  return 'indigo';
}

/** Grupo de color de un marcador del Excel: las filas en índigo. */
export function overtimeMarkerGroup(name: string): MarkerGroup {
  return name.startsWith('fila.') ? 'indigo' : 'amber';
}

export function useMarkerColors(group: MarkerGroup) {
  const scheme = useThemeScheme();
  return COLORS[scheme][group];
}

/** El recuadro, como vista (botones, tabla de ayuda). */
export function MarkerBox({ group, text, mono }: { group: MarkerGroup; text: string; mono?: boolean }) {
  const c = useMarkerColors(group);
  return (
    <View style={[styles.box, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.boxText, { color: c.fg }, mono ? { fontFamily: MONO_FONT, fontSize: 11 } : null]}>{text}</Text>
    </View>
  );
}

/** El recuadro dentro del texto del editor: solo fondo y color, que es lo
 *  que un `TextInput` deja dar a un tramo. */
export function MarkerSpan({ group, text }: { group: MarkerGroup; text: string }) {
  const c = useMarkerColors(group);
  return <Text style={{ backgroundColor: c.bg, color: c.fg, fontWeight: '600' }}>{text}</Text>;
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  boxText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
