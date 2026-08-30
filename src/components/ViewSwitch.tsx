import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

export interface ViewSwitchOption<T extends string> {
  mode: T;
  icon: React.ElementType;
  label: string;
}

interface ViewSwitchProps<T extends string> {
  value: T;
  options: ViewSwitchOption<T>[];
  onChange: (mode: T) => void;
}

// Extraído de `app/(tabs)/index.tsx` (Lista/Calendario de Tasks) al
// agregarse un segundo consumidor (Lista/Cuadrícula de Notes, ver
// specs/vistas-notas/) — mismo segmented control genérico en vez de
// duplicar el layout dos veces. Genérico en el tipo de `mode` (`T
// extends string`) porque cada pantalla define sus propios modos, sin
// un enum compartido entre Tasks y Notes que no tendría sentido.
export function ViewSwitch<T extends string>({ value, options, onChange }: ViewSwitchProps<T>) {
  const theme = useTheme();
  return (
    <View style={[styles.switch, { borderColor: theme.border }]}>
      {options.map(({ mode, icon: Icon, label }) => (
        <Pressable
          key={mode}
          onPress={() => onChange(mode)}
          style={[styles.option, value === mode && { backgroundColor: theme.accentSoft }]}
          accessibilityLabel={label}
        >
          <Icon size={14} color={value === mode ? theme.accentInk : theme.textSecondary} />
          <Text style={{ color: value === mode ? theme.accentInk : theme.textSecondary, fontSize: 12, fontWeight: '600' }}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 7,
  },
});
