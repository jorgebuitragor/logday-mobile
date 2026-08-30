import { ChevronLeft, Eye, FileSpreadsheet, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

interface OvertimeMonthActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  onPreview: () => void;
  colaborador: string;
  cedula: string;
  onSaveMeta: (colaborador: string, cedula: string) => void;
}

type Mode = 'actions' | 'meta';

// Puerto conceptual del panel colapsable "datos colaborador" + botón
// de vista previa de `OvertimeList.tsx` de desktop (ver
// specs/pantalla-overtime/design.md, "Detalles del mes") — acá viven
// dentro de la misma hoja de "⋮" en vez de un panel fijo en la barra
// lateral, porque mobile no tiene esa barra lateral (el mes no está
// "activo" de forma persistente, es una sección más de un scroll
// continuo).
export function OvertimeMonthActionsSheet({
  visible,
  onClose,
  onExport,
  onPreview,
  colaborador,
  cedula,
  onSaveMeta,
}: OvertimeMonthActionsSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('actions');
  const [colaboradorDraft, setColaboradorDraft] = useState('');
  const [cedulaDraft, setCedulaDraft] = useState('');

  useEffect(() => {
    if (visible) {
      setMode('actions');
      setColaboradorDraft(colaborador);
      setCedulaDraft(cedula);
    }
    // Solo al abrir (`visible`), no en cada cambio de `colaborador`/
    // `cedula` mientras está abierta — mismo criterio que el draft de
    // carpeta en `NoteActionsSheet`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function close() {
    onClose();
  }

  function saveMeta() {
    onSaveMeta(colaboradorDraft.trim(), cedulaDraft.trim());
    close();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
          onPress={(e) => e.stopPropagation()}
        >
          {mode === 'actions' ? (
            <>
              <Row icon={Eye} label={t('overtimeActions.preview')} onPress={() => { onPreview(); close(); }} theme={theme} />
              <Row icon={User} label={t('overtimeActions.collaboratorData')} onPress={() => setMode('meta')} theme={theme} />
              <Pressable style={styles.row} onPress={() => { onExport(); close(); }}>
                <FileSpreadsheet size={18} color={theme.textSecondary} />
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('overtimeActions.export')}</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.textFaint }]}>
                    {t('overtimeActions.formatXlsx')} · {t('overtimeActions.formatXlsxHint')}
                  </Text>
                </View>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.backRow} onPress={() => setMode('actions')} hitSlop={6}>
                <ChevronLeft size={16} color={theme.textSecondary} />
                <Text style={[styles.backText, { color: theme.textSecondary }]}>{t('overtimeActions.collaboratorData')}</Text>
              </Pressable>
              <View style={styles.inlineForm}>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  value={colaboradorDraft}
                  onChangeText={setColaboradorDraft}
                  placeholder={t('overtimeActions.collaboratorNamePlaceholder')}
                  placeholderTextColor={theme.textFaint}
                  autoFocus
                  returnKeyType="next"
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                  value={cedulaDraft}
                  onChangeText={setCedulaDraft}
                  placeholder={t('overtimeActions.collaboratorIdPlaceholder')}
                  placeholderTextColor={theme.textFaint}
                  keyboardType="number-pad"
                  onSubmitEditing={saveMeta}
                  returnKeyType="done"
                />
                <Text style={[styles.hint, { color: theme.textFaint }]}>{t('overtimeActions.collaboratorHint')}</Text>
                <Pressable style={[styles.saveButton, { backgroundColor: theme.accentStrong }]} onPress={saveMeta}>
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
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
}: {
  icon: typeof Eye;
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
  hint: {
    fontSize: 11,
    lineHeight: 15,
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
});
