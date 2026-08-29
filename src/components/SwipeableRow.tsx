import { Pencil, Trash2 } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

interface SwipeableRowProps {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
}

/**
 * Swipe-para-revelar Editar/Eliminar — equivalente móvil del menú
 * contextual (click derecho) que usa desktop en las listas de
 * Tasks/Notes/etc. Un solo componente reusado en las 4 listas.
 */
export function SwipeableRow({ children, onEdit, onDelete, editLabel, deleteLabel }: SwipeableRowProps) {
  const theme = useTheme();
  const ref = useRef<Swipeable>(null);

  function renderRightActions() {
    return (
      <View style={styles.actions}>
        <Pressable
          style={[styles.action, styles.editAction, { backgroundColor: theme.accentStrong }]}
          onPress={() => {
            ref.current?.close();
            onEdit();
          }}
        >
          <Pencil color="#fff" size={18} strokeWidth={2} />
          <Text style={styles.actionText}>{editLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.action, styles.deleteAction, { backgroundColor: '#dc2626' }]}
          onPress={() => {
            ref.current?.close();
            onDelete();
          }}
        >
          <Trash2 color="#fff" size={18} strokeWidth={2} />
          <Text style={styles.actionText}>{deleteLabel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Swipeable ref={ref} renderRightActions={renderRightActions} overshootRight={false} rightThreshold={40}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    marginVertical: 2,
    marginLeft: 8,
  },
  action: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  editAction: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  deleteAction: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
});
