import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, CalendarPlus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCalendarGrid } from '../../src/components/AppDatePicker';
import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { parseActivityItems } from '../../src/components/DailyActivityList';
import { EmptyState } from '../../src/components/EmptyState';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { listDailyEntries, softDeleteDailyEntry } from '../../src/db/dailyEntries';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { DailyEntry } from '../../src/types/dailyEntry';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// El contenido almacenado es una lista de actividades ("- item1\n- item2");
// se muestra como una vista previa de una línea uniendo los items en vez
// de mostrar los guiones "- " crudos.
function preview(content: string): string {
  const flat = parseActivityItems(content).join(' · ');
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
}

export default function DailysScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(todayISO());
  const confirmDelete = useConfirmDelete<DailyEntry>(confirmDestructiveActions);

  const reload = useCallback(() => {
    listDailyEntries().then(setEntries);
  }, []);

  useFocusEffect(reload);

  async function performDelete(entry: DailyEntry) {
    await softDeleteDailyEntry(entry.date);
    reload();
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.date}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon={CalendarDays} message={t('dailyList.empty')} />}
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
