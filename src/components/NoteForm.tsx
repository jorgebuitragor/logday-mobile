import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { NoteInput } from '../db/notes';
import { useTheme } from '../theme/ThemeContext';

interface NoteFormProps {
  initialValue?: NoteInput;
  onSubmit: (input: NoteInput) => void;
  submitLabel: string;
}

// Mismo criterio de normalización de tags que `handleAddTag` en
// NoteList.tsx de desktop: minúsculas, espacios -> guiones, sin
// duplicados (case-insensitive tras normalizar, ya que ambos lados
// pasan por el mismo proceso).
function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

export function NoteForm({ initialValue, onSubmit, submitLabel }: NoteFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [content, setContent] = useState(initialValue?.content ?? '');
  const [folder, setFolder] = useState(initialValue?.folder ?? '');
  const [tags, setTags] = useState<string[]>(initialValue?.tags ?? []);
  const [newTag, setNewTag] = useState('');

  const canSubmit = title.trim().length > 0;

  const inputStyle = [
    styles.input,
    { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary },
  ];

  function handleAddTag() {
    const value = normalizeTag(newTag);
    if (!value) return;
    setTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setNewTag('');
  }

  function handleRemoveTag(tag: string) {
    setTags((prev) => prev.filter((existing) => existing !== tag));
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('noteForm.title')}</Text>
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={setTitle}
        placeholder={t('noteForm.titlePlaceholder')}
        placeholderTextColor={theme.textFaint}
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('noteForm.folder')}</Text>
      <TextInput
        style={inputStyle}
        value={folder}
        onChangeText={setFolder}
        placeholder={t('noteForm.folderPlaceholder')}
        placeholderTextColor={theme.textFaint}
        autoCapitalize="none"
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('noteForm.tags')}</Text>
      <View style={styles.tagsWrap}>
        {tags.map((tag) => (
          <View key={tag} style={[styles.tagPill, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.tagText, { color: theme.accentInk }]}>{tag}</Text>
            <Pressable onPress={() => handleRemoveTag(tag)} hitSlop={6} accessibilityLabel={t('noteForm.removeTag')}>
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
          placeholder={t('noteForm.tagPlaceholder')}
          placeholderTextColor={theme.textFaint}
          autoCapitalize="none"
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addTagButton, { borderColor: theme.border }]}
          onPress={handleAddTag}
          disabled={!newTag.trim()}
        >
          <Plus size={14} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary }}>{t('noteForm.addTag')}</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('noteForm.content')}</Text>
      <TextInput
        style={[inputStyle, styles.multiline]}
        value={content}
        onChangeText={setContent}
        placeholder={t('noteForm.contentPlaceholder')}
        placeholderTextColor={theme.textFaint}
        multiline
      />

      <Pressable
        disabled={!canSubmit}
        style={[
          styles.submitButton,
          { backgroundColor: canSubmit ? theme.accentStrong : theme.accentSoft },
        ]}
        onPress={() => onSubmit({ title: title.trim(), content, folder: folder.trim(), tags })}
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
    minHeight: 200,
    textAlignVertical: 'top',
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
