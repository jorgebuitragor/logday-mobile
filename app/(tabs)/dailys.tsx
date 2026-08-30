import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, CalendarOff, CalendarPlus, ListChecks, MoreHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { AbsenceListModal } from '../../src/components/AbsenceListModal';
import { AbsenceModal } from '../../src/components/AbsenceModal';
import { AppCalendarGrid } from '../../src/components/AppDatePicker';
import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { parseActivityItems } from '../../src/components/DailyActivityList';
import { DailyMonthActionsSheet } from '../../src/components/DailyMonthActionsSheet';
import { EmptyState } from '../../src/components/EmptyState';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { deleteAbsenceDay, listAbsenceDays } from '../../src/db/absences';
import { listDailyEntries, softDeleteDailyEntry, softDeleteDailyMonth } from '../../src/db/dailyEntries';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { absenceTypeLabel } from '../../src/lib/absenceLabels';
import { todayISO } from '../../src/lib/dates';
import { buildDailyMonthDoc, exportDailyMonth, type DailyMonthExportFormat } from '../../src/lib/dailyMonthExport';
import { shareText } from '../../src/lib/exportFile';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { AbsenceDay } from '../../src/types/absence';
import type { DailyEntry } from '../../src/types/dailyEntry';

// El contenido almacenado es una lista de actividades ("- item1\n- item2");
// se muestra como una vista previa de una línea uniendo los items en vez
// de mostrar los guiones "- " crudos.
function preview(content: string): string {
  const flat = parseActivityItems(content).join(' · ');
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
}

// Mismo criterio que `formatShortWeekday` de desktop (`DailyList.tsx`)
// — nombre corto de día vía `Intl`, sin un array de nombres propio.
function weekdayShort(iso: string, language: string): string {
  const locale = language === 'es' ? 'es-CO' : 'en-US';
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d).replace('.', '');
}

function dayNumber(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDate();
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
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(todayISO());
  const [actionsMonth, setActionsMonth] = useState<string | null>(null);
  const [absences, setAbsences] = useState<AbsenceDay[]>([]);
  const [markAbsenceOpen, setMarkAbsenceOpen] = useState(false);
  const [absenceListOpen, setAbsenceListOpen] = useState(false);
  const confirmDelete = useConfirmDelete<DailyEntry>(confirmDestructiveActions);
  // Hook aparte del de arriba — misma razón que `confirmDeleteDialog`
  // vs. un segundo flujo en Overtime: son dos destinos distintos (un
  // día vs. un mes completo), con textos de confirmación propios.
  const confirmDeleteMonth = useConfirmDelete<string>(confirmDestructiveActions);
  const confirmDeleteAbsence = useConfirmDelete<AbsenceDay>(confirmDestructiveActions);
  const monthNames = t('common.months', { returnObjects: true }) as string[];
  const today = todayISO();

  const reload = useCallback(() => {
    listDailyEntries().then(setEntries);
  }, []);

  const reloadAbsences = useCallback(() => {
    listAbsenceDays().then(setAbsences);
  }, []);

  useFocusEffect(reload);
  useFocusEffect(reloadAbsences);

  // Mismo `Map` que `absenceByDate` en `DailyList.tsx` de desktop —
  // una ausencia por fecha (ver `saveAbsenceDay`, upsert por fecha).
  const absenceByDate = useMemo(() => new Map(absences.map((a) => [a.date, a])), [absences]);

  async function performDelete(entry: DailyEntry) {
    await softDeleteDailyEntry(entry.date);
    reload();
  }

  async function performDeleteAbsence(absence: AbsenceDay) {
    await deleteAbsenceDay(absence.id);
    reloadAbsences();
  }

  // Gap encontrado al comparar contra desktop (`DailyList.tsx`, menú
  // contextual del mes: exportar + "Eliminar mes") — no existía en
  // mobile, agregado 2026-08-30 junto al resto de la revisión de esta
  // pantalla.
  async function performDeleteMonth(yearMonth: string) {
    await softDeleteDailyMonth(yearMonth);
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
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => setMarkAbsenceOpen(true)}
          style={[styles.headerButton, { borderColor: theme.border }]}
          accessibilityLabel={t('absence.markButton')}
        >
          <CalendarOff size={14} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{t('absence.markButton')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setAbsenceListOpen(true)}
          style={[styles.headerButton, { borderColor: theme.border }]}
          accessibilityLabel={t('absence.listButton')}
        >
          <ListChecks size={14} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{t('absence.listButton')}</Text>
        </Pressable>
      </View>
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
              style={[styles.moreButton, { borderColor: theme.border, backgroundColor: theme.bgHover }]}
              accessibilityLabel={t('dailyActions.menuLabel')}
            >
              <MoreHorizontal size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
        )}
        renderItem={({ item }) => {
          const isToday = item.date === today;
          const taskCount = parseActivityItems(item.content).length;
          const previewText = preview(item.content);
          const absence = absenceByDate.get(item.date);
          return (
            <SwipeableRow
              deleteLabel={t('common.delete')}
              onDelete={() => confirmDelete.request(item, performDelete)}
            >
              <Pressable
                style={[
                  styles.row,
                  { backgroundColor: theme.bgPanel, borderColor: isToday ? theme.accent : theme.border },
                ]}
                onPress={() => router.push(`/daily/${item.date}`)}
              >
                <View style={styles.rowTop}>
                  <View style={styles.dateBlock}>
                    <Text style={[styles.dayNum, { color: isToday ? theme.accent : theme.textPrimary }]}>
                      {dayNumber(item.date)}
                    </Text>
                    <View>
                      <Text style={[styles.dayName, { color: isToday ? theme.accent : theme.textSecondary }]}>
                        {weekdayShort(item.date, i18n.language)}
                      </Text>
                      {taskCount > 0 ? (
                        <Text style={[styles.taskCount, { color: theme.textFaint }]}>
                          {t('dailyList.taskCount', { count: taskCount })}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.badgeColumn}>
                    {absence ? (
                      <View style={[styles.absenceBadge, { borderColor: '#f59e0b' }]}>
                        <Text style={styles.absenceBadgeText}>{absenceTypeLabel(t, absence.type)}</Text>
                      </View>
                    ) : null}
                    {isToday ? (
                      <View style={[styles.todayBadge, { backgroundColor: theme.accentSoft }]}>
                        <Text style={[styles.todayBadgeText, { color: theme.accentInk }]}>{t('dailyForm.todayBadge')}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {previewText ? (
                  <Text style={[styles.previewText, { color: theme.textMuted }]}>{previewText}</Text>
                ) : null}
              </Pressable>
            </SwipeableRow>
          );
        }}
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
        onDeleteMonth={() => actionsMonth && confirmDeleteMonth.request(actionsMonth, performDeleteMonth)}
      />

      <ConfirmDeleteModal
        visible={confirmDeleteMonth.isOpen}
        title={t('dailyActions.deleteMonthTitle')}
        message={
          confirmDeleteMonth.pending
            ? t('dailyActions.deleteMonthMessage', { month: monthLabel(confirmDeleteMonth.pending) })
            : ''
        }
        cancelLabel={t('common.cancel')}
        confirmLabel={t('dailyActions.deleteMonth')}
        onCancel={confirmDeleteMonth.cancel}
        onConfirm={() => {
          if (confirmDeleteMonth.pending) performDeleteMonth(confirmDeleteMonth.pending);
          confirmDeleteMonth.cancel();
        }}
      />

      <AbsenceModal
        visible={markAbsenceOpen}
        onClose={() => setMarkAbsenceOpen(false)}
        onSaved={reloadAbsences}
        onDelete={(absence) => {
          setMarkAbsenceOpen(false);
          confirmDeleteAbsence.request(absence, performDeleteAbsence);
        }}
      />

      <AbsenceListModal
        visible={absenceListOpen}
        absences={absences}
        onClose={() => setAbsenceListOpen(false)}
        onChanged={reloadAbsences}
      />

      <ConfirmDeleteModal
        visible={confirmDeleteAbsence.isOpen}
        title={t('absence.delete')}
        cancelLabel={t('absence.cancel')}
        confirmLabel={t('absence.delete')}
        onCancel={confirmDeleteAbsence.cancel}
        onConfirm={() => {
          if (confirmDeleteAbsence.pending) performDeleteAbsence(confirmDeleteAbsence.pending);
          confirmDeleteAbsence.cancel();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  absenceBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  absenceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#f59e0b',
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
    padding: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  row: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayNum: {
    fontSize: 24,
    fontWeight: '800',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  taskCount: {
    fontSize: 11,
  },
  todayBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 12,
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
