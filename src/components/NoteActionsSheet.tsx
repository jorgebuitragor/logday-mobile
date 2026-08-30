import {
  ChevronLeft,
  Copy,
  CopyPlus,
  Download,
  FileDown,
  FileText,
  FileType2,
  Folder,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Share2,
  Tag,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import type { NoteExportFormat } from '../lib/noteExport';

interface NoteActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onExport: (format: NoteExportFormat) => void;
  // Todo lo de acá para abajo es opcional a propósito: el editor
  // (`app/note/[id].tsx`) ya tiene sus propios botones para
  // pin/carpeta/tags/eliminar en su barra superior, así que le pasa
  // esta hoja sin estos props (no aparecen esas filas ahí, nada
  // duplicado dentro de la misma pantalla). La lista
  // (`app/(tabs)/notes.tsx`) sí los pasa todos — pedido explícito del
  // usuario: "que el usuario tenga de forma rápida todas las posibles
  // opciones con sus notas [desde la lista]", ver
  // specs/menu-contextual-notas/requirements.md.
  pinned?: boolean;
  folder?: string;
  tags?: string[];
  onEdit?: () => void;
  onTogglePin?: () => void;
  onSaveFolder?: (folder: string) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onDelete?: () => void;
}

type Mode = 'actions' | 'export' | 'folder' | 'tags';

export function NoteActionsSheet({
  visible,
  onClose,
  onCopy,
  onShare,
  onDuplicate,
  onExport,
  pinned,
  folder,
  tags,
  onEdit,
  onTogglePin,
  onSaveFolder,
  onAddTag,
  onRemoveTag,
  onDelete,
}: NoteActionsSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('actions');
  const [folderDraft, setFolderDraft] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (visible) {
      setMode('actions');
      setFolderDraft(folder ?? '');
      setNewTag('');
    }
    // Solo debe re-sincronizar al abrir (`visible`), no en cada cambio
    // de `folder` mientras está abierta — evitaría poder editar el
    // draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function close() {
    onClose();
  }

  function saveFolder() {
    onSaveFolder?.(folderDraft.trim());
    close();
  }

  function submitNewTag() {
    const value = newTag.trim();
    if (!value) return;
    onAddTag?.(value);
    setNewTag('');
  }

  const formats: { format: NoteExportFormat; icon: typeof FileText; label: string; subtitle: string }[] = [
    { format: 'md', icon: FileText, label: t('noteActions.formatMd'), subtitle: t('noteActions.formatMdHint') },
    { format: 'txt', icon: FileType2, label: t('noteActions.formatTxt'), subtitle: t('noteActions.formatTxtHint') },
    { format: 'pdf', icon: FileDown, label: t('noteActions.formatPdf'), subtitle: t('noteActions.formatPdfHint') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
          onPress={(e) => e.stopPropagation()}
        >
          {mode === 'actions' ? (
            <>
              {onEdit ? <Row icon={Pencil} label={t('common.edit')} onPress={() => { onEdit(); close(); }} theme={theme} /> : null}
              {onTogglePin ? (
                <Row
                  icon={pinned ? PinOff : Pin}
                  label={pinned ? t('noteForm.unpin') : t('noteForm.pin')}
                  onPress={() => { onTogglePin(); close(); }}
                  theme={theme}
                />
              ) : null}
              <Row icon={Copy} label={t('noteActions.copy')} onPress={() => { onCopy(); close(); }} theme={theme} />
              <Row icon={Share2} label={t('noteActions.share')} onPress={() => { onShare(); close(); }} theme={theme} />
              <Row icon={CopyPlus} label={t('noteActions.duplicate')} onPress={() => { onDuplicate(); close(); }} theme={theme} />
              {onSaveFolder ? <Row icon={Folder} label={t('noteForm.folderButton')} onPress={() => setMode('folder')} theme={theme} /> : null}
              {onAddTag ? <Row icon={Tag} label={t('noteForm.tagsButton')} onPress={() => setMode('tags')} theme={theme} /> : null}
              <Row icon={Download} label={t('noteActions.export')} onPress={() => setMode('export')} theme={theme} />
              {onDelete ? (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <Row icon={Trash2} label={t('noteForm.delete')} onPress={() => { onDelete(); close(); }} theme={theme} destructive />
                </>
              ) : null}
            </>
          ) : mode === 'export' ? (
            <>
              <BackRow label={t('noteActions.export')} onPress={() => setMode('actions')} theme={theme} />
              {formats.map(({ format, icon: Icon, label, subtitle }) => (
                <Pressable
                  key={format}
                  style={styles.row}
                  onPress={() => { onExport(format); close(); }}
                >
                  <Icon size={18} color={theme.textSecondary} />
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
                    <Text style={[styles.rowSubtitle, { color: theme.textFaint }]}>{subtitle}</Text>
                  </View>
                </Pressable>
              ))}
            </>
          ) : mode === 'folder' ? (
            <>
              <BackRow label={t('noteForm.folderModalTitle')} onPress={() => setMode('actions')} theme={theme} />
              <View style={styles.inlineForm}>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  value={folderDraft}
                  onChangeText={setFolderDraft}
                  placeholder={t('noteForm.folderPlaceholder')}
                  placeholderTextColor={theme.textFaint}
                  autoCapitalize="none"
                  autoFocus
                  onSubmitEditing={saveFolder}
                  returnKeyType="done"
                />
                <Pressable style={[styles.saveButton, { backgroundColor: theme.accentStrong }]} onPress={saveFolder}>
                  <Text style={styles.saveButtonText}>{t('noteForm.folderSave')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <BackRow label={t('noteForm.tagsModalTitle')} onPress={() => setMode('actions')} theme={theme} />
              <View style={styles.inlineForm}>
                {(tags ?? []).length > 0 ? (
                  <View style={styles.tagsWrap}>
                    {(tags ?? []).map((tag) => (
                      <View key={tag} style={[styles.tagPill, { backgroundColor: theme.accentSoft }]}>
                        <Text style={[styles.tagText, { color: theme.accentInk }]}>{tag}</Text>
                        <Pressable onPress={() => onRemoveTag?.(tag)} hitSlop={6} accessibilityLabel={t('noteForm.removeTag')}>
                          <X size={12} color={theme.accentInk} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View style={styles.addTagRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                    value={newTag}
                    onChangeText={setNewTag}
                    onSubmitEditing={submitNewTag}
                    placeholder={t('noteForm.tagPlaceholder')}
                    placeholderTextColor={theme.textFaint}
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                  <Pressable style={[styles.addTagButton, { borderColor: theme.border }]} onPress={submitNewTag} disabled={!newTag.trim()}>
                    <Plus size={14} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <Pressable style={[styles.saveButton, { backgroundColor: theme.accentStrong }]} onPress={close}>
                  <Text style={styles.saveButtonText}>{t('noteForm.tagsDone')}</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  icon: Icon,
  label,
  onPress,
  theme,
  destructive,
}: {
  icon: typeof Copy;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  destructive?: boolean;
}) {
  const color = destructive ? '#dc2626' : theme.textSecondary;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Icon size={18} color={color} />
      <Text style={[styles.rowLabel, { color: destructive ? '#dc2626' : theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function BackRow({ label, onPress, theme }: { label: string; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable style={styles.backRow} onPress={onPress} hitSlop={6}>
      <ChevronLeft size={16} color={theme.textSecondary} />
      <Text style={[styles.backText, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  inlineForm: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
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
