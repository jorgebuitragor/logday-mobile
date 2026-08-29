import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { SwipeableRow } from '../../src/components/SwipeableRow';
import { listOvertimeEntries, softDeleteOvertimeEntry } from '../../src/db/overtime';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { OvertimeEntry } from '../../src/types/overtime';

export default function OvertimeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const confirmDelete = useConfirmDelete<OvertimeEntry>(confirmDestructiveActions);

  const reload = useCallback(() => {
    listOvertimeEntries().then(setEntries);
  }, []);

  useFocusEffect(reload);

  async function performDelete(entry: OvertimeEntry) {
    await softDeleteOvertimeEntry(entry.id);
    reload();
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>{t('overtimeList.empty')}</Text>
        }
        renderItem={({ item }) => (
          <SwipeableRow
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            onEdit={() => router.push(`/overtime/${item.id}`)}
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
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{item.totalHoras}h</Text>
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
  empty: {
    textAlign: 'center',
    marginTop: 32,
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
