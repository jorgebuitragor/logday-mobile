import { CalendarOff, Pencil, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { deleteAbsenceDay } from '../db/absences';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { absenceTypeLabel } from '../lib/absenceLabels';
import { usePreferences } from '../settings/PreferencesContext';
import { useTheme } from '../theme/ThemeContext';
import type { AbsenceDay } from '../types/absence';
import { AbsenceModal } from './AbsenceModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AbsenceListModalProps {
  visible: boolean;
  absences: AbsenceDay[];
  onClose: () => void;
  // Se llama tras cualquier guardado/borrado (edición inline o desde
  // la fila) — el listado en sí es un prop, no estado propio, así que
  // quien lo llama (`app/(tabs)/dailys.tsx`) es responsable de volver
  // a pedir `listAbsenceDays()` y pasar el array actualizado.
  onChanged: () => void;
}

function formatAbsenceDate(iso: string, language: string): string {
  const locale = language === 'es' ? 'es-CO' : 'en-US';
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

// Puerto de `AbsenceListModal.tsx` de desktop — `AbsenceModal` de
// edición vive anidado acá adentro (mismo criterio que desktop, que
// lo apila con z-index por encima del listado) en vez de delegar la
// edición a la pantalla que abrió este modal.
export function AbsenceListModal({ visible, absences, onClose, onChanged }: AbsenceListModalProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { confirmDestructiveActions } = usePreferences();
  const [editingAbsence, setEditingAbsence] = useState<AbsenceDay | null>(null);
  const confirmDelete = useConfirmDelete<AbsenceDay>(confirmDestructiveActions);

  async function performDelete(absence: AbsenceDay) {
    await deleteAbsenceDay(absence.id);
    onChanged();
  }

  const sorted = [...absences].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('absence.listTitle')}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <X size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CalendarOff size={36} color={theme.textFaint} strokeWidth={1.5} />
              <Text style={{ color: theme.textHint, fontSize: 13, marginTop: 8 }}>{t('absence.listEmpty')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowDate, { color: theme.textSecondary }]} numberOfLines={1}>
                  {formatAbsenceDate(item.date, i18n.language)}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.textHint }]} numberOfLines={1}>
                  {absenceTypeLabel(t, item.type)}
                  {item.note ? ` · ${item.note}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setEditingAbsence(item)} hitSlop={8} style={styles.iconButton}>
                <Pencil size={14} color={theme.textHint} />
              </Pressable>
              <Pressable
                onPress={() => confirmDelete.request(item, performDelete)}
                hitSlop={8}
                style={styles.iconButton}
              >
                <Trash2 size={14} color={theme.textHint} />
              </Pressable>
            </View>
          )}
        />
      </View>

      <AbsenceModal
        visible={editingAbsence !== null}
        initialDate={editingAbsence?.date}
        onClose={() => setEditingAbsence(null)}
        onSaved={onChanged}
        onDelete={(absence) => {
          setEditingAbsence(null);
          confirmDelete.request(absence, performDelete);
        }}
      />

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('absence.delete')}
        cancelLabel={t('absence.cancel')}
        confirmLabel={t('absence.delete')}
        onCancel={confirmDelete.cancel}
        onConfirm={() => {
          if (confirmDelete.pending) performDelete(confirmDelete.pending);
          confirmDelete.cancel();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  rowDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  iconButton: {
    padding: 6,
  },
});
