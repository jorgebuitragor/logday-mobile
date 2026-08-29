import { StyleSheet, Text, View, type ComponentType } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

interface EmptyStateProps {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  message: string;
  hint?: string;
}

/**
 * Ícono + mensaje centrado para listas vacías — mismo patrón que
 * desktop (`TaskList.tsx`/`NoteList.tsx`): el ícono de la sección
 * (36px, `--text-faint`, strokeWidth 1.5) más el texto de empty
 * state, en vez de solo texto plano.
 */
export function EmptyState({ icon: Icon, message, hint }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon size={36} color={theme.textFaint} strokeWidth={1.5} />
      <Text style={[styles.message, { color: theme.textHint }]}>{message}</Text>
      {hint ? <Text style={[styles.hint, { color: theme.textFaint }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    gap: 8,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
