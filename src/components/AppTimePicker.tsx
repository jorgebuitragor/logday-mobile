import { Clock } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePreferences } from '../settings/PreferencesContext';
import { useTheme } from '../theme/ThemeContext';

// Desktop usa el <input type="time"> nativo del navegador para
// horaInicio/horaFinal (OvertimeEditor.tsx) — no hay un componente
// propio que portar acá, a diferencia de AppDatePicker. Se construyó
// desde cero pero con el mismo lenguaje visual: botón-trigger + modal
// centrado con `Pressable`s themed, mismo patrón que AppDatePicker/
// ConfirmDeleteModal.
//
// El valor (`value`/`onChange`) siempre es `HH:MM` en 24 horas — mismo
// formato que ya usa `overtime_entries`/`overtimeCalc.ts`. La
// preferencia `timeFormat` (Ajustes → Formato de hora) solo cambia
// cómo se **muestra y selecciona** la hora (columna 1-12 + AM/PM en
// vez de 0-23), nunca el dato guardado — evita cualquier conversión
// en la capa de datos o en el cálculo de horas extra.

const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const COLUMN_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

type Period = 'AM' | 'PM';

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map(Number);
  return {
    hour: Number.isFinite(h) ? h : 0,
    minute: Number.isFinite(m) ? m : 0,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function to12(hour24: number): { hour12: number; period: Period } {
  const period: Period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, period };
}

function from12(hour12: number, period: Period): number {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function formatTimeDisplay(value: string, format: '24h' | '12h'): string {
  if (!value) return '';
  if (format === '24h') return value;
  const { hour, minute } = parseTime(value);
  const { hour12, period } = to12(hour);
  return `${hour12}:${pad(minute)} ${period}`;
}

interface AppTimePickerProps {
  /** `HH:MM` en 24 horas, o `''` si no hay hora seleccionada. */
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
}

export function AppTimePicker({ value, onChange, placeholder }: AppTimePickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { timeFormat } = usePreferences();
  const [open, setOpen] = useState(false);
  const initial = parseTime(value || '00:00');
  const [hour24, setHour24] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!open) return;
    const parsed = parseTime(value || '00:00');
    setHour24(parsed.hour);
    setMinute(parsed.minute);
    requestAnimationFrame(() => {
      const hourIndex = timeFormat === '12h' ? to12(parsed.hour).hour12 - 1 : parsed.hour;
      hourScrollRef.current?.scrollTo({ y: hourIndex * ROW_HEIGHT, animated: false });
      minuteScrollRef.current?.scrollTo({ y: (parsed.minute / MINUTE_STEP) * ROW_HEIGHT, animated: false });
    });
  }, [open, value, timeFormat]);

  function confirm() {
    onChange(`${pad(hour24)}:${pad(minute)}`);
    setOpen(false);
  }

  const { hour12, period } = to12(hour24);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.bgInput }]}
      >
        <Clock size={16} color={theme.textHint} />
        <Text style={{ color: value ? theme.textPrimary : theme.textFaint, fontSize: 15 }}>
          {formatTimeDisplay(value, timeFormat) || placeholder || t('common.selectTime')}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.panel, { backgroundColor: theme.bgPanel, borderColor: theme.borderCard }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.columns}>
              {timeFormat === '12h' ? (
                <TimeColumn
                  scrollRef={hourScrollRef}
                  values={HOURS_12}
                  selected={hour12}
                  format={String}
                  onSelect={(h) => setHour24(from12(h, period))}
                />
              ) : (
                <TimeColumn
                  scrollRef={hourScrollRef}
                  values={HOURS_24}
                  selected={hour24}
                  format={pad}
                  onSelect={setHour24}
                />
              )}
              <Text style={[styles.separator, { color: theme.textPrimary }]}>:</Text>
              <TimeColumn
                scrollRef={minuteScrollRef}
                values={MINUTES}
                selected={minute}
                format={pad}
                onSelect={setMinute}
              />
              {timeFormat === '12h' ? (
                <View style={styles.periodColumn}>
                  {(['AM', 'PM'] as Period[]).map((p) => {
                    const isSelected = p === period;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setHour24(from12(hour12, p))}
                        style={[
                          styles.periodButton,
                          { borderColor: theme.border },
                          isSelected && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
                        ]}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? theme.accent : theme.textSecondary }}>
                          {p}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <Pressable style={[styles.confirmButton, { backgroundColor: theme.accentStrong }]} onPress={confirm}>
              <Text style={styles.confirmText}>{t('common.save')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

interface TimeColumnProps {
  scrollRef: React.RefObject<ScrollView | null>;
  values: number[];
  selected: number;
  format: (n: number) => string;
  onSelect: (n: number) => void;
}

function TimeColumn({ scrollRef, values, selected, format, onSelect }: TimeColumnProps) {
  const theme = useTheme();
  return (
    <View style={[styles.column, { borderColor: theme.border }]}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} snapToInterval={ROW_HEIGHT} decelerationRate="fast">
        {values.map((v) => {
          const isSelected = v === selected;
          return (
            <Pressable
              key={v}
              onPress={() => onSelect(v)}
              style={[styles.row, isSelected && { backgroundColor: theme.accentSoft }]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: isSelected ? '700' : '400',
                  color: isSelected ? theme.accent : theme.textPrimary,
                }}
              >
                {format(v)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  column: {
    width: 64,
    height: COLUMN_HEIGHT,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  separator: {
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodColumn: {
    height: COLUMN_HEIGHT,
    justifyContent: 'center',
    gap: 8,
  },
  periodButton: {
    width: 52,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});
