import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { TaskForm } from '../../src/components/TaskForm';
import { getTask, softDeleteTask, updateTask, type TaskInput } from '../../src/db/tasks';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Task } from '../../src/types/task';

export default function EditTaskScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [task, setTask] = useState<Task | null | undefined>(undefined);
  const confirmDelete = useConfirmDelete<true>(confirmDestructiveActions);

  useEffect(() => {
    getTask(id).then(setTask);
  }, [id]);

  async function handleSubmit(input: TaskInput) {
    await updateTask(id, input);
    router.back();
  }

  async function performDelete() {
    await softDeleteTask(id);
    router.back();
  }

  if (task === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textSecondary }}>{t('taskForm.loadingTask')}</Text>
      </View>
    );
  }

  if (task === null) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textSecondary }}>{t('taskForm.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <TaskForm
        initialValue={{
          title: task.title,
          taskCode: task.taskCode,
          status: task.status,
          tags: task.tags,
          project: task.project,
          due: task.due,
          content: task.content,
        }}
        currentId={task.id}
        onSubmit={handleSubmit}
        submitLabel={t('taskForm.editSubmit')}
      />
      <Pressable
        style={[styles.deleteButton, { borderColor: '#dc2626' }]}
        onPress={() => confirmDelete.request(true, performDelete)}
      >
        <Text style={styles.deleteText}>{t('taskForm.delete')}</Text>
      </Pressable>

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('taskForm.confirmDeleteTitle')}
        message={t('taskForm.confirmDeleteMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={confirmDelete.cancel}
        onConfirm={() => {
          performDelete();
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
