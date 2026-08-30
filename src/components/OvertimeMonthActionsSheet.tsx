import { FileSpreadsheet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

interface OvertimeMonthActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
}

// Más simple que `NoteActionsSheet`/`DailyMonthActionsSheet`: Overtime
// solo tiene un formato de export (Excel, ver overtimeExcel.ts), así
// que no hace falta el submenú de formato ni un modo 'export' aparte
// — un único row visible directamente. Sin "Compartir": a diferencia
// de una nota o un mes de dailys, un reporte de horas extra no tiene
// una versión de texto plano natural para mandar por WhatsApp/email
// (es una tabla con fórmulas) — "Exportar" ya termina en la hoja de
// compartir nativa igual, así que agregar un segundo camino al mismo
// resultado no aportaría nada, ver specs/exportacion/design.md.
export function OvertimeMonthActionsSheet({ visible, onClose, onExport }: OvertimeMonthActionsSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable style={styles.row} onPress={() => { onExport(); onClose(); }}>
            <FileSpreadsheet size={18} color={theme.textSecondary} />
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('overtimeActions.export')}</Text>
              <Text style={[styles.rowSubtitle, { color: theme.textFaint }]}>
                {t('overtimeActions.formatXlsx')} · {t('overtimeActions.formatXlsxHint')}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
