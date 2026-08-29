import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppDatePicker } from './AppDatePicker';
import { AppTimePicker } from './AppTimePicker';
import { listOvertimeEntries, type OvertimeInput } from '../db/overtime';
import { calcOvertimeBreakdown } from '../lib/overtimeCalc';
import { useTheme } from '../theme/ThemeContext';
import type { OvertimeEntry } from '../types/overtime';

const COMP_OPTIONS = ['comp', 'pay', 'other'] as const;

// Color de advertencia hardcodeado a propósito, igual que el rojo de
// destructivo en ConfirmDeleteModal/SwipeableRow — es un color
// semántico (no de marca), no un token de tema.
const WARNING_COLOR = '#f59e0b';

interface OvertimeFormProps {
  initialValue?: OvertimeInput;
  onSubmit: (input: OvertimeInput) => void;
  submitLabel: string;
  /** id de la entrada actual (edición) — se excluye a sí misma al buscar conflictos de horario. */
  entryId?: string;
}

function fmt(n: number): number {
  return Math.round(n * 100) / 100;
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

// Puerto exacto de `findConflicts` en
// task-manager/src/components/overtime/OvertimeEditor.tsx — mismo
// algoritmo de solapamiento de intervalos [start, end).
function findConflicts(
  entries: OvertimeEntry[],
  fecha: string,
  horaInicio: string,
  horaFinal: string,
  excludeId?: string
): OvertimeEntry[] {
  const start = toMinutes(horaInicio);
  const end = toMinutes(horaFinal);
  return entries.filter((e) => {
    if (e.fecha !== fecha) return false;
    if (excludeId && e.id === excludeId) return false;
    const s = toMinutes(e.horaInicio);
    const f = toMinutes(e.horaFinal);
    return start < f && s < end;
  });
}

export function OvertimeForm({ initialValue, onSubmit, submitLabel, entryId }: OvertimeFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [fecha, setFecha] = useState(initialValue?.fecha ?? '');
  const [horaInicio, setHoraInicio] = useState(initialValue?.horaInicio ?? '18:00');
  const [horaFinal, setHoraFinal] = useState(initialValue?.horaFinal ?? '20:00');
  const [solicitadaPor, setSolicitadaPor] = useState(initialValue?.solicitadaPor ?? '');
  const [actividad, setActividad] = useState(initialValue?.actividad ?? '');
  const [observaciones, setObservaciones] = useState(initialValue?.observaciones ?? 'pay');
  const [existingEntries, setExistingEntries] = useState<OvertimeEntry[]>([]);
  const [conflicts, setConflicts] = useState<OvertimeEntry[]>([]);

  useEffect(() => {
    listOvertimeEntries().then(setExistingEntries);
  }, []);

  const preview = useMemo(() => {
    if (!fecha || !horaInicio || !horaFinal) return null;
    try {
      return calcOvertimeBreakdown(fecha, horaInicio, horaFinal);
    } catch {
      return null;
    }
  }, [fecha, horaInicio, horaFinal]);

  const canSubmit = fecha.trim().length > 0 && horaInicio.trim().length > 0 && horaFinal.trim().length > 0 && actividad.trim().length > 0;

  function buildInput(): OvertimeInput {
    return {
      fecha: fecha.trim(),
      horaInicio: horaInicio.trim(),
      horaFinal: horaFinal.trim(),
      solicitadaPor: solicitadaPor.trim(),
      actividad: actividad.trim(),
      observaciones,
    };
  }

  function handleSubmitPress() {
    const found = findConflicts(existingEntries, fecha.trim(), horaInicio.trim(), horaFinal.trim(), entryId);
    if (found.length > 0) {
      setConflicts(found);
      return;
    }
    onSubmit(buildInput());
  }

  function submitAnyway() {
    setConflicts([]);
    onSubmit(buildInput());
  }

  const inputStyle = [
    styles.input,
    { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.date')}</Text>
      <AppDatePicker value={fecha} onChange={setFecha} />

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.startTime')}</Text>
          <AppTimePicker value={horaInicio} onChange={setHoraInicio} />
        </View>
        <View style={styles.timeField}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.endTime')}</Text>
          <AppTimePicker value={horaFinal} onChange={setHoraFinal} />
        </View>
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.requestedBy')}</Text>
      <TextInput
        style={inputStyle}
        value={solicitadaPor}
        onChangeText={setSolicitadaPor}
        placeholder={t('overtimeForm.requesterPlaceholder')}
        placeholderTextColor={theme.textFaint}
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.activityDone')}</Text>
      <TextInput
        style={[inputStyle, styles.multiline]}
        value={actividad}
        onChangeText={setActividad}
        placeholder={t('overtimeForm.activityPlaceholder')}
        placeholderTextColor={theme.textFaint}
        multiline
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.compPay')}</Text>
      <View style={styles.statusRow}>
        {COMP_OPTIONS.map((opt) => {
          const active = observaciones === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => setObservaciones(opt)}
              style={[
                styles.statusButton,
                { borderColor: active ? theme.accentStrong : theme.border, backgroundColor: active ? theme.accentStrong : 'transparent' },
              ]}
            >
              <Text style={{ color: active ? '#fff' : theme.textSecondary }}>{t(`overtimeForm.${opt}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      {preview && (
        <View style={[styles.preview, { borderColor: theme.accentSoft, backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.previewTitle, { color: theme.accent }]}>{t('overtimeForm.breakdown')}</Text>
          {[
            [t('overtimeForm.totalHours'), preview.totalHoras, true],
            [t('overtimeForm.extraDay'), preview.extrasDiurnas, false],
            [t('overtimeForm.extraNight'), preview.extrasNocturnas, false],
            [t('overtimeForm.holidayDay'), preview.extrasDiurnasFestivas, false],
            [t('overtimeForm.holidayNight'), preview.extrasNocturnasFestivas, false],
          ].map(([label, value, bold], i) => (
            <View key={i} style={styles.previewRow}>
              <Text style={{ color: theme.textHint }}>{label as string}</Text>
              <Text style={{ color: theme.textPrimary, fontWeight: bold ? '700' : '400' }}>{fmt(value as number)}h</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        disabled={!canSubmit}
        style={[styles.submitButton, { backgroundColor: canSubmit ? theme.accentStrong : theme.accentSoft }]}
        onPress={handleSubmitPress}
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>

      <Modal visible={conflicts.length > 0} transparent animationType="fade" onRequestClose={() => setConflicts([])}>
        <Pressable style={styles.backdrop} onPress={() => setConflicts([])}>
          <Pressable
            style={[styles.conflictPanel, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.conflictTitle, { color: WARNING_COLOR }]}>{t('overtimeForm.conflictTitle')}</Text>
            <Text style={[styles.conflictMessage, { color: theme.textSecondary }]}>
              {t('overtimeForm.conflictMessage', { count: conflicts.length, range: `${horaInicio.trim()}–${horaFinal.trim()}` })}
            </Text>
            <View style={[styles.conflictList, { borderColor: theme.border, backgroundColor: theme.bgBase }]}>
              {conflicts.map((c) => (
                <View key={c.id} style={styles.conflictRow}>
                  <Text style={[styles.conflictRowTime, { color: theme.textPrimary }]}>
                    {c.horaInicio}–{c.horaFinal}
                  </Text>
                  <Text style={[styles.conflictRowLabel, { color: theme.textHint }]} numberOfLines={1}>
                    {c.actividad || c.solicitadaPor || t('overtimeForm.conflictNoActivity')}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.conflictButtonRow}>
              <Pressable style={styles.conflictCancelButton} onPress={() => setConflicts([])}>
                <Text style={{ color: theme.textSecondary }}>{t('overtimeForm.reviewHours')}</Text>
              </Pressable>
              <Pressable style={[styles.conflictConfirmButton, { backgroundColor: WARNING_COLOR }]} onPress={submitAnyway}>
                <Text style={styles.conflictConfirmText}>{t('overtimeForm.saveAnyway')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 4,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  preview: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  conflictPanel: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  conflictTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  conflictMessage: {
    fontSize: 13,
    marginBottom: 12,
  },
  conflictList: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    marginBottom: 16,
  },
  conflictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  conflictRowTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  conflictRowLabel: {
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  conflictButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  conflictCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  conflictConfirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  conflictConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});
