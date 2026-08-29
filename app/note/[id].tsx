import { useLocalSearchParams, useRouter } from 'expo-router';
import { Folder, Pin, Plus, Tag as TagIcon, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { MarkdownToolbar, type TextSelection } from '../../src/components/MarkdownToolbar';
import { getNote, setNotePinned, softDeleteNote, updateNote, type NoteInput } from '../../src/db/notes';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Note } from '../../src/types/note';

// Mismo ámbar que desktop usa para el indicador de nota anclada
// (`text-amber-400`, ver NoteEditor.tsx/NoteList.tsx).
const PIN_COLOR = '#f59e0b';

// Mismo debounce que `schedulesSave` en NoteEditor.tsx de desktop
// (línea 963) — 600ms tras la última tecla.
const SAVE_DEBOUNCE_MS = 600;

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Editor de notas — puerto de `NoteEditor.tsx` de desktop, no del
 * formulario que tenía mobile antes. Desktop no muestra un formulario:
 * crea la nota vacía (ver `note/new.tsx`) y abre directo un editor
 * cuya superficie principal es **solo título + contenido**; carpeta,
 * tags y destacado son acciones secundarias en una barra superior, no
 * campos de un formulario — ver specs/pantalla-notes/design.md,
 * "Editor simplificado".
 *
 * El contenido usa un `TextInput` de texto plano + `MarkdownToolbar`
 * (envuelve la selección con tokens de markdown) — no un editor
 * WYSIWYG. Se probó `@10play/tentap-editor` (TipTap sobre WebView) y
 * se revirtió: el usuario reportó varios bugs en vivo, coincidiendo
 * con issues de Android sin resolver que ya se le habían advertido
 * antes de elegir esa opción. Ver design.md, "Reversión a toolbar de
 * markdown".
 */
export default function NoteEditorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const confirmDelete = useConfirmDelete<true>(confirmDestructiveActions);

  // `KeyboardAvoidingView` (behavior "height"/"padding") no funcionó
  // en el dispositivo del usuario: con edge-to-edge en Android, el
  // sistema no redimensiona la ventana de forma que RN pueda medir
  // vía los eventos clásicos de `Keyboard`, así que el teclado tapaba
  // la toolbar igual (ver specs/pantalla-notes/design.md, "Safe area
  // y teclado (v2)"). `useAnimatedKeyboard` de Reanimated lee el
  // inset nativo del teclado directo (no el módulo `Keyboard` legado),
  // que sí funciona con edge-to-edge — por eso las dos opciones
  // `isStatusBarTranslucentAndroid`/`isNavigationBarTranslucentAndroid`
  // en `true`: coinciden con que esta app ya es edge-to-edge (barra de
  // estado transparente, ver `app/_layout.tsx`).
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardPadding = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value }));

  // Refs para que el flush del autosave siempre lea el valor más
  // reciente sin depender de closures obsoletas del `setTimeout` —
  // mismo problema que resuelve `activeNote` vía closure en desktop.
  const titleRef = useRef('');
  const contentRef = useRef('');
  const folderRef = useRef('');
  const tagsRef = useRef<string[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getNote(id).then((loaded) => {
      setNote(loaded);
      if (loaded) {
        setTitle(loaded.title);
        setContent(loaded.content);
        titleRef.current = loaded.title;
        contentRef.current = loaded.content;
        folderRef.current = loaded.folder;
        tagsRef.current = loaded.tags;
      }
    });
  }, [id]);

  function scheduleSave() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }

  async function flushSave() {
    saveTimeoutRef.current = null;
    await updateNote(id, {
      title: titleRef.current.trim(),
      content: contentRef.current,
      folder: folderRef.current,
      tags: tagsRef.current,
    });
  }

  // Guarda de inmediato (sin debounce) para cambios que no vienen de
  // tecleo continuo — carpeta, tags, destacado — igual criterio que el
  // resto de la app (autosave por operación discreta).
  async function persistNow(overrides: Partial<NoteInput>) {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const input: NoteInput = {
      title: titleRef.current.trim(),
      content: contentRef.current,
      folder: folderRef.current,
      tags: tagsRef.current,
      ...overrides,
    };
    await updateNote(id, input);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    scheduleSave();
  }

  function handleContentChange(value: string) {
    setContent(value);
    contentRef.current = value;
    scheduleSave();
  }

  // Los botones de la toolbar de markdown mutan `content` directo
  // (envuelven la selección actual) y piden reposicionar el cursor —
  // mismo camino de guardado que tipear a mano.
  function handleToolbarChange(nextValue: string, nextSelection: TextSelection) {
    handleContentChange(nextValue);
    setSelection(nextSelection);
  }

  async function togglePin() {
    if (!note) return;
    await setNotePinned(id, !note.pinned);
    setNote(await getNote(id));
  }

  function openFolderModal() {
    setFolderDraft(folderRef.current);
    setFolderModalOpen(true);
  }

  async function saveFolder() {
    const value = folderDraft.trim();
    folderRef.current = value;
    setFolderModalOpen(false);
    await persistNow({ folder: value });
    setNote((prev) => (prev ? { ...prev, folder: value } : prev));
  }

  async function addTag() {
    const value = normalizeTag(newTag);
    if (!value || tagsRef.current.includes(value)) {
      setNewTag('');
      return;
    }
    const next = [...tagsRef.current, value];
    tagsRef.current = next;
    setNewTag('');
    await persistNow({ tags: next });
    setNote((prev) => (prev ? { ...prev, tags: next } : prev));
  }

  async function removeTag(tag: string) {
    const next = tagsRef.current.filter((existing) => existing !== tag);
    tagsRef.current = next;
    await persistNow({ tags: next });
    setNote((prev) => (prev ? { ...prev, tags: next } : prev));
  }

  async function performDelete() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
      <View style={[styles.toolbar, { borderColor: theme.border }]}>
        <Pressable
          style={[
            styles.toolbarButton,
            { borderColor: note.pinned ? PIN_COLOR : theme.border, backgroundColor: note.pinned ? `${PIN_COLOR}1a` : 'transparent' },
          ]}
          onPress={togglePin}
        >
          <Pin size={14} color={note.pinned ? PIN_COLOR : theme.textSecondary} fill={note.pinned ? PIN_COLOR : 'none'} />
        </Pressable>
        <Pressable style={[styles.toolbarButton, { borderColor: theme.border }]} onPress={openFolderModal}>
          <Folder size={14} color={theme.textSecondary} />
          {note.folder ? (
            <Text style={[styles.toolbarButtonText, { color: theme.textSecondary }]} numberOfLines={1}>
              {note.folder}
            </Text>
          ) : null}
        </Pressable>
        <Pressable style={[styles.toolbarButton, { borderColor: theme.border }]} onPress={() => setTagsModalOpen(true)}>
          <TagIcon size={14} color={theme.textSecondary} />
          {note.tags.length > 0 ? (
            <Text style={[styles.toolbarButtonText, { color: theme.textSecondary }]}>{note.tags.length}</Text>
          ) : null}
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={[styles.toolbarButton, { borderColor: '#dc2626' }]} onPress={() => confirmDelete.request(true, performDelete)}>
          <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 12 }}>{t('noteForm.delete')}</Text>
        </Pressable>
      </View>

      {/* `paddingBottom` animado = altura real del teclado (leída del
          inset nativo vía `useAnimatedKeyboard`, no de
          `KeyboardAvoidingView` — ver comentario junto a `keyboard`
          más arriba, por qué se abandonó ese camino). Empuja
          MarkdownToolbar arriba del teclado; el TextInput de
          contenido (flex:1) se encoge para darle espacio. */}
      <Animated.View style={[styles.body, keyboardPadding]}>
        <TextInput
          style={[styles.titleInput, { color: theme.textPrimary }]}
          value={title}
          onChangeText={handleTitleChange}
          placeholder={t('noteForm.titlePlaceholder')}
          placeholderTextColor={theme.textFaint}
          multiline
        />

        <TextInput
          style={[styles.contentInput, { color: theme.textBody }]}
          value={content}
          onChangeText={handleContentChange}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          selection={selection}
          placeholder={t('noteForm.contentPlaceholder')}
          placeholderTextColor={theme.textFaint}
          multiline
          textAlignVertical="top"
        />

        <MarkdownToolbar value={content} selection={selection} onChange={handleToolbarChange} />
      </Animated.View>

      <Modal visible={folderModalOpen} transparent animationType="fade" onRequestClose={() => setFolderModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFolderModalOpen(false)}>
          <Pressable style={[styles.panel, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.panelTitle, { color: theme.textPrimary }]}>{t('noteForm.folderModalTitle')}</Text>
            <TextInput
              style={[styles.panelInput, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
              value={folderDraft}
              onChangeText={setFolderDraft}
              placeholder={t('noteForm.folderPlaceholder')}
              placeholderTextColor={theme.textFaint}
              autoCapitalize="none"
              autoFocus
              onSubmitEditing={saveFolder}
              returnKeyType="done"
            />
            <Pressable style={[styles.panelSubmit, { backgroundColor: theme.accentStrong }]} onPress={saveFolder}>
              <Text style={styles.panelSubmitText}>{t('noteForm.folderSave')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={tagsModalOpen} transparent animationType="fade" onRequestClose={() => setTagsModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTagsModalOpen(false)}>
          <Pressable style={[styles.panel, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.panelTitle, { color: theme.textPrimary }]}>{t('noteForm.tagsModalTitle')}</Text>
            <View style={styles.tagsWrap}>
              {note.tags.map((tag) => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.tagText, { color: theme.accentInk }]}>{tag}</Text>
                  <Pressable onPress={() => removeTag(tag)} hitSlop={6} accessibilityLabel={t('noteForm.removeTag')}>
                    <X size={12} color={theme.accentInk} />
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={styles.addTagRow}>
              <TextInput
                style={[styles.panelInput, { flex: 1, borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={addTag}
                placeholder={t('noteForm.tagPlaceholder')}
                placeholderTextColor={theme.textFaint}
                autoCapitalize="none"
                returnKeyType="done"
              />
              <Pressable style={[styles.addTagButton, { borderColor: theme.border }]} onPress={addTag} disabled={!newTag.trim()}>
                <Plus size={14} color={theme.textSecondary} />
              </Pressable>
            </View>
            <Pressable style={[styles.panelSubmit, { backgroundColor: theme.accentStrong }]} onPress={() => setTagsModalOpen(false)}>
              <Text style={styles.panelSubmitText}>{t('noteForm.tagsDone')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
  body: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 120,
  },
  toolbarButtonText: {
    fontSize: 12,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  contentInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
    minHeight: 200,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  panelInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  panelSubmit: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  panelSubmitText: {
    color: '#fff',
    fontWeight: '600',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
    alignItems: 'center',
  },
  addTagButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
});
