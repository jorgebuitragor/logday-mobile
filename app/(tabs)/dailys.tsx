import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, CalendarPlus, MoreHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { AppCalendarGrid } from '../../src/components/AppDatePicker';
import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { parseActivityItems } from '../../src/components/DailyActivityList';
import { DailyMonthActionsSheet } from '../../src/components/DailyMonthActionsSheet';
import { EmptyState } from '../../src/components/EmptyState';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { listDailyEntries, softDeleteDailyEntry } from '../../src/db/dailyEntries';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { todayISO } from '../../src/lib/dates';
import { buildDailyMonthDoc, exportDailyMonth, type DailyMonthExportFormat } from '../../src/lib/dailyMonthExport';
import { shareText } from '../../src/lib/exportFile';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { DailyEntry } from '../../src/types/dailyEntry';

// El contenido almacenado es una lista de actividades ("- item1\n- item2");
// se muestra como una vista previa de una línea uniendo los items en vez
// de mostrar los guiones "- " crudos.
function preview(content: string): string {
  const flat = parseActivityItems(content).join(' · ');
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
}

interface MonthSection {
  title: string; // "YYYY-MM"
  data: DailyEntry[];
}

// Mismo agrupado por mes que `overtime.tsx` (`groupByMonth`) —
// reemplaza la navegación mes-a-mes de desktop por un único historial
// continuo con encabezados de mes, ahora también el punto de entrada
// del export mensual (el "⋮" del encabezado).
function groupByMonth(entries: DailyEntry[]): MonthSection[] {
  const sections: MonthSection[] = [];
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    const last = sections[sections.length - 1];
    if (last && last.title === key) {
      last.data.push(entry);
    } else {
      sections.push({ title: key, data: [entry] });
    }
  }
  return sections;
}

export default function DailysScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(todayISO());
  const [actionsMonth, setActionsMonth] = useState<string | null>(null);
  const confirmDelete = useConfirmDelete<DailyEntry>(confirmDestructiveActions);
  const monthNames = t('common.months', { returnObjects: true }) as string[];

  const reload = useCallback(() => {
    listDailyEntries().then(setEntries);
  }, []);

  useFocusEffect(reload);

  async function performDelete(entry: DailyEntry) {
    await softDeleteDailyEntry(entry.date);
    reload();
  }

  function monthLabel(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    return `${monthNames[month - 1] ?? yearMonth} ${year}`;
  }

  // Entradas del mes tocado, en orden cronológico ascendente — mismo
  // criterio que desktop antes de armar el export (ver
  // src/lib/dailyMonthExport.ts).
  const monthEntries = useMemo((): [string, string][] => {
    if (!actionsMonth) return [];
    return entries
      .filter((e) => e.date.startsWith(actionsMonth))
      .map((e): [string, string] => [e.date, e.content])
      .sort(([a], [b]) => a.localeCompare(b));
  }, [entries, actionsMonth]);

  async function handleShareMonth() {
    if (!actionsMonth) return;
    await shareText(buildDailyMonthDoc(monthLabel(actionsMonth), monthEntries, 'txt'));
  }

  async function handleExportMonth(format: DailyMonthExportFormat) {
    if (!actionsMonth) return;
    await exportDailyMonth(actionsMonth, monthLabel(actionsMonth), monthEntries, format);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <SectionList
        sections={groupByMonth(entries)}
        keyExtractor={(entry) => entry.date}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<EmptyState icon={CalendarDays} message={t('dailyList.empty')} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{monthLabel(section.title)}</Text>
            <Pressable
              onPress={() => setActionsMonth(section.title)}
              hitSlop={8}
              style={styles.moreButton}
              accessibilityLabel={t('dailyActions.menuLabel')}
            >
              <MoreHorizontal size={16} color={theme.textFaint} />
            </Pressable>
          </View>
        )}
        renderItem={({ item }) => (
          <SwipeableRow
            deleteLabel={t('common.delete')}
            onDelete={() => confirmDelete.request(item, performDelete)}
          >
            <Pressable
              style={[styles.row, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}
              onPress={() => router.push(`/daily/${item.date}`)}
            >
              <Text style={[styles.title, { color: theme.textPrimary }]}>{item.date}</Text>
              <Text style={{ color: theme.textMuted }}>{preview(item.content)}</Text>
            </Pressable>
          </SwipeableRow>
        )}
      />
      <View style={styles.fabRow}>
        <Pressable
          style={[styles.fab, styles.fabSecondary, { borderColor: theme.border, backgroundColor: theme.bgPanel }]}
          onPress={() => {
            setPickerDate(todayISO());
            setPickerVisible(true);
          }}
        >
          <CalendarPlus size={18} color={theme.textPrimary} />
        </Pressable>
        <Pressable
          style={[styles.fab, { backgroundColor: theme.accentStrong }]}
          onPress={() => router.push(`/daily/${todayISO()}`)}
        >
          <Text style={styles.fabText}>{t('dailyForm.today')}</Text>
        </Pressable>
      </View>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerVisible(false)}>
          <Pressable
            style={[styles.pickerPanel, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>{t('dailyForm.pickDateTitle')}</Text>
            <AppCalendarGrid
              value={pickerDate}
              onChange={(iso) => {
                setPickerVisible(false);
                router.push(`/daily/${iso}`);
              }}
            />
            <Pressable style={styles.pickerCancel} onPress={() => setPickerVisible(false)}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('dailyForm.confirmDeleteTitle')}
        message={t('dailyForm.confirmDeleteMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={confirmDelete.cancel}
        onConfirm={() => {
          if (confirmDelete.pending) performDelete(confirmDelete.pending);
          confirmDelete.cancel();
        }}
      />

      <DailyMonthActionsSheet
        visible={actionsMonth !== null}
        onClose={() => setActionsMonth(null)}
        onShare={handleShareMonth}
        onExport={handleExportMonth}
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
    alignItems: 'center',
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
  moreButton: {
    padding: 2,
  },
  row: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  fabRow: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    gap: 10,
  },
  fab: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabSecondary: {
    width: 44,
    paddingHorizontal: 0,
    borderWidth: 1,
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pickerPanel: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  pickerCancel: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
});
