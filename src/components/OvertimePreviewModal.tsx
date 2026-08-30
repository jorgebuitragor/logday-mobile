import { Download, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { observacionesLabel } from '../lib/overtimeLabels';
import { useTheme } from '../theme/ThemeContext';
import type { OvertimeEntry } from '../types/overtime';

interface OvertimePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  monthLabel: string;
  colaborador: string;
  cedula: string;
  entries: OvertimeEntry[];
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

// Puerto de `OvertimePreviewModal.tsx` de desktop, adaptado de tabla
// (11 columnas, no cabrían en un teléfono) a una lista de tarjetas —
// mismos datos, mismo objetivo ("ver exactamente lo que va a salir en
// el Excel antes de exportarlo"), pero cada fila del Excel se muestra
// como una tarjeta en vez de una fila de tabla. Ver
// specs/pantalla-overtime/design.md.
export function OvertimePreviewModal({
  visible,
  onClose,
  onExport,
  monthLabel,
  colaborador,
  cedula,
  entries,
}: OvertimePreviewModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const totHoras = entries.reduce((a, e) => a + e.totalHoras, 0);
  const totDiurnas = entries.reduce((a, e) => a + e.extrasDiurnas, 0);
  const totNocturnas = entries.reduce((a, e) => a + e.extrasNocturnas, 0);
  const totDiurnasFest = entries.reduce((a, e) => a + e.extrasDiurnasFestivas, 0);
  const totNocturnasFest = entries.reduce((a, e) => a + e.extrasNocturnasFestivas, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('overtimeActions.preview')}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textHint }]}>{monthLabel}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <X size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        {colaborador || cedula ? (
          <View style={[styles.metaRow, { borderColor: theme.border, backgroundColor: theme.bgPanel }]}>
            {colaborador ? (
              <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                {colaborador}
              </Text>
            ) : null}
            {cedula ? (
              <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                CC {cedula}
              </Text>
            ) : null}
          </View>
        ) : null}

        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.cardDate, { color: theme.accent }]}>{item.fecha}</Text>
                <Text style={{ color: theme.textHint, fontSize: 11 }}>
                  {item.horaInicio}–{item.horaFinal}
                </Text>
                <Text style={[styles.cardTotal, { color: theme.textPrimary }]}>{fmt(item.totalHoras)}h</Text>
              </View>
              <Text style={{ color: theme.textBody, fontSize: 13 }}>
                {item.actividad || <Text style={{ fontStyle: 'italic', color: theme.textFaint }}>{t('overtimeList.noDescription')}</Text>}
              </Text>
              <Text style={{ color: theme.textHint, fontSize: 11 }}>
                {item.solicitadaPor}
                {item.observaciones ? ` · ${observacionesLabel(t, item.observaciones)}` : ''}
              </Text>
              <View style={[styles.breakdownRow, { borderColor: theme.border }]}>
                <BreakdownCell label={t('overtimeList.breakdownDay')} value={item.extrasDiurnas} theme={theme} />
                <BreakdownCell label={t('overtimeList.breakdownNight')} value={item.extrasNocturnas} theme={theme} />
                <BreakdownCell label={t('overtimeList.breakdownDayFest')} value={item.extrasDiurnasFestivas} theme={theme} />
                <BreakdownCell label={t('overtimeList.breakdownNightFest')} value={item.extrasNocturnasFestivas} theme={theme} />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textFaint }]}>{t('overtimeList.empty')}</Text>
          }
          ListFooterComponent={
            entries.length > 0 ? (
              <View style={[styles.totalsCard, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                <Text style={[styles.totalsTitle, { color: theme.accentInk }]}>{t('overtimeActions.previewTotalsRow')}</Text>
                <View style={styles.breakdownRow}>
                  <BreakdownCell label={t('overtimeForm.totalHours')} value={totHoras} theme={theme} bold />
                  <BreakdownCell label={t('overtimeList.breakdownDay')} value={totDiurnas} theme={theme} />
                  <BreakdownCell label={t('overtimeList.breakdownNight')} value={totNocturnas} theme={theme} />
                </View>
                <View style={styles.breakdownRow}>
                  <BreakdownCell label={t('overtimeList.breakdownDayFest')} value={totDiurnasFest} theme={theme} />
                  <BreakdownCell label={t('overtimeList.breakdownNightFest')} value={totNocturnasFest} theme={theme} />
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.footer, { borderColor: theme.border }]}>
          <Pressable style={styles.footerButton} onPress={onClose}>
            <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{t('common.close')}</Text>
          </Pressable>
          <Pressable
            style={[styles.footerButton, styles.exportButton, { backgroundColor: theme.accentStrong }]}
            onPress={onExport}
          >
            <Download size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('overtimeActions.export')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function BreakdownCell({
  label,
  value,
  theme,
  bold,
}: {
  label: string;
  value: number;
  theme: ReturnType<typeof useTheme>;
  bold?: boolean;
}) {
  return (
    <View style={styles.breakdownCell}>
      <Text style={[styles.breakdownLabel, { color: theme.textHint }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.breakdownValue, { color: theme.textPrimary, fontWeight: bold ? '800' : '600' }]}>
        {fmt(value)}h
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardTotal: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  breakdownCell: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 10,
  },
  breakdownValue: {
    fontSize: 13,
  },
  totalsCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  totalsTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exportButton: {},
});
