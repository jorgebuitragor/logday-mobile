import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TaskInput } from '../db/tasks';
import { useTheme } from '../theme/ThemeContext';
import type { TaskStatus } from '../types/task';

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];

interface TaskFormProps {
  initialValue?: TaskInput;
  onSubmit: (input: TaskInput) => void;
  submitLabel: string;
}

export function TaskForm({ initialValue, onSubmit, submitLabel }: TaskFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [status, setStatus] = useState<TaskStatus>(initialValue?.status ?? 'todo');
  const [due, setDue] = useState(initialValue?.due ?? '');
  const [content, setContent] = useState(initialValue?.content ?? '');

  const canSubmit = title.trim().length > 0;

  const inputStyle = [
    styles.input,
    { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary },
  ];

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
              <Text style={{ color: active ? '#fff' : theme.textSecondary }}>{s}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('taskForm.due')}</Text>
      <TextInput
        style={inputStyle}
        value={due}
        onChangeText={setDue}
        placeholder="2026-09-01"
        placeholderTextColor={theme.textFaint}
      />

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
        onPress={() => onSubmit({ title: title.trim(), status, due: due.trim() || null, content })}
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
