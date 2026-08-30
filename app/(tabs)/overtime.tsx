import { useFocusEffect, useRouter } from 'expo-router';
import { MoreHorizontal, Timer } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { EmptyState } from '../../src/components/EmptyState';
import { OvertimeMonthActionsSheet } from '../../src/components/OvertimeMonthActionsSheet';
import { OvertimePreviewModal } from '../../src/components/OvertimePreviewModal';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import {
  getOvertimeMonthMeta,
  listOvertimeEntries,
  softDeleteOvertimeEntry,
  upsertOvertimeMonthMeta,
} from '../../src/db/overtime';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { exportOvertimeMonth } from '../../src/lib/overtimeExport';
import { observacionesLabel } from '../../src/lib/overtimeLabels';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { OvertimeEntry, OvertimeMonthMeta } from '../../src/types/overtime';

interface MonthSection {
  title: string; // "YYYY-MM"
  totalHoras: number;
  totalDiurnas: number;
  totalNocturnas: number;
  totalDiurnasFest: number;
  totalNocturnasFest: number;
  data: OvertimeEntry[];
}

function fmt(n: number): number {
  return Math.round(n * 100) / 100;
}

// Agrupa por mes (fecha.slice(0, 7)) manteniendo el orden ya
// descendente de `listOvertimeEntries` — reemplaza la navegación
// mes-a-mes de desktop (`OvertimeList.tsx`: prevMonth/nextMonth) por
// un único historial continuo con encabezados de mes, más apropiado
// para scroll táctil. El desglose completo por mes (no solo el total)
// se conserva y se muestra siempre visible en el encabezado —
// pedido explícito del usuario ("desglose automático general de las
// extras del mes, visible sin tener que abrir una extra"), ver
// specs/pantalla-overtime/design.md.
function groupByMonth(entries: OvertimeEntry[]): MonthSection[] {
  const sections: MonthSection[] = [];
  for (const entry of entries) {
    const key = entry.fecha.slice(0, 7);
    const last = sections[sections.length - 1];
    if (last && last.title === key) {
      last.data.push(entry);
      last.totalHoras += entry.totalHoras;
      last.totalDiurnas += entry.extrasDiurnas;
      last.totalNocturnas += entry.extrasNocturnas;
      last.totalDiurnasFest += entry.extrasDiurnasFestivas;
      last.totalNocturnasFest += entry.extrasNocturnasFestivas;
    } else {
      sections.push({
        title: key,
        totalHoras: entry.totalHoras,
        totalDiurnas: entry.extrasDiurnas,
        totalNocturnas: entry.extrasNocturnas,
        totalDiurnasFest: entry.extrasDiurnasFestivas,
        totalNocturnasFest: entry.extrasNocturnasFestivas,
        data: [entry],
      });
    }
  }
  return sections;
}

export default function OvertimeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [actionsMonth, setActionsMonth] = useState<MonthSection | null>(null);
  const [actionsMonthMeta, setActionsMonthMeta] = useState<OvertimeMonthMeta | null>(null);
  // Estado separado de `actionsMonth`: al tocar "Vista previa" la hoja
  // se cierra (limpia `actionsMonth`), así que hay que capturar la
  // sección/meta del momento antes de que se pierdan, no leerlas de
  // `actionsMonth` después.
  const [previewSection, setPreviewSection] = useState<MonthSection | null>(null);
  const [previewMeta, setPreviewMeta] = useState<OvertimeMonthMeta | null>(null);
  const confirmDelete = useConfirmDelete<OvertimeEntry>(confirmDestructiveActions);
  const monthNames = t('common.months', { returnObjects: true }) as string[];

  const reload = useCallback(() => {
    listOvertimeEntries().then(setEntries);
  }, []);

  useFocusEffect(reload);

  async function performDelete(entry: OvertimeEntry) {
    await softDeleteOvertimeEntry(entry.id);
    reload();
  }

  function monthLabel(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    return `${monthNames[month - 1] ?? yearMonth} ${year}`;
  }

  // Trae los datos de colaborador/cédula del mes recién que se abre
  // la hoja "⋮" — no en cada tecla, son valores de catálogo por mes,
  // no resultado de una búsqueda.
  useEffect(() => {
    if (actionsMonth) {
      getOvertimeMonthMeta(actionsMonth.title).then(setActionsMonthMeta);
    } else {
      setActionsMonthMeta(null);
    }
  }, [actionsMonth]);

  async function exportMonthSection(section: MonthSection) {
    const meta = await getOvertimeMonthMeta(section.title);
    await exportOvertimeMonth(section.title, monthLabel(section.title), section.data, meta);
  }

  async function handleSaveMeta(colaborador: string, cedula: string) {
    if (!actionsMonth) return;
    await upsertOvertimeMonthMeta(actionsMonth.title, colaborador, cedula);
  }

  function handleOpenPreview() {
    setPreviewSection(actionsMonth);
    setPreviewMeta(actionsMonthMeta);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <SectionList
        sections={groupByMonth(entries)}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<EmptyState icon={Timer} message={t('overtimeList.empty')} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTop}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{monthLabel(section.title)}</Text>
              <View style={styles.sectionHeaderRight}>
                <Text style={[styles.sectionTotal, { color: theme.accent }]}>
                  {t('overtimeList.monthTotal', { hours: fmt(section.totalHoras) })}
                </Text>
                <Pressable
                  onPress={() => setActionsMonth(section)}
                  hitSlop={8}
                  style={styles.moreButton}
                  accessibilityLabel={t('overtimeActions.menuLabel')}
                >
                  <MoreHorizontal size={16} color={theme.textFaint} />
                </Pressable>
              </View>
            </View>
            <Text style={[styles.sectionBreakdown, { color: theme.textHint }]}>
              {t('overtimeList.breakdownDay')} {fmt(section.totalDiurnas)}h · {t('overtimeList.breakdownNight')} {fmt(section.totalNocturnas)}h
              {' · '}
              {t('overtimeList.breakdownDayFest')} {fmt(section.totalDiurnasFest)}h · {t('overtimeList.breakdownNightFest')} {fmt(section.totalNocturnasFest)}h
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <SwipeableRow
            deleteLabel={t('common.delete')}
            onDelete={() => confirmDelete.request(item, performDelete)}
          >
            <Pressable
              style={[styles.row, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}
              onPress={() => router.push(`/overtime/${item.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>{item.fecha}</Text>
                <Text style={{ color: theme.textMuted }}>
                  {item.horaInicio}–{item.horaFinal} · {item.actividad || t('overtimeList.noDescription')}
                </Text>
                {item.solicitadaPor || item.observaciones ? (
                  <View style={styles.detailRow}>
                    {item.solicitadaPor ? (
                      <Text style={[styles.detailText, { color: theme.textHint }]} numberOfLines={1}>
                        {item.solicitadaPor}
                      </Text>
                    ) : null}
                    {item.observaciones ? (
                      <View style={[styles.obsPill, { backgroundColor: theme.accentSoft }]}>
                        <Text style={[styles.obsPillText, { color: theme.accentInk }]}>
                          {observacionesLabel(t, item.observaciones)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{fmt(item.totalHoras)}h</Text>
            </Pressable>
          </SwipeableRow>
        )}
      />
      <Pressable style={[styles.fab, { backgroundColor: theme.accentStrong }]} onPress={() => router.push('/overtime/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('overtimeForm.confirmDeleteTitle')}
        message={t('overtimeForm.confirmDeleteMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={confirmDelete.cancel}
        onConfirm={() => {
          if (confirmDelete.pending) performDelete(confirmDelete.pending);
          confirmDelete.cancel();
        }}
      />

      <OvertimeMonthActionsSheet
        visible={actionsMonth !== null}
        onClose={() => setActionsMonth(null)}
        onExport={() => actionsMonth && exportMonthSection(actionsMonth)}
        onPreview={handleOpenPreview}
        colaborador={actionsMonthMeta?.colaborador ?? ''}
        cedula={actionsMonthMeta?.cedula ?? ''}
        onSaveMeta={handleSaveMeta}
      />

      <OvertimePreviewModal
        visible={previewSection !== null}
        onClose={() => setPreviewSection(null)}
        onExport={() => previewSection && exportMonthSection(previewSection)}
        monthLabel={previewSection ? monthLabel(previewSection.title) : ''}
        colaborador={previewMeta?.colaborador ?? ''}
        cedula={previewMeta?.cedula ?? ''}
        entries={previewSection?.data ?? []}
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
  sectionHeader: {
    paddingTop: 12,
    paddingBottom: 6,
    gap: 3,
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTotal: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionBreakdown: {
    fontSize: 11,
  },
  moreButton: {
    padding: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  detailText: {
    fontSize: 11,
    flexShrink: 1,
  },
  obsPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  obsPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
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
