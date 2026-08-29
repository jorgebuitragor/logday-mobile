import { useFocusEffect, useRouter } from 'expo-router';
import { Notebook, Pin } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { EmptyState } from '../../src/components/EmptyState';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { listNotes, softDeleteNote } from '../../src/db/notes';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Note } from '../../src/types/note';

// Mismo ámbar que desktop usa para el indicador de nota anclada
// (`text-amber-400`, ver NoteList.tsx) — color semántico fijo, igual
// criterio que el rojo de eliminar (`#dc2626`) ya usado en esta lista.
const PIN_COLOR = '#f59e0b';

function preview(content: string): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
}

export default function NotesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [notes, setNotes] = useState<Note[]>([]);
  const confirmDelete = useConfirmDelete<Note>(confirmDestructiveActions);

  const reload = useCallback(() => {
    listNotes().then(setNotes);
  }, []);

  useFocusEffect(reload);

  async function performDelete(note: Note) {
    await softDeleteNote(note.id);
    reload();
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <FlatList
        data={notes}
        keyExtractor={(note) => note.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon={Notebook} message={t('noteList.empty')} />}
        renderItem={({ item }) => (
          <SwipeableRow
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onEdit={() => router.push(`/note/${item.id}`)}
            onDelete={() => confirmDelete.request(item, performDelete)}
          >
            <Pressable
              style={[styles.row, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}
              onPress={() => router.push(`/note/${item.id}`)}
            >
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.pinned ? (
                  <Pin
                    size={13}
                    color={PIN_COLOR}
                    fill={PIN_COLOR}
                    accessibilityLabel={t('noteList.pinnedLabel')}
                  />
                ) : null}
              </View>
              {item.folder || item.tags.length > 0 ? (
                <View style={styles.metaRow}>
                  {item.folder ? (
                    <Text style={[styles.folderText, { color: theme.textHint }]} numberOfLines={1}>
                      {item.folder}
                    </Text>
                  ) : null}
                  {item.tags.map((tag) => (
                    <View key={tag} style={[styles.tagChip, { backgroundColor: theme.accentSoft }]}>
                      <Text style={[styles.tagChipText, { color: theme.accentInk }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {item.content ? (
                <Text style={{ color: theme.textMuted }}>{preview(item.content)}</Text>
              ) : null}
            </Pressable>
          </SwipeableRow>
        )}
      />
      <Pressable style={[styles.fab, { backgroundColor: theme.accentStrong }]} onPress={() => router.push('/note/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('noteForm.confirmDeleteTitle')}
        message={t('noteForm.confirmDeleteMessage')}
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
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  folderText: {
    fontSize: 11,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagChipText: {
    fontSize: 10,
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
