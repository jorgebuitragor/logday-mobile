import { Trash2 } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel: string;
}

/**
 * Swipe-para-eliminar — equivalente móvil del menú contextual (click
 * derecho) que usa desktop en las listas de Tasks/Notes/etc. Ya no
 * incluye una acción de "Editar": tocar la fila abre la edición (cada
 * pantalla ya define ese `onPress`), así que un botón de swipe
 * duplicado sobraba. Deslizar **completamente** (pasar el umbral y
 * soltar) dispara eliminar directo, vía `onSwipeableOpen` — no hace
 * falta soltar y además tocar un botón aparte.
 */
export function SwipeableRow({ children, onDelete, deleteLabel }: SwipeableRowProps) {
  const ref = useRef<Swipeable>(null);

  function renderRightActions() {
    return (
      <View style={[styles.action, { backgroundColor: '#dc2626' }]}>
        <Trash2 color="#fff" size={20} strokeWidth={2} />
        <Text style={styles.actionText}>{deleteLabel}</Text>
      </View>
    );
  }

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={100}
      onSwipeableOpen={() => {
        ref.current?.close();
        onDelete();
      }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 88,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    marginVertical: 2,
    marginLeft: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
});
