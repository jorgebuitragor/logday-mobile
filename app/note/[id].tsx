import {
  RichText,
  Toolbar,
  useBridgeState,
  useEditorBridge,
  type EditorTheme,
  type RecursivePartial,
} from '@10play/tentap-editor';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Folder, Pin, Plus, Tag as TagIcon, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { getNote, setNotePinned, softDeleteNote, updateNote, type NoteInput } from '../../src/db/notes';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { htmlToMarkdown, markdownToHtml } from '../../src/lib/noteMarkdown';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Note } from '../../src/types/note';

// Mismo ámbar que desktop usa para el indicador de nota anclada
// (`text-amber-400`, ver NoteEditor.tsx/NoteList.tsx).
const PIN_COLOR = '#f59e0b';

// Mismo debounce que `schedulesSave` en NoteEditor.tsx de desktop
// (línea 963) — 600ms tras la última tecla/cambio de formato.
const SAVE_DEBOUNCE_MS = 600;

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

function buildEditorTheme(theme: ReturnType<typeof useTheme>): RecursivePartial<EditorTheme> {
  return {
    webview: { backgroundColor: theme.bgBase },
    toolbar: {
      toolbarBody: { backgroundColor: theme.bgPanel, borderTopColor: theme.border, borderBottomColor: theme.border },
      toolbarButton: { backgroundColor: theme.bgPanel },
      iconWrapper: { backgroundColor: theme.bgPanel },
      iconWrapperActive: { backgroundColor: theme.accentSoft },
      icon: { tintColor: theme.textSecondary },
      iconActive: { tintColor: theme.accentInk },
      iconDisabled: { tintColor: theme.textFaint },
      linkBarTheme: {
        addLinkContainer: { backgroundColor: theme.bgPanel, borderTopColor: theme.border, borderBottomColor: theme.border },
        linkInput: { backgroundColor: theme.bgInput, color: theme.textPrimary },
        placeholderTextColor: theme.textFaint,
        doneButton: { backgroundColor: theme.accentStrong },
        doneButtonText: { color: '#fff' },
      },
    },
  };
}

/**
 * Editor de notas — puerto de `NoteEditor.tsx` de desktop, no del
 * formulario que tenía mobile antes. Desktop no muestra un formulario:
 * crea la nota vacía (ver `note/new.tsx`) y abre directo un editor
 * cuya superficie principal es **solo título + contenido**; carpeta,
 * tags y destacado son acciones secundarias en una barra superior, no
 * campos de un formulario — ver specs/pantalla-notes/design.md,
 * "Editor simplificado" (agregado 2026-08-29, reemplaza el NoteForm
 * anterior que mostraba los 4 campos a la vez).
 */
export default function NoteEditorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [contentLoaded, setContentLoaded] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const confirmDelete = useConfirmDelete<true>(confirmDestructiveActions);

  // Refs para que el flush del autosave (ver abajo) siempre lea el
  // valor más reciente sin depender de closures potencialmente
  // obsoletas del `setTimeout` — mismo problema que resuelve
  // `activeNote` vía closure en desktop, pero acá con refs porque el
  // contenido del editor solo se puede leer de forma async
  // (`editor.getHTML()`), no puede venir de un simple `useState`.
  const titleRef = useRef('');
  const folderRef = useRef('');
  const tagsRef = useRef<string[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editorTheme = buildEditorTheme(theme);
  const editor = useEditorBridge({
    avoidIosKeyboard: true,
    initialContent: '',
    theme: editorTheme,
    onChange: () => scheduleSave(),
  });
  const bridgeState = useBridgeState(editor);

  useEffect(() => {
    getNote(id).then((loaded) => {
      setNote(loaded);
      if (loaded) {
        setTitle(loaded.title);
        titleRef.current = loaded.title;
        folderRef.current = loaded.folder;
        tagsRef.current = loaded.tags;
      }
    });
  }, [id]);

  // El WebView del editor tarda un momento en inicializar — hasta que
  // `bridgeState.isReady` no sea true, `setContent` no tiene efecto.
  useEffect(() => {
    if (note && bridgeState.isReady && !contentLoaded) {
      editor.setContent(markdownToHtml(note.content));
      setContentLoaded(true);
    }
  }, [note, bridgeState.isReady, contentLoaded]);

  function scheduleSave() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }

  async function flushSave() {
    saveTimeoutRef.current = null;
    const html = await editor.getHTML();
    const content = htmlToMarkdown(html);
    await updateNote(id, {
      title: titleRef.current.trim(),
      content,
      folder: folderRef.current,
      tags: tagsRef.current,
    });
  }

  // Guarda de inmediato (sin debounce) para cambios que no vienen de
  // tecleo continuo — carpeta, tags, destacado — igual criterio que
  // el resto de la app (autosave por operación discreta).
  async function persistNow(overrides: Partial<NoteInput>) {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const html = await editor.getHTML();
    const content = htmlToMarkdown(html);
    const input: NoteInput = {
      title: titleRef.current.trim(),
      content,
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

      <TextInput
        style={[styles.titleInput, { color: theme.textPrimary }]}
        value={title}
        onChangeText={handleTitleChange}
        placeholder={t('noteForm.titlePlaceholder')}
        placeholderTextColor={theme.textFaint}
        multiline
      />

      <RichText editor={editor} style={{ flex: 1, backgroundColor: theme.bgBase }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoider}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>

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
  keyboardAvoider: {
    width: '100%',
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
