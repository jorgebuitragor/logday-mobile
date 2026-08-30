import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

// Extraído de `app/(tabs)/notes.tsx` (donde vivía como componente
// local) al agregarse un segundo consumidor (`app/search.tsx`, ver
// specs/busqueda/) — mismo chip toggle simple, ahora compartido en
// vez de duplicado.
export function FilterChip({ label, active, onPress }: FilterChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accentStrong : theme.bgPanel,
          borderColor: active ? theme.accentStrong : theme.border,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : theme.textSecondary, fontSize: 12 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
