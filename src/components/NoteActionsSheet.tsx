import { ChevronLeft, Copy, CopyPlus, FileDown, FileText, FileType2, Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import type { NoteExportFormat } from '../lib/noteExport';

interface NoteActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onExport: (format: NoteExportFormat) => void;
}

// Reemplaza el menú contextual (clic derecho) de desktop
// (`NoteList.tsx`) — mobile no tiene clic derecho, así que estas
// mismas acciones (Copiar, Duplicar, Exportar) viven detrás de un
// botón "⋮" en la barra de la pantalla de nota. "Renombrar" y "Mostrar
// en Finder/Explorador" no se portan — ver
// specs/pantalla-notes/design.md, "Menú de más acciones", por qué.
export function NoteActionsSheet({ visible, onClose, onCopy, onDuplicate, onExport }: NoteActionsSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'actions' | 'export'>('actions');

  useEffect(() => {
    if (visible) setMode('actions');
  }, [visible]);

  function close() {
    onClose();
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
              <Row icon={Copy} label={t('noteActions.copy')} onPress={() => { onCopy(); close(); }} theme={theme} />
              <Row icon={CopyPlus} label={t('noteActions.duplicate')} onPress={() => { onDuplicate(); close(); }} theme={theme} />
              <Row icon={Share2} label={t('noteActions.export')} onPress={() => setMode('export')} theme={theme} />
            </>
          ) : (
            <>
              <Pressable style={styles.backRow} onPress={() => setMode('actions')} hitSlop={6}>
                <ChevronLeft size={16} color={theme.textSecondary} />
                <Text style={[styles.backText, { color: theme.textSecondary }]}>{t('noteActions.export')}</Text>
              </Pressable>
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
}: {
  icon: typeof Copy;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Icon size={18} color={theme.textSecondary} />
      <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
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
});
