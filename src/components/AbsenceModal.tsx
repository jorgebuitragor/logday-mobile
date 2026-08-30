import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getAbsenceDayByDate, saveAbsenceDay, saveAbsenceDayRange } from '../db/absences';
import { todayISO } from '../lib/dates';
import { useTheme } from '../theme/ThemeContext';
import type { AbsenceDay, AbsenceType } from '../types/absence';
import { AppDatePicker } from './AppDatePicker';

interface AbsenceModalProps {
  visible: boolean;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
  // No confirma acá adentro — mismo criterio que `onDelete`/
  // `onDeleteMonth` en NoteActionsSheet/DailyMonthActionsSheet: este
  // modal solo dispara la acción, la pantalla que lo abre es dueña de
  // la confirmación (su propio `ConfirmDeleteModal`, ya existente para
  // otros borrados de esa misma pantalla).
  onDelete: (absence: AbsenceDay) => void;
}

const ABSENCE_TYPES: AbsenceType[] = ['incapacidad', 'vacaciones', 'otro'];

// Puerto de `AbsenceModal.tsx` de desktop — mismo modo simple/rango,
// mismos 3 tipos, misma nota opcional. Diferencia real: acá `existing`
// se resuelve async (`getAbsenceDayByDate`, una consulta SQLite) en
// vez de un `.find()` sobre un array ya en memoria — ver
// specs/ausencias/design.md.
export function AbsenceModal({ visible, initialDate, onClose, onSaved, onDelete }: AbsenceModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [date, setDate] = useState(initialDate ?? todayISO());
  const [rangeStart, setRangeStart] = useState(date);
  const [rangeEnd, setRangeEnd] = useState(date);
  const [type, setType] = useState<AbsenceType>('incapacidad');
  const [note, setNote] = useState('');
  const [existing, setExisting] = useState<AbsenceDay | null>(null);

  useEffect(() => {
    if (visible) {
      const start = initialDate ?? todayISO();
      setMode('single');
      setDate(start);
      setRangeStart(start);
      setRangeEnd(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Mismo criterio que desktop: en modo "un día", si ya hay una
  // ausencia para esa fecha se carga para editarla en vez de crear
  // una duplicada. No aplica en modo rango (`type`/`note` son el
  // valor a aplicar a todo el rango, no algo cargado de un día).
  useEffect(() => {
    if (!visible || mode !== 'single') return;
    getAbsenceDayByDate(date).then((found) => {
      setExisting(found);
      setType(found?.type ?? 'incapacidad');
      setNote(found?.note ?? '');
    });
  }, [visible, date, mode]);

  const rangeValid = mode === 'single' || rangeEnd >= rangeStart;

  async function handleSave() {
    if (mode === 'single') {
      await saveAbsenceDay(date, type, note.trim() || null);
    } else {
      await saveAbsenceDayRange(rangeStart, rangeEnd, type, note.trim() || null);
    }
    onSaved();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {mode === 'single' && existing ? t('absence.modalTitleEdit') : t('absence.modalTitleNew')}
          </Text>

          <View style={styles.modeRow}>
            {(['single', 'range'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeButton, mode === m && { backgroundColor: theme.accentSoft }]}
              >
                <Text style={{ color: mode === m ? theme.accentInk : theme.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {t(m === 'single' ? 'absence.modeSingle' : 'absence.modeRange')}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === 'single' ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textHint }]}>{t('absence.dateLabel')}</Text>
              <AppDatePicker value={date} onChange={setDate} />
            </View>
          ) : (
            <View style={styles.rangeRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textHint }]}>{t('absence.dateFromLabel')}</Text>
                <AppDatePicker value={rangeStart} onChange={setRangeStart} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textHint }]}>{t('absence.dateToLabel')}</Text>
                <AppDatePicker value={rangeEnd} onChange={setRangeEnd} />
              </View>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textHint }]}>{t('absence.typeLabel')}</Text>
            <View style={styles.typeRow}>
              {ABSENCE_TYPES.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setType(opt)}
                  style={[styles.typeButton, type === opt && { backgroundColor: theme.accentSoft }]}
                >
                  <Text
                    style={{ color: type === opt ? theme.accentInk : theme.textSecondary, fontSize: 12, fontWeight: '600' }}
                    numberOfLines={1}
                  >
                    {t(`absence.type${opt.charAt(0).toUpperCase()}${opt.slice(1)}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textHint }]}>{t('absence.noteLabel')}</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
              value={note}
              onChangeText={setNote}
              placeholder={t('absence.notePlaceholder')}
              placeholderTextColor={theme.textFaint}
            />
          </View>

          <View style={styles.footer}>
            {mode === 'single' && existing ? (
              <Pressable
                style={styles.deleteButton}
                onPress={() => { onDelete(existing); onClose(); }}
              >
                <Trash2 size={13} color="#dc2626" />
                <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>{t('absence.delete')}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <View style={styles.footerButtons}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>{t('absence.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: theme.accentStrong, opacity: rangeValid ? 1 : 0.4 }]}
                onPress={handleSave}
                disabled={!rangeValid}
              >
                <Text style={styles.saveButtonText}>{t('absence.save')}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    gap: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
