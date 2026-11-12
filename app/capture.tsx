import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { CheckSquare, FileText } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createNote } from '../src/db/notes';
import { createTask } from '../src/db/tasks';
import { draftFromShare, INBOX_PROJECT, splitCapture } from '../src/lib/shareCapture';
import { useTheme } from '../src/theme/ThemeContext';

// "Compartir con Logday" (specs/captura-rapida/): lo que llega de otra app
// (texto o enlace) se vuelve una tarea o una nota. La primera línea es el
// título y el resto, el contenido, como la captura rápida de Desktop. Las
// tareas van a la bandeja de entrada (`inbox`). Al guardar se abre lo que
// se creó, para terminar de completarlo.

type Kind = 'task' | 'note';

export default function CaptureScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const [kind, setKind] = useState<Kind>('task');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const draft = draftFromShare({ text: shareIntent.text, webUrl: shareIntent.webUrl, title: shareIntent.meta?.title });
    if (draft) setText(draft);
  }, [shareIntent]);

  const parts = splitCapture(text);

  async function save() {
    if (!parts || saving) return;
    setSaving(true);
    resetShareIntent();
    if (kind === 'task') {
      const id = await createTask({
        title: parts.title, taskCode: null, status: 'todo', tags: [], project: INBOX_PROJECT, due: null, progress: null, content: parts.content,
      });
      router.replace(`/task/${id}`);
    } else {
      const id = await createNote({ title: parts.title, content: parts.content, folder: '', tags: [] });
      router.replace(`/note/${id}`);
    }
  }

  function cancel() {
    resetShareIntent();
    router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: theme.bgBase }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.kindRow}>
        <KindButton icon={CheckSquare} label={t('capture.asTask')} selected={kind === 'task'} onPress={() => setKind('task')} />
        <KindButton icon={FileText} label={t('capture.asNote')} selected={kind === 'note'} onPress={() => setKind('note')} />
      </View>
      <TextInput
        style={[styles.input, { color: theme.textBody, backgroundColor: theme.bgInput, borderColor: theme.border }]}
        value={text}
        onChangeText={setText}
        multiline
        autoFocus={!text}
        placeholder={t('capture.placeholder')}
        placeholderTextColor={theme.textFaint}
        textAlignVertical="top"
      />
      <Text style={{ color: theme.textHint, fontSize: 12 }}>
        {kind === 'task' ? t('capture.hintTask') : t('capture.hintNote')}
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={cancel} style={styles.secondary} accessibilityRole="button">
          <Text style={{ color: theme.textSecondary }}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={() => void save()}
          disabled={!parts || saving}
          style={[styles.primary, { backgroundColor: theme.accentStrong, opacity: parts && !saving ? 1 : 0.5 }]}
          accessibilityRole="button"
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.save')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  function KindButton({
    icon: Icon,
    label,
    selected,
    onPress,
  }: {
    icon: ComponentType<{ size?: number; color?: string }>;
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.kind, { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accentSoft : theme.bgPanel }]}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        <Icon size={16} color={selected ? theme.accent : theme.textSecondary} />
        <Text style={{ color: selected ? theme.textPrimary : theme.textSecondary, fontWeight: '600' }}>{label}</Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  kindRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kind: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    minHeight: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
});
