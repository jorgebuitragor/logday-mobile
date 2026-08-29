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

export function NoteForm({ initialValue, onSubmit, submitLabel }: NoteFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [content, setContent] = useState(initialValue?.content ?? '');

  const canSubmit = title.trim().length > 0;

  const inputStyle = [
    styles.input,
    { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary },
  ];

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
        onPress={() => onSubmit({ title: title.trim(), content })}
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
