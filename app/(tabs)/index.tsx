import { useFocusEffect, useRouter } from 'expo-router';
import { Calendar, CalendarRange, CheckCircle2, CheckSquare, Circle, Clock, List } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { EmptyState } from '../../src/components/EmptyState';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { TaskCalendarView } from '../../src/components/TaskCalendarView';
import { ViewSwitch } from '../../src/components/ViewSwitch';
import { listTasks, softDeleteTask, updateTaskStatus } from '../../src/db/tasks';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences, type TasksViewMode } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Task, TaskStatus } from '../../src/types/task';

// Mismo orden de ciclo que `cycleStatus` en TaskList.tsx de desktop.
const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done'];

// Colores fijos por estado (no theme-aware a propósito): mismo criterio que
// desktop, donde amber/green de estado no cambian entre claro/oscuro.
const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '', // se resuelve con theme.textMuted, ver renderStatusIcon
  'in-progress': '#fbbf24',
  done: '#4ade80',
};

const OVERDUE_COLOR = '#dc2626';

export default function TasksScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions, tasksViewMode: viewMode, setTasksViewMode: setViewMode } = usePreferences();
  const [tasks, setTasks] = useState<Task[]>([]);
  const confirmDelete = useConfirmDelete<Task>(confirmDestructiveActions);
  const today = new Date().toISOString().slice(0, 10);

  const reload = useCallback(() => {
    listTasks().then(setTasks);
  }, []);

  useFocusEffect(reload);

  async function performDelete(task: Task) {
    await softDeleteTask(task.id);
    reload();
  }

  async function cycleStatus(task: Task) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length];
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: next } : item)));
    await updateTaskStatus(task.id, next);
  }

  function statusLabel(status: TaskStatus) {
    return status === 'todo'
      ? t('taskForm.statusTodo')
      : status === 'in-progress'
        ? t('taskForm.statusInProgress')
        : t('taskForm.statusDone');
  }

  function renderStatusIcon(status: TaskStatus) {
    const color = status === 'todo' ? theme.textMuted : STATUS_COLOR[status];
    if (status === 'in-progress') return <Clock size={18} color={color} />;
    if (status === 'done') return <CheckCircle2 size={18} color={color} />;
    return <Circle size={18} color={color} />;
  }

  const viewOptions: { mode: TasksViewMode; icon: typeof List; label: string }[] = [
    { mode: 'list', icon: List, label: t('taskList.viewList') },
    { mode: 'calendar', icon: CalendarRange, label: t('taskList.viewCalendar') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <ViewSwitch value={viewMode} options={viewOptions} onChange={setViewMode} />

      {viewMode === 'calendar' ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <TaskCalendarView tasks={tasks} onSelectTask={(task) => router.push(`/task/${task.id}`)} />
        </ScrollView>
      ) : (
      <FlatList
        data={tasks}
        keyExtractor={(task) => task.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon={CheckSquare} message={t('taskList.empty')} />}
        renderItem={({ item }) => {
          const isOverdue = !!item.due && item.due < today && item.status !== 'done';
          return (
            <SwipeableRow
              deleteLabel={t('common.delete')}
              onDelete={() => confirmDelete.request(item, performDelete)}
            >
              <Pressable
                style={[styles.row, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}
                onPress={() => router.push(`/task/${item.id}`)}
              >
                <Pressable
                  onPress={() => cycleStatus(item)}
                  hitSlop={8}
                  style={styles.statusIcon}
                  accessibilityLabel={statusLabel(item.status)}
                >
                  {renderStatusIcon(item.status)}
                </Pressable>
                <View style={styles.content}>
                  <Text
                    style={[
                      styles.title,
                      {
                        color: item.status === 'done' ? theme.textMuted : theme.textPrimary,
                        textDecorationLine: item.status === 'done' ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {(item.taskCode || (item.project && item.project !== 'inbox') || item.due || item.tags.length > 0) && (
                    <View style={styles.metaRow}>
                      {item.taskCode && (
                        <Text style={[styles.metaText, { color: theme.textHint }]}>#{item.taskCode}</Text>
                      )}
                      {item.project && item.project !== 'inbox' && (
                        <Text style={[styles.metaText, { color: theme.textHint }]}>{item.project}</Text>
                      )}
                      {item.due && (
                        <View style={styles.dueWrap}>
                          <Calendar size={10} color={isOverdue ? OVERDUE_COLOR : theme.textHint} />
                          <Text style={[styles.metaText, { color: isOverdue ? OVERDUE_COLOR : theme.textHint }]}>
                            {item.due}
                          </Text>
                        </View>
                      )}
                      {item.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={[styles.tagPill, { backgroundColor: theme.accentSoft }]}>
                          <Text style={[styles.tagText, { color: theme.accentInk }]}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Pressable>
            </SwipeableRow>
          );
        }}
      />
      )}
      <Pressable style={[styles.fab, { backgroundColor: theme.accentStrong }]} onPress={() => router.push('/task/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('taskForm.confirmDeleteTitle')}
        message={t('taskForm.confirmDeleteMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={confirmDelete.cancel}
        onConfirm={() => {
          if (confirmDelete.pending) performDelete(confirmDelete.pending);
          confirmDelete.cancel();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  statusIcon: {
    marginTop: 2,
  },
  content: {
    flex: 1,
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
  },
  dueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
  },
});
