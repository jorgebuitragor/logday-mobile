import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { OvertimeForm } from '../../src/components/OvertimeForm';
import { getOvertimeEntry, softDeleteOvertimeEntry, updateOvertimeEntry, type OvertimeInput } from '../../src/db/overtime';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { OvertimeEntry } from '../../src/types/overtime';

export default function EditOvertimeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [entry, setEntry] = useState<OvertimeEntry | null | undefined>(undefined);
  const confirmDelete = useConfirmDelete<true>(confirmDestructiveActions);

  useEffect(() => {
    getOvertimeEntry(id).then(setEntry);
  }, [id]);

  async function handleSubmit(input: OvertimeInput) {
    await updateOvertimeEntry(id, input);
    router.back();
  }

  async function performDelete() {
    await softDeleteOvertimeEntry(id);
    router.back();
  }

  if (entry === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textSecondary }}>{t('overtimeForm.loadingEntry')}</Text>
      </View>
    );
  }

  if (entry === null) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textSecondary }}>{t('overtimeForm.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <OvertimeForm
        initialValue={{
          fecha: entry.fecha,
          horaInicio: entry.horaInicio,
          horaFinal: entry.horaFinal,
          solicitadaPor: entry.solicitadaPor,
          actividad: entry.actividad,
          observaciones: entry.observaciones,
        }}
        onSubmit={handleSubmit}
        submitLabel={t('overtimeForm.editSubmit')}
        entryId={id}
      />
      <Pressable
        style={[styles.deleteButton, { borderColor: '#dc2626' }]}
        onPress={() => confirmDelete.request(true, performDelete)}
      >
        <Text style={styles.deleteText}>{t('overtimeForm.delete')}</Text>
      </Pressable>

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('overtimeForm.confirmDeleteTitle')}
        message={t('overtimeForm.confirmDeleteMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={confirmDelete.cancel}
        onConfirm={() => {
          performDelete();
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
