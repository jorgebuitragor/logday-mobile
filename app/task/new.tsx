import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { TaskForm } from '../../src/components/TaskForm';
import { createTask, type TaskInput } from '../../src/db/tasks';

export default function NewTaskScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  async function handleSubmit(input: TaskInput) {
    await createTask(input);
    router.back();
  }

  return <TaskForm onSubmit={handleSubmit} submitLabel={t('taskForm.createSubmit')} />;
}
