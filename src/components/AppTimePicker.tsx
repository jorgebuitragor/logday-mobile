import { Clock } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

// Desktop usa el <input type="time"> nativo del navegador para
// horaInicio/horaFinal (OvertimeEditor.tsx) — no hay un componente
// propio que portar acá, a diferencia de AppDatePicker. Se construyó
// desde cero pero con el mismo lenguaje visual: botón-trigger + modal
// centrado con `Pressable`s themed, mismo patrón que AppDatePicker/
// ConfirmDeleteModal, para que la app se sienta consistente aunque
// esta pieza específica no venga de un puerto.

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const COLUMN_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

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

interface AppTimePickerProps {
  /** `HH:MM`, o `''` si no hay hora seleccionada. */
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
}

export function AppTimePicker({ value, onChange, placeholder }: AppTimePickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const initial = parseTime(value || '00:00');
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!open) return;
    const parsed = parseTime(value || '00:00');
    setHour(parsed.hour);
    setMinute(parsed.minute);
    // Centra el scroll en el valor actual al abrir, en vez de arrancar
    // siempre en 00 — evita tener que desplazarse manualmente hasta,
    // por ejemplo, las 18:00.
    requestAnimationFrame(() => {
      hourScrollRef.current?.scrollTo({ y: parsed.hour * ROW_HEIGHT, animated: false });
      minuteScrollRef.current?.scrollTo({ y: (parsed.minute / MINUTE_STEP) * ROW_HEIGHT, animated: false });
    });
  }, [open, value]);

  function confirm() {
    onChange(`${pad(hour)}:${pad(minute)}`);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.bgInput }]}
      >
        <Clock size={16} color={theme.textHint} />
        <Text style={{ color: value ? theme.textPrimary : theme.textFaint, fontSize: 15 }}>
          {value || placeholder || t('common.selectTime')}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.panel, { backgroundColor: theme.bgPanel, borderColor: theme.borderCard }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.columns}>
              <TimeColumn
                scrollRef={hourScrollRef}
                values={HOURS}
                selected={hour}
                format={pad}
                onSelect={setHour}
              />
              <Text style={[styles.separator, { color: theme.textPrimary }]}>:</Text>
              <TimeColumn
                scrollRef={minuteScrollRef}
                values={MINUTES}
                selected={minute}
                format={pad}
                onSelect={setMinute}
              />
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
    maxWidth: 280,
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
    width: 72,
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
