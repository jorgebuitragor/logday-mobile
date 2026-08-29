import { useFocusEffect, useRouter } from 'expo-router';
import { CheckSquare } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { EmptyState } from '../../src/components/EmptyState';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { listTasks, softDeleteTask } from '../../src/db/tasks';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Task } from '../../src/types/task';

export default function TasksScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [tasks, setTasks] = useState<Task[]>([]);
  const confirmDelete = useConfirmDelete<Task>(confirmDestructiveActions);

  const reload = useCallback(() => {
    listTasks().then(setTasks);
  }, []);

  useFocusEffect(reload);

  async function performDelete(task: Task) {
    await softDeleteTask(task.id);
    reload();
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <FlatList
        data={tasks}
        keyExtractor={(task) => task.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon={CheckSquare} message={t('taskList.empty')} />}
        renderItem={({ item }) => (
          <SwipeableRow
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onEdit={() => router.push(`/task/${item.id}`)}
            onDelete={() => confirmDelete.request(item, performDelete)}
          >
            <Pressable
              style={[styles.row, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}
              onPress={() => router.push(`/task/${item.id}`)}
            >
              <Text style={[styles.title, { color: theme.textPrimary }]}>{item.title}</Text>
              <Text style={{ color: theme.textMuted }}>{item.status}</Text>
            </Pressable>
          </SwipeableRow>
        )}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    flexShrink: 1,
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
