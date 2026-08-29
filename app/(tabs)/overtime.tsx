import { useFocusEffect, useRouter } from 'expo-router';
import { Timer } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { EmptyState } from '../../src/components/EmptyState';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { listOvertimeEntries, softDeleteOvertimeEntry } from '../../src/db/overtime';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { OvertimeEntry } from '../../src/types/overtime';

interface MonthSection {
  title: string; // "YYYY-MM"
  totalHoras: number;
  data: OvertimeEntry[];
}

function fmt(n: number): number {
  return Math.round(n * 100) / 100;
}

// Agrupa por mes (fecha.slice(0, 7)) manteniendo el orden ya
// descendente de `listOvertimeEntries` — reemplaza la navegación
// mes-a-mes de desktop (`OvertimeList.tsx`: prevMonth/nextMonth) por
// un único historial continuo con encabezados de mes, más apropiado
// para scroll táctil. El total por mes sí se conserva (ver
// specs/pantalla-overtime/design.md).
function groupByMonth(entries: OvertimeEntry[]): MonthSection[] {
  const sections: MonthSection[] = [];
  for (const entry of entries) {
    const key = entry.fecha.slice(0, 7);
    const last = sections[sections.length - 1];
    if (last && last.title === key) {
      last.data.push(entry);
      last.totalHoras += entry.totalHoras;
    } else {
      sections.push({ title: key, totalHoras: entry.totalHoras, data: [entry] });
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
  const confirmDelete = useConfirmDelete<OvertimeEntry>(confirmDestructiveActions);
  const monthNames = t('overtimeList.months', { returnObjects: true }) as string[];

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
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{monthLabel(section.title)}</Text>
            <Text style={[styles.sectionTotal, { color: theme.accent }]}>
              {t('overtimeList.monthTotal', { hours: fmt(section.totalHoras) })}
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
                  {item.horaInicio}–{item.horaFinal} · {item.actividad || item.solicitadaPor}
                </Text>
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
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTotal: {
    fontSize: 12,
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
