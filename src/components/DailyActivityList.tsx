import { ArrowLeftRight, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

// ── Serialización — mismo formato que task-manager/src/components/daily/DailyEditor.tsx ──
//
// Una actividad = una línea "- texto" en el string plano guardado en
// `daily_entries.content` (el esquema SQLite no cambia, ver
// specs/pantalla-dailys/design.md). Un salto de línea interno se escapa
// como "\n" literal (y una barra invertida como "\\") para no romper ese
// invariante de "una línea física = una actividad". Este es el mismo
// esquema de escape que usa desktop, así que un daily editado en mobile
// se ve y se edita igual al abrirlo en desktop, y viceversa.

function escapeItemText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

function unescapeItemText(text: string): string {
  return text.replace(/\\(\\|n)/g, (_match, c: string) => (c === 'n' ? '\n' : '\\'));
}

export function parseActivityItems(stored: string): string[] {
  return stored
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => unescapeItemText(line.slice(2)));
}

export function serializeActivityItems(items: string[]): string {
  return items.map((item) => `- ${escapeItemText(item)}`).join('\n');
}

interface DailyActivityListProps {
  /** Contenido almacenado, formato "- item1\n- item2\n...". */
  value: string;
  onChange: (value: string) => void;
  /** Panel destacado (el día seleccionado) vs. panel normal (el día previo). */
  accent?: boolean;
  addPlaceholder: string;
  moveUpLabel: string;
  moveDownLabel: string;
  deleteLabel: string;
  /** Si se pasan, cada actividad se puede deslizar para moverla al otro panel (Previo ⇄ Seleccionado). */
  moveToOtherLabel?: string;
  onMoveItemToOther?: (item: string) => void;
}

/**
 * Lista de actividades editable: añadir, editar in-line, eliminar y
 * reordenar — reemplaza el TextInput multiline plano de la primera
 * versión de esta pantalla.
 *
 * Puerto del modelo de interacción de `ActivityList` en
 * `DailyEditor.tsx` de desktop, adaptado a táctil: el drag-and-drop con
 * mouse (grip + arrastrar) no tiene un equivalente táctil directo y
 * fiable sin una librería adicional, así que **reordenar dentro del
 * mismo panel** se hace con botones subir/bajar; **mover entre
 * paneles** (Previo ⇄ Seleccionado, ver `onMoveItemToOther`) sí se
 * implementa como gesto de deslizar (swipe), reusando el mismo
 * mecanismo (`react-native-gesture-handler` `Swipeable`) que
 * `SwipeableRow` ya usa para eliminar en las listas — un "arrastre"
 * direccional consistente con el resto de la app, sin necesitar
 * drag-and-drop de posición libre entre dos `ScrollView` separados.
 * Ver design.md para el resto de reducciones de alcance (promover a
 * tarea, autocompletar tareas existentes, menú contextual de
 * actividad).
 *
 * Tanto el input de "nueva actividad" como el de edición in-line son de
 * una sola línea — desktop soporta Shift+Enter en el textarea de edición
 * para insertar un salto de línea dentro de una actividad; ese caso de
 * borde no se replica en mobile (un salto de línea preexistente,
 * creado en desktop, se conserva al guardar si no se toca esa actividad,
 * pero no es cómodo de editar como texto multilínea aquí).
 */
export function DailyActivityList({
  value,
  onChange,
  accent,
  addPlaceholder,
  moveUpLabel,
  moveDownLabel,
  deleteLabel,
  moveToOtherLabel,
  onMoveItemToOther,
}: DailyActivityListProps) {
  const theme = useTheme();
  const items = parseActivityItems(value);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [newText, setNewText] = useState('');

  function commit(nextItems: string[]) {
    onChange(serializeActivityItems(nextItems));
  }

  function addItem() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    commit([...items, trimmed]);
    setNewText('');
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditText(items[index]);
  }

  function commitEdit() {
    if (editingIndex === null) return;
    const trimmed = editText.trim();
    const next = [...items];
    if (!trimmed) {
      next.splice(editingIndex, 1);
    } else {
      next[editingIndex] = trimmed;
    }
    commit(next);
    setEditingIndex(null);
  }

  function removeItem(index: number) {
    if (editingIndex === index) setEditingIndex(null);
    commit(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  function moveToOther(index: number) {
    if (!onMoveItemToOther) return;
    const item = items[index];
    commit(items.filter((_, i) => i !== index));
    onMoveItemToOther(item);
  }

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const row = (
          <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.bgBase }]}>
            {editingIndex === index ? (
              <TextInput
                style={[styles.editInput, { color: theme.textPrimary }]}
                value={editText}
                onChangeText={setEditText}
                onSubmitEditing={commitEdit}
                onBlur={commitEdit}
                autoFocus
                returnKeyType="done"
              />
            ) : (
              <Pressable style={styles.textWrap} onPress={() => startEdit(index)}>
                <Text style={{ color: theme.textBody }}>{item}</Text>
              </Pressable>
            )}
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={moveUpLabel}
                disabled={index === 0}
                onPress={() => moveItem(index, -1)}
                hitSlop={6}
                style={styles.iconButton}
              >
                <ChevronUp size={16} color={index === 0 ? theme.textFaint : theme.textHint} />
              </Pressable>
              <Pressable
                accessibilityLabel={moveDownLabel}
                disabled={index === items.length - 1}
                onPress={() => moveItem(index, 1)}
                hitSlop={6}
                style={styles.iconButton}
              >
                <ChevronDown size={16} color={index === items.length - 1 ? theme.textFaint : theme.textHint} />
              </Pressable>
              <Pressable accessibilityLabel={deleteLabel} onPress={() => removeItem(index)} hitSlop={6} style={styles.iconButton}>
                <Trash2 size={14} color="#dc2626" />
              </Pressable>
            </View>
          </View>
        );

        if (!onMoveItemToOther || !moveToOtherLabel) return <View key={index}>{row}</View>;

        return (
          <MoveSwipeWrapper key={index} label={moveToOtherLabel} onMove={() => moveToOther(index)}>
            {row}
          </MoveSwipeWrapper>
        );
      })}

      <View style={[styles.addRow, { borderColor: accent ? theme.accent : theme.borderCard }]}>
        <Plus size={14} color={accent ? theme.accent : theme.textFaint} />
        <TextInput
          style={[styles.addInput, { color: theme.textPrimary }]}
          value={newText}
          onChangeText={setNewText}
          onSubmitEditing={addItem}
          onBlur={addItem}
          placeholder={addPlaceholder}
          placeholderTextColor={theme.textFaint}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

function MoveSwipeWrapper({
  label,
  onMove,
  children,
}: {
  label: string;
  onMove: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const ref = useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={ref}
      overshootRight={false}
      rightThreshold={80}
      onSwipeableOpen={() => {
        ref.current?.close();
        onMove();
      }}
      renderRightActions={() => (
        <View style={[styles.moveAction, { backgroundColor: theme.accentStrong }]}>
          <ArrowLeftRight color="#fff" size={16} />
          <Text style={styles.moveActionText}>{label}</Text>
        </View>
      )}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  textWrap: {
    flex: 1,
  },
  editInput: {
    flex: 1,
    padding: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconButton: {
    padding: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  addInput: {
    flex: 1,
    padding: 0,
  },
  moveAction: {
    width: 96,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  moveActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
});
