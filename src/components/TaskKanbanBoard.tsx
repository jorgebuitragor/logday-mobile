import { Calendar } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { TaskStatusIcon } from './TaskStatusIcon';
import { useTheme } from '../theme/ThemeContext';
import type { Task, TaskStatus } from '../types/task';

const COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'done'];
const OVERDUE_COLOR = '#dc2626';

interface TaskKanbanBoardProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

// Puerto conceptual de `KanbanBoard.tsx` de desktop (3 secciones por
// estado, tarjeta arrastrable entre secciones). El drag-and-drop de
// mouse de desktop no traduce 1:1, así que el gesto se reconstruye
// con el mismo patrón ya probado en Dailys (`DailyActivityList.tsx`/
// `daily/[date].tsx`): Reanimated shared values escritas en el hilo
// de UI en cada frame (sin re-render de React) + un fantasma flotante
// dentro de un `Modal` (mismo motivo: esta pantalla también tiene un
// header propio — acá el header nativo de `Tabs` — que desplazaría el
// origen de coordenadas si el fantasma no viviera en su propia
// superficie a pantalla completa).
//
// Secciones apiladas verticalmente, no columnas lado a lado (cambio
// de diseño 2026-08-30, pedido explícito del usuario tras probar la
// primera versión: "no siento que sea tan práctico con tres columnas
// en una app móvil, es muy difícil moverlo entre las tres columnas").
// Con columnas horizontales solo ~1.2 eran visibles a la vez (80% del
// ancho) y el scroll se bloquea durante el arrastre
// (`scrollEnabled={!dragTask}`), así que alcanzar la tercera columna
// era físicamente imposible sin soltar y reintentar. Apilando las 3
// secciones con `flex: 1` cada una ocupa un tercio de la altura
// disponible — las 3 zonas de destino quedan siempre visibles a la
// vez, sin depender de ningún scroll (ni horizontal ni de página) para
// alcanzarlas durante el arrastre. El scroll vertical que sí existe es
// interno a cada sección (para sus propias tarjetas), independiente
// del arrastre entre secciones.
//
// Sin reordenar dentro de una sección (desktop tampoco persiste un
// orden manual — soltar solo cambia `status`, ver
// specs/vistas-tasks/design.md), solo mover entre las 3 secciones.
export function TaskKanbanBoard({ tasks, onSelectTask, onStatusChange }: TaskKanbanBoardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const today = new Date().toISOString().slice(0, 10);

  const [dragTask, setDragTask] = useState<Task | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const todoRef = useRef<View>(null);
  const inProgressRef = useRef<View>(null);
  const doneRef = useRef<View>(null);
  const columnRefs: Record<TaskStatus, React.RefObject<View | null>> = {
    todo: todoRef,
    'in-progress': inProgressRef,
    done: doneRef,
  };

  function handleDragStart(task: Task) {
    setDragTask(task);
  }

  function handleDragEnd(task: Task, x: number, y: number) {
    setDragTask(null);
    for (const status of COLUMNS) {
      if (status === task.status) continue;
      columnRefs[status].current?.measureInWindow((tx, ty, tw, th) => {
        const hit = x >= tx && x <= tx + tw && y >= ty && y <= ty + th;
        if (hit) onStatusChange(task, status);
      });
    }
  }

  return (
    <View style={styles.container}>
      {COLUMNS.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        return (
          <View
            key={status}
            ref={columnRefs[status]}
            style={[styles.column, { borderColor: theme.border, backgroundColor: theme.bgPanel }]}
          >
            <View style={[styles.columnHeader, { borderColor: theme.border }]}>
              <TaskStatusIcon status={status} size={15} />
              <Text style={[styles.columnTitle, { color: theme.textSecondary }]}>{statusLabel(t, status)}</Text>
              <Text style={[styles.columnCount, { color: theme.textFaint }]}>{columnTasks.length}</Text>
            </View>
            <ScrollView style={styles.columnScroll} contentContainerStyle={styles.columnBody} scrollEnabled={!dragTask}>
              {columnTasks.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textFaint }]}>{t('taskList.kanbanEmptyColumn')}</Text>
              ) : (
                columnTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    today={today}
                    dragX={dragX}
                    dragY={dragY}
                    isDragging={dragTask?.id === task.id}
                    onSelect={onSelectTask}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </ScrollView>
          </View>
        );
      })}

      {dragTask ? (
        <Modal transparent visible animationType="none" statusBarTranslucent>
          <DragGhost title={dragTask.title} dragX={dragX} dragY={dragY} theme={theme} />
        </Modal>
      ) : null}
    </View>
  );
}

function statusLabel(t: (key: string) => string, status: TaskStatus): string {
  if (status === 'in-progress') return t('taskForm.statusInProgress');
  if (status === 'done') return t('taskForm.statusDone');
  return t('taskForm.statusTodo');
}

function KanbanCard({
  task,
  today,
  dragX,
  dragY,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  today: string;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  isDragging: boolean;
  onSelect: (task: Task) => void;
  onDragStart: (task: Task) => void;
  onDragEnd: (task: Task, x: number, y: number) => void;
}) {
  const theme = useTheme();
  const isOverdue = !!task.due && task.due < today && task.status !== 'done';

  // `Gesture.Race`: un toque corto resuelve el `Tap` antes de que el
  // `Pan` llegue a activarse (requiere mantener presionado 250ms), así
  // que abrir la task con un toque normal y arrastrarla con mantener
  // presionado conviven en la misma tarjeta sin un ícono de grip
  // dedicado (a diferencia de Dailys, que sí lo necesita ahí porque
  // compite además con el tap-para-editar-inline de cada actividad —
  // acá el toque corto tiene un solo significado posible: abrir).
  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)(task);
  });
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart((e) => {
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      runOnJS(onDragStart)(task);
    })
    .onUpdate((e) => {
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
    })
    .onEnd((e) => {
      runOnJS(onDragEnd)(task, e.absoluteX, e.absoluteY);
    });
  const composed = Gesture.Race(tapGesture, panGesture);

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bgSurface, borderColor: theme.borderCard },
          isDragging && styles.cardDragging,
        ]}
      >
        <Text
          style={[
            styles.cardTitle,
            {
              color: task.status === 'done' ? theme.textMuted : theme.textPrimary,
              textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {(task.taskCode || (task.project && task.project !== 'inbox') || task.due || task.tags.length > 0) ? (
          <View style={styles.cardMetaRow}>
            {task.taskCode ? <Text style={[styles.cardMetaText, { color: theme.textHint }]}>#{task.taskCode}</Text> : null}
            {task.project && task.project !== 'inbox' ? (
              <Text style={[styles.cardMetaText, { color: theme.textHint }]} numberOfLines={1}>
                {task.project}
              </Text>
            ) : null}
            {task.due ? (
              <View style={styles.cardDueWrap}>
                <Calendar size={9} color={isOverdue ? OVERDUE_COLOR : theme.textHint} />
                <Text style={[styles.cardMetaText, { color: isOverdue ? OVERDUE_COLOR : theme.textHint }]}>{task.due}</Text>
              </View>
            ) : null}
            {task.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tagPill, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.tagText, { color: theme.accentInk }]}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

// Mismo patrón que `DragGhost` en `daily/[date].tsx`: fantasma
// flotante dentro de un `Modal` (origen de coordenadas = ventana
// completa), posición animada leyendo `dragX`/`dragY` sin pasar por
// React en cada frame.
function DragGhost({
  title,
  dragX,
  dragY,
  theme,
}: {
  title: string;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  theme: ReturnType<typeof useTheme>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value - 100 }, { translateY: dragY.value - 24 }],
  }));

  return (
    <View pointerEvents="none" style={styles.ghostLayer}>
      <Animated.View style={[styles.ghostCard, { backgroundColor: theme.bgElevated, borderColor: theme.accent }, style]}>
        <Text style={{ color: theme.textPrimary, fontWeight: '600', fontSize: 13 }} numberOfLines={2}>
          {title}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    padding: 16,
    gap: 10,
  },
  column: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  columnTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columnCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  columnScroll: {
    flex: 1,
  },
  columnBody: {
    padding: 8,
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  cardDragging: {
    opacity: 0.35,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    fontSize: 10,
  },
  cardDueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tagText: {
    fontSize: 9,
  },
  ghostLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  ghostCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 200,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
