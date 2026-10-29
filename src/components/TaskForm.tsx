import { AlertTriangle, Plus, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import { AppDatePicker } from './AppDatePicker';
import { listTasks, type TaskInput } from '../db/tasks';
import { parseProgressText, progressToText } from '../lib/taskProgress';
import { useTheme } from '../theme/ThemeContext';
import type { TaskStatus } from '../types/task';

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];
// Atajos de progreso: con un toque, sin abrir el teclado numérico.
const PROGRESS_PRESETS = [0, 25, 50, 75, 100];
const ERROR_COLOR = '#dc2626';

interface TaskFormProps {
  initialValue?: TaskInput;
  /** id de la task en edición, para excluirla del chequeo de taskCode
   * duplicado. Ausente al crear. */
  currentId?: string;
  onSubmit: (input: TaskInput) => void;
  submitLabel: string;
  /** Se pinta debajo del botón de guardar, dentro del mismo scroll (la
   *  pantalla de edición pone aquí "Eliminar"). */
  footer?: ReactNode;
}

/** Lo que manda el formulario al guardar. Las pantallas de edición la usan
 *  también sobre el valor inicial para comparar contra lo mismo que se
 *  manda (ver `updateTask`). */
export function normalizeTaskInput(input: TaskInput): TaskInput {
  return {
    title: input.title.trim(),
    taskCode: input.taskCode?.trim() || null,
    status: input.status,
    tags: input.tags,
    project: input.project.trim(),
    due: input.due?.trim() || null,
    progress: input.progress,
    content: input.content,
  };
}

export function TaskForm({ initialValue, currentId, onSubmit, submitLabel, footer }: TaskFormProps) {
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
  // Texto tal cual lo escribe el usuario; vacío = sin progreso.
  const [progressText, setProgressText] = useState(progressToText(initialValue?.progress ?? null));
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

  const parsedProgress = parseProgressText(progressText);
  const canSubmit = title.trim().length > 0 && !isDuplicateCode && parsedProgress.ok;

  // Teclado: mismo patrón que Ajustes y el editor de notas
  // (`KeyboardAvoidingView` no funciona con edge-to-edge en Android).
  // Se suma la altura real del teclado como espacio al final del
  // `ScrollView` y, al enfocar un campo que quedaría tapado, se desplaza
  // lo justo para destaparlo. `setTimeout` porque `onFocus` llega antes
  // de que el teclado termine de abrirse.
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardSpacer = useAnimatedStyle(() => ({ height: keyboard.height.value }));
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const progressInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);
  const windowHeight = useWindowDimensions().height;

  function scrollInputIntoView(node: TextInput | null) {
    if (!node) return;
    setTimeout(() => {
      node.measureInWindow((_x, y, _width, height) => {
        const keyboardTop = windowHeight - keyboard.height.value;
        const margin = 16;
        const overlap = y + height - (keyboardTop - margin);
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: scrollYRef.current + overlap, animated: true });
        }
      });
    }, 300);
  }

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
    <ScrollView
      ref={scrollRef}
      style={[styles.scroll, { backgroundColor: theme.bgBase }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScroll={(e) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
    >
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

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('taskForm.progress')}</Text>
      <View style={styles.progressRow}>
        <TextInput
          ref={progressInputRef}
          style={[inputStyle, styles.progressInput, !parsedProgress.ok && { borderColor: ERROR_COLOR }]}
          value={progressText}
          onChangeText={setProgressText}
          onFocus={() => scrollInputIntoView(progressInputRef.current)}
          placeholder={t('taskForm.progressPlaceholder')}
          placeholderTextColor={theme.textFaint}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel={t('taskForm.progress')}
        />
        <Text style={[styles.progressUnit, { color: theme.textSecondary }]}>%</Text>
        <View style={[styles.progressTrack, { backgroundColor: theme.borderCard }]}>
          {parsedProgress.ok && parsedProgress.value !== null ? (
            <View style={[styles.progressFill, { width: `${parsedProgress.value}%`, backgroundColor: theme.accent }]} />
          ) : null}
        </View>
        {progressText !== '' ? (
          <Pressable
            onPress={() => setProgressText('')}
            hitSlop={8}
            style={[styles.progressClear, { borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('taskForm.progressClear')}
          >
            <X size={14} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.progressPresets}>
        {PROGRESS_PRESETS.map((value) => {
          const active = parsedProgress.ok && parsedProgress.value === value;
          return (
            <Pressable
              key={value}
              onPress={() => setProgressText(String(value))}
              style={[
                styles.progressPreset,
                {
                  borderColor: active ? theme.accentStrong : theme.border,
                  backgroundColor: active ? theme.accentStrong : 'transparent',
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.progressPresetText, { color: active ? '#fff' : theme.textSecondary }]}>{value}%</Text>
            </Pressable>
          );
        })}
      </View>
      {parsedProgress.ok ? (
        <Text style={[styles.hintText, { color: theme.textFaint }]}>{t('taskForm.progressHint')}</Text>
      ) : (
        <View style={styles.hintRow}>
          <AlertTriangle size={12} color={ERROR_COLOR} />
          <Text style={[styles.hintText, { color: ERROR_COLOR }]}>{t('taskForm.progressInvalid')}</Text>
        </View>
      )}

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
      <AppDatePicker value={due} onChange={setDue} allowClear />

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
        ref={contentInputRef}
        style={[inputStyle, styles.multiline]}
        value={content}
        onChangeText={setContent}
        onFocus={() => scrollInputIntoView(contentInputRef.current)}
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
        onPress={() => {
          if (!parsedProgress.ok) return;
          onSubmit(normalizeTaskInput({ title, taskCode, status, tags, project, due, progress: parsedProgress.value, content }));
        }}
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>
      {footer}
      <Animated.View style={keyboardSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressInput: {
    width: 64,
    textAlign: 'center',
  },
  progressUnit: {
    fontSize: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressClear: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 6,
  },
  progressPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  progressPreset: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressPresetText: {
    fontSize: 12,
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
