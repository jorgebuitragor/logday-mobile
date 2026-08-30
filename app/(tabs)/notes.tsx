import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { Grid2x2, List, MoreHorizontal, Notebook, Pin } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { EmptyState } from '../../src/components/EmptyState';
import { FilterChip } from '../../src/components/FilterChip';
import { NoteActionsSheet } from '../../src/components/NoteActionsSheet';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { ViewSwitch } from '../../src/components/ViewSwitch';
import { createNote, listNotes, softDeleteNote } from '../../src/db/notes';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { shareText } from '../../src/lib/exportFile';
import { buildMarkdownDoc, exportNote, type NoteExportFormat } from '../../src/lib/noteExport';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Note } from '../../src/types/note';

type NotesViewMode = 'list' | 'grid';

// Mismo ámbar que desktop usa para el indicador de nota anclada
// (`text-amber-400`, ver NoteList.tsx) — color semántico fijo, igual
// criterio que el rojo de eliminar (`#dc2626`) ya usado en esta lista.
const PIN_COLOR = '#f59e0b';

function preview(content: string, max = 80): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export default function NotesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [actionsNote, setActionsNote] = useState<Note | null>(null);
  // No persistida, mismo criterio que `viewMode` de Tasks — ver
  // specs/vistas-notas/design.md.
  const [viewMode, setViewMode] = useState<NotesViewMode>('list');
  const confirmDelete = useConfirmDelete<Note>(confirmDestructiveActions);

  const reload = useCallback(() => {
    listNotes().then(setNotes);
  }, []);

  useFocusEffect(reload);

  async function performDelete(note: Note) {
    await softDeleteNote(note.id);
    reload();
  }

  // Mismas 3 acciones que `NoteActionsSheet` ya ofrece dentro del
  // editor (`app/note/[id].tsx`) — acá operan sobre la `Note` de la
  // fila tocada en vez de sobre refs internas del editor, ver
  // specs/menu-contextual-notas/design.md, "Desde la lista".
  async function handleCopyNote(note: Note) {
    await Clipboard.setStringAsync(buildMarkdownDoc(note.title, note.content));
  }

  async function handleShareNote(note: Note) {
    await shareText(buildMarkdownDoc(note.title, note.content));
  }

  async function handleDuplicateNote(note: Note) {
    const duplicatedTitle = note.title.trim() ? `${note.title.trim()} (copia)` : '(copia)';
    const newId = await createNote({
      title: duplicatedTitle,
      content: note.content,
      folder: note.folder,
      tags: note.tags,
    });
    router.push(`/note/${newId}`);
  }

  async function handleExportNote(note: Note, format: NoteExportFormat) {
    await exportNote(note.title, note.content, format);
  }

  // Mismo concepto que "Filtrar por tag" en NoteList.tsx de desktop
  // (dropdown de ordenar/filtrar), adaptado a chips horizontales —
  // acá además se agrega folder, que desktop filtra desde un árbol de
  // carpetas en el sidebar (sin equivalente directo en mobile).
  const folders = useMemo(
    () => Array.from(new Set(notes.map((n) => n.folder).filter(Boolean))).sort(),
    [notes]
  );
  const tags = useMemo(
    () => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(),
    [notes]
  );
  const filteredNotes = useMemo(
    () =>
      notes.filter(
        (n) => (!filterFolder || n.folder === filterFolder) && (!filterTag || n.tags.includes(filterTag))
      ),
    [notes, filterFolder, filterTag]
  );

  // Solo para la vista Cuadrícula (estilo Google Keep: sección
  // "Destacadas" separada arriba) — la vista Lista no cambia, ya
  // muestra el pin inline en cada fila sin necesitar una sección
  // aparte.
  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.pinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter((n) => !n.pinned), [filteredNotes]);

  const viewOptions: { mode: NotesViewMode; icon: typeof List; label: string }[] = [
    { mode: 'list', icon: List, label: t('noteList.viewList') },
    { mode: 'grid', icon: Grid2x2, label: t('noteList.viewGrid') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <ViewSwitch value={viewMode} options={viewOptions} onChange={setViewMode} />
      {(folders.length > 0 || tags.length > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {folders.map((folder) => (
            <FilterChip
              key={`folder-${folder}`}
              label={folder}
              active={filterFolder === folder}
              onPress={() => setFilterFolder(filterFolder === folder ? null : folder)}
            />
          ))}
          {tags.map((tag) => (
            <FilterChip
              key={`tag-${tag}`}
              label={`#${tag}`}
              active={filterTag === tag}
              onPress={() => setFilterTag(filterTag === tag ? null : tag)}
            />
          ))}
        </ScrollView>
      )}
      {viewMode === 'grid' ? (
        <ScrollView contentContainerStyle={styles.gridScroll}>
          {filteredNotes.length === 0 ? (
            <EmptyState
              icon={Notebook}
              message={notes.length > 0 ? t('noteList.emptyFiltered') : t('noteList.empty')}
            />
          ) : (
            <>
              {pinnedNotes.length > 0 ? (
                <>
                  <Text style={[styles.gridSectionLabel, { color: theme.textHint }]}>{t('noteList.pinnedSection')}</Text>
                  <View style={styles.grid}>
                    {pinnedNotes.map((note) => (
                      <View key={note.id} style={styles.cardWrap}>
                        <NoteCard
                          note={note}
                          onPress={() => router.push(`/note/${note.id}`)}
                          onMore={() => setActionsNote(note)}
                          onDelete={() => confirmDelete.request(note, performDelete)}
                        />
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
              {otherNotes.length > 0 ? (
                <>
                  {pinnedNotes.length > 0 ? (
                    <Text style={[styles.gridSectionLabel, { color: theme.textHint }]}>{t('noteList.othersSection')}</Text>
                  ) : null}
                  <View style={styles.grid}>
                    {otherNotes.map((note) => (
                      <View key={note.id} style={styles.cardWrap}>
                        <NoteCard
                          note={note}
                          onPress={() => router.push(`/note/${note.id}`)}
                          onMore={() => setActionsNote(note)}
                          onDelete={() => confirmDelete.request(note, performDelete)}
                        />
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      ) : (
      <FlatList
        data={filteredNotes}
        keyExtractor={(note) => note.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={Notebook}
            message={notes.length > 0 ? t('noteList.emptyFiltered') : t('noteList.empty')}
          />
        }
        renderItem={({ item }) => (
          <SwipeableRow
            deleteLabel={t('common.delete')}
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
                <Pressable
                  onPress={() => setActionsNote(item)}
                  hitSlop={8}
                  style={styles.moreButton}
                  accessibilityLabel={t('noteActions.menuLabel')}
                >
                  <MoreHorizontal size={16} color={theme.textFaint} />
                </Pressable>
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
      )}
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

      <NoteActionsSheet
        visible={actionsNote !== null}
        onClose={() => setActionsNote(null)}
        onCopy={() => actionsNote && handleCopyNote(actionsNote)}
        onShare={() => actionsNote && handleShareNote(actionsNote)}
        onDuplicate={() => actionsNote && handleDuplicateNote(actionsNote)}
        onExport={(format) => actionsNote && handleExportNote(actionsNote, format)}
      />
    </View>
  );
}

// Tarjeta de la vista Cuadrícula — estilo Google Keep (título +
// preview más larga que en Lista, sin fila de metadata separada para
// no recargar una tarjeta angosta). Envuelta en `SwipeableRow` igual
// que la fila de Lista: es el único camino de borrado desde el
// listado (el menú "⋮" de `NoteActionsSheet` no ofrece Eliminar a
// propósito, ver specs/menu-contextual-notas/design.md), así que la
// vista Cuadrícula necesita conservarlo.
function NoteCard({
  note,
  onPress,
  onMore,
  onDelete,
}: {
  note: Note;
  onPress: () => void;
  onMore: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <SwipeableRow deleteLabel={t('common.delete')} onDelete={onDelete}>
      <Pressable
        style={[styles.card, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}
        onPress={onPress}
      >
        <View style={styles.cardTitleRow}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={2}>
            {note.title || t('noteForm.titlePlaceholder')}
          </Text>
          <Pressable onPress={onMore} hitSlop={8} style={styles.moreButton} accessibilityLabel={t('noteActions.menuLabel')}>
            <MoreHorizontal size={16} color={theme.textFaint} />
          </Pressable>
        </View>
        {note.content ? (
          <Text style={{ color: theme.textMuted, fontSize: 13 }} numberOfLines={6}>
            {preview(note.content, 180)}
          </Text>
        ) : null}
        {note.folder || note.tags.length > 0 ? (
          <View style={styles.metaRow}>
            {note.folder ? (
              <Text style={[styles.folderText, { color: theme.textHint }]} numberOfLines={1}>
                {note.folder}
              </Text>
            ) : null}
            {note.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.tagChipText, { color: theme.accentInk }]}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  gridScroll: {
    padding: 16,
    paddingTop: 12,
  },
  gridSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  // El ancho del 47% vive acá, no en `card` — `SwipeableRow` (la raíz
  // real de cada ítem de la fila `grid`) no fuerza un ancho propio, así
  // que un `width: '47%'` puesto en `card` (un nivel más adentro,
  // dentro del `Swipeable`) resolvía contra un ancho padre indefinido
  // en vez del ancho de la fila — tarjetas angostas e inconsistentes
  // en la práctica (reportado en vivo: "no se ve bien la cuadrícula").
  cardWrap: {
    width: '47%',
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
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
    flex: 1,
  },
  moreButton: {
    padding: 2,
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
