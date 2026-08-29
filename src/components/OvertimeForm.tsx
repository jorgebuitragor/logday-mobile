import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { OvertimeInput } from '../db/overtime';
import { calcOvertimeBreakdown } from '../lib/overtimeCalc';
import { useTheme } from '../theme/ThemeContext';

const COMP_OPTIONS = ['comp', 'pay', 'other'] as const;

interface OvertimeFormProps {
  initialValue?: OvertimeInput;
  onSubmit: (input: OvertimeInput) => void;
  submitLabel: string;
}

function fmt(n: number): number {
  return Math.round(n * 100) / 100;
}

export function OvertimeForm({ initialValue, onSubmit, submitLabel }: OvertimeFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [fecha, setFecha] = useState(initialValue?.fecha ?? '');
  const [horaInicio, setHoraInicio] = useState(initialValue?.horaInicio ?? '18:00');
  const [horaFinal, setHoraFinal] = useState(initialValue?.horaFinal ?? '20:00');
  const [solicitadaPor, setSolicitadaPor] = useState(initialValue?.solicitadaPor ?? '');
  const [actividad, setActividad] = useState(initialValue?.actividad ?? '');
  const [observaciones, setObservaciones] = useState(initialValue?.observaciones ?? 'pay');

  const preview = useMemo(() => {
    if (!fecha || !horaInicio || !horaFinal) return null;
    try {
      return calcOvertimeBreakdown(fecha, horaInicio, horaFinal);
    } catch {
      return null;
    }
  }, [fecha, horaInicio, horaFinal]);

  const canSubmit = fecha.trim().length > 0 && horaInicio.trim().length > 0 && horaFinal.trim().length > 0 && actividad.trim().length > 0;

  const inputStyle = [
    styles.input,
    { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.date')}</Text>
      <TextInput style={inputStyle} value={fecha} onChangeText={setFecha} placeholder="2026-09-01" placeholderTextColor={theme.textFaint} />

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.startTime')}</Text>
          <TextInput style={inputStyle} value={horaInicio} onChangeText={setHoraInicio} placeholder="18:00" placeholderTextColor={theme.textFaint} />
        </View>
        <View style={styles.timeField}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('overtimeForm.endTime')}</Text>
          <TextInput style={inputStyle} value={horaFinal} onChangeText={setHoraFinal} placeholder="20:00" placeholderTextColor={theme.textFaint} />
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
        onPress={() =>
          onSubmit({
            fecha: fecha.trim(),
            horaInicio: horaInicio.trim(),
            horaFinal: horaFinal.trim(),
            solicitadaPor: solicitadaPor.trim(),
            actividad: actividad.trim(),
            observaciones,
          })
        }
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>
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
});
