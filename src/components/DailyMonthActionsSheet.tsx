import { ChevronLeft, Download, FileDown, FileText, FileType2, Share2, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import type { DailyMonthExportFormat } from '../lib/dailyMonthExport';

interface DailyMonthActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  onExport: (format: DailyMonthExportFormat) => void;
  onDeleteMonth: () => void;
}

// Mismo patrón que `NoteActionsSheet` (acá sin "Duplicar" — no aplica
// a un mes completo de dailys) — el mes sí tiene un menú contextual
// equivalente en desktop (clic derecho sobre el encabezado del mes en
// el sidebar, `DailyList.tsx`), que incluía "Eliminar mes" además de
// exportar — gap encontrado y agregado 2026-08-30 (ver
// specs/pantalla-dailys/design.md), no estaba portado todavía.
export function DailyMonthActionsSheet({ visible, onClose, onShare, onExport, onDeleteMonth }: DailyMonthActionsSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'actions' | 'export'>('actions');

  useEffect(() => {
    if (visible) setMode('actions');
  }, [visible]);

  function close() {
    onClose();
  }

  const formats: { format: DailyMonthExportFormat; icon: typeof FileText; label: string; subtitle: string }[] = [
    { format: 'md', icon: FileText, label: t('dailyActions.formatMd'), subtitle: t('dailyActions.formatMdHint') },
    { format: 'txt', icon: FileType2, label: t('dailyActions.formatTxt'), subtitle: t('dailyActions.formatTxtHint') },
    { format: 'pdf', icon: FileDown, label: t('dailyActions.formatPdf'), subtitle: t('dailyActions.formatPdfHint') },
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
              <Row icon={Share2} label={t('dailyActions.share')} onPress={() => { onShare(); close(); }} theme={theme} />
              <Row icon={Download} label={t('dailyActions.export')} onPress={() => setMode('export')} theme={theme} />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Row icon={Trash2} label={t('dailyActions.deleteMonth')} onPress={() => { onDeleteMonth(); close(); }} theme={theme} destructive />
            </>
          ) : (
            <>
              <Pressable style={styles.backRow} onPress={() => setMode('actions')} hitSlop={6}>
                <ChevronLeft size={16} color={theme.textSecondary} />
                <Text style={[styles.backText, { color: theme.textSecondary }]}>{t('dailyActions.export')}</Text>
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
  destructive,
}: {
  icon: typeof Share2;
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
});
