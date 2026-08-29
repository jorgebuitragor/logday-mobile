import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { NoteForm } from '../../src/components/NoteForm';
import { getNote, softDeleteNote, updateNote, type NoteInput } from '../../src/db/notes';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Note } from '../../src/types/note';

export default function EditNoteScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const confirmDelete = useConfirmDelete<true>(confirmDestructiveActions);

  useEffect(() => {
    getNote(id).then(setNote);
  }, [id]);

  async function handleSubmit(input: NoteInput) {
    await updateNote(id, input);
    router.back();
  }

  async function performDelete() {
    await softDeleteNote(id);
    router.back();
  }

  if (note === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textSecondary }}>{t('noteForm.loadingNote')}</Text>
      </View>
    );
  }

  if (note === null) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textSecondary }}>{t('noteForm.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <NoteForm
        initialValue={{ title: note.title, content: note.content }}
        onSubmit={handleSubmit}
        submitLabel={t('noteForm.editSubmit')}
      />
      <Pressable
        style={[styles.deleteButton, { borderColor: '#dc2626' }]}
        onPress={() => confirmDelete.request(true, performDelete)}
      >
        <Text style={styles.deleteText}>{t('noteForm.delete')}</Text>
      </Pressable>

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('noteForm.confirmDeleteTitle')}
        message={t('noteForm.confirmDeleteMessage')}
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
