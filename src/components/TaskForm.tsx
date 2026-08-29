import { AlertTriangle, Plus, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { listTasks, type TaskInput } from '../db/tasks';
import { useTheme } from '../theme/ThemeContext';
import type { TaskStatus } from '../types/task';

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];

interface TaskFormProps {
  initialValue?: TaskInput;
  /** id de la task en edición, para excluirla del chequeo de taskCode
   * duplicado. Ausente al crear. */
  currentId?: string;
  onSubmit: (input: TaskInput) => void;
  submitLabel: string;
}

export function TaskForm({ initialValue, currentId, onSubmit, submitLabel }: TaskFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [status, setStatus] = useState<TaskStatus>(initialValue?.status ?? 'todo');
  const [due, setDue] = useState(initialValue?.due ?? '');
  const [content, setContent] = useState(initialValue?.content ?? '');
  const [taskCode, setTaskCode] = useState(initialValue?.taskCode ?? '');
  const [project, setProject] = useState(initialValue?.project ?? '');
  const [tags, setTags] = useState<string[]>(initialValue?.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const [existingCodes, setExistingCodes] = useState<{ id: string; taskCode: string | null }[]>([]);

  // Cargado una vez para el chequeo de taskCode duplicado (mismo criterio
  // que `isDuplicateCode`/`isDuplicateNewCode` en TaskEditor.tsx/TaskList.tsx
  // de desktop).
  useEffect(() => {
    listTasks().then((tasks) => setExistingCodes(tasks.map((task) => ({ id: task.id, taskCode: task.taskCode }))));
  }, []);

  const isDuplicateCode = useMemo(
    () =>
      taskCode.trim().length > 0 &&
      existingCodes.some((task) => task.id !== currentId && task.taskCode === taskCode.trim()),
    [taskCode, existingCodes, currentId]
  );

  const statusLabel = (s: TaskStatus) =>
    s === 'todo'
      ? t('taskForm.statusTodo')
      : s === 'in-progress'
        ? t('taskForm.statusInProgress')
        : t('taskForm.statusDone');

  const canSubmit = title.trim().length > 0 && !isDuplicateCode;

  const inputStyle = [
    styles.input,
    { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary },
  ];

  function handleTaskCodeChange(v: string) {
    setTaskCode(v.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase());
  }

  function handleAddTag() {
    const value = newTag.trim();
    if (!value) return;
    setTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setNewTag('');
  }

  function handleRemoveTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('taskForm.title')}</Text>
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={setTitle}
        placeholder={t('taskForm.titlePlaceholder')}
        placeholderTextColor={theme.textFaint}
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('taskForm.status')}</Text>
      <View style={styles.statusRow}>
        {STATUSES.map((s) => {
          const active = status === s;
          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[
                styles.statusButton,
                {
                  borderColor: active ? theme.accentStrong : theme.border,
                  backgroundColor: active ? theme.accentStrong : 'transparent',
                },
              ]}
            >
              <Text style={{ color: active ? '#fff' : theme.textSecondary }}>{statusLabel(s)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('taskForm.project')}</Text>
      <TextInput
        style={inputStyle}
        value={project}
        onChangeText={setProject}
        placeholder={t('taskForm.projectPlaceholder')}
        placeholderTextColor={theme.textFaint}
        autoCapitalize="none"
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('taskForm.due')}</Text>
      <TextInput
        style={inputStyle}
        value={due}
        onChangeText={setDue}
        placeholder="2026-09-01"
        placeholderTextColor={theme.textFaint}
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}># {t('taskForm.taskCode')}</Text>
      <TextInput
        style={[inputStyle, isDuplicateCode && { borderColor: '#dc2626' }]}
        value={taskCode}
        onChangeText={handleTaskCodeChange}
        placeholder={t('taskForm.taskCodePlaceholder')}
        placeholderTextColor={theme.textFaint}
        autoCapitalize="characters"
        maxLength={32}
      />
      {isDuplicateCode ? (
        <View style={styles.hintRow}>
          <AlertTriangle size={12} color="#dc2626" />
          <Text style={[styles.hintText, { color: '#dc2626' }]}>{t('taskForm.taskCodeDuplicate')}</Text>
        </View>
      ) : (
        <Text style={[styles.hintText, { color: theme.textFaint }]}>{t('taskForm.taskCodeHint')}</Text>
      )}

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('taskForm.tags')}</Text>
      <View style={styles.tagsWrap}>
        {tags.map((tag) => (
          <View key={tag} style={[styles.tagPill, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.tagText, { color: theme.accentInk }]}>{tag}</Text>
            <Pressable onPress={() => handleRemoveTag(tag)} hitSlop={6} accessibilityLabel={t('taskForm.removeTag')}>
              <X size={12} color={theme.accentInk} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.addTagRow}>
        <TextInput
          style={[inputStyle, styles.addTagInput]}
          value={newTag}
          onChangeText={setNewTag}
          onSubmitEditing={handleAddTag}
          placeholder={t('taskForm.tagPlaceholder')}
          placeholderTextColor={theme.textFaint}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addTagButton, { borderColor: theme.border }]}
          onPress={handleAddTag}
          disabled={!newTag.trim()}
        >
          <Plus size={14} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary }}>{t('taskForm.addTag')}</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('taskForm.content')}</Text>
      <TextInput
        style={[inputStyle, styles.multiline]}
        value={content}
        onChangeText={setContent}
        placeholder={t('taskForm.contentPlaceholder')}
        placeholderTextColor={theme.textFaint}
        multiline
      />

      <Pressable
        disabled={!canSubmit}
        style={[
          styles.submitButton,
          { backgroundColor: canSubmit ? theme.accentStrong : theme.accentSoft },
        ]}
        onPress={() =>
          onSubmit({
            title: title.trim(),
            taskCode: taskCode.trim() || null,
            status,
            tags,
            project: project.trim(),
            due: due.trim() || null,
            content,
          })
        }
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 4,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  hintText: {
    fontSize: 11,
    marginTop: 4,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  addTagInput: {
    flex: 1,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
});
