import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

// Puerto de task-manager/src/components/shared/AppDatePicker.tsx — la
// misma grilla de calendario (mes/año navegable, celdas por día,
// `Intl.DateTimeFormat` para nombres de día/mes localizados), con los
// tokens de tema en vez de clases Tailwind. La única diferencia
// estructural: desktop abre un dropdown posicionado bajo el botón;
// mobile abre un Modal centrado (mismo patrón visual que
// ConfirmDeleteModal) porque no hay una noción de "espacio libre
// debajo del trigger" confiable en una pantalla táctil.

function getLocale(language: string): string {
  return language === 'es' ? 'es-CO' : 'en-US';
}

function getDayNames(language: string): string[] {
  const fmt = new Intl.DateTimeFormat(getLocale(language), { weekday: 'short' });
  const baseSunday = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(baseSunday);
    d.setDate(baseSunday.getDate() + idx);
    return fmt.format(d).replace('.', '');
  });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(iso: string, language: string, placeholder: string): string {
  if (!iso) return placeholder;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(getLocale(language), { year: 'numeric', month: 'long', day: 'numeric' }).format(
    date
  );
}

interface CalendarGridProps {
  value: string;
  max?: string;
  onChange: (iso: string) => void;
}

/** Grilla de calendario reutilizable (sin trigger propio). */
export function AppCalendarGrid({ value, max, onChange }: CalendarGridProps) {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const [viewYear, setViewYear] = useState(() => (value ? parseInt(value.split('-')[0]) : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() =>
    value ? parseInt(value.split('-')[1]) - 1 : new Date().getMonth()
  );

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = todayISO();
  const dayNames = getDayNames(i18n.language);
  const monthLabel = new Intl.DateTimeFormat(getLocale(i18n.language), { month: 'long' }).format(
    new Date(viewYear, viewMonth, 1)
  );

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={goPrevMonth} hitSlop={8} style={styles.navButton}>
          <ChevronLeft size={16} color={theme.textHint} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>
          {monthLabel} {viewYear}
        </Text>
        <Pressable onPress={goNextMonth} hitSlop={8} style={styles.navButton}>
          <ChevronRight size={16} color={theme.textHint} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {dayNames.map((d, i) => (
          <Text key={`${d}-${i}`} style={[styles.weekDay, { color: theme.textHint }]}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={styles.cell} />;
          const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = iso === value;
          const isToday = iso === today;
          const isDisabled = max ? iso > max : false;
          return (
            <Pressable
              key={iso}
              disabled={isDisabled}
              onPress={() => onChange(iso)}
              style={[
                styles.cell,
                styles.dayCell,
                isSelected && { backgroundColor: theme.accentStrong },
                !isSelected && isToday && { borderWidth: 1, borderColor: theme.accent },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? '700' : '400',
                  opacity: isDisabled ? 0.25 : 1,
                  color: isSelected ? '#fff' : isToday ? theme.accent : theme.textPrimary,
                }}
              >
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface AppDatePickerProps {
  /** ISO `YYYY-MM-DD`, o `''` si no hay fecha seleccionada. */
  value: string;
  onChange: (iso: string) => void;
  max?: string;
  /** Si se puede dejar sin fecha (agrega un botón "Quitar fecha" en el modal). */
  allowClear?: boolean;
  placeholder?: string;
}

/** Botón con la fecha formateada + modal con `AppCalendarGrid` al tocar. */
export function AppDatePicker({ value, onChange, max, allowClear, placeholder }: AppDatePickerProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.bgInput }]}
      >
        <Calendar size={16} color={theme.textHint} />
        <Text style={{ color: value ? theme.textPrimary : theme.textFaint, fontSize: 15 }}>
          {formatDateDisplay(value, i18n.language, placeholder ?? t('common.selectDate'))}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.panel, { backgroundColor: theme.bgPanel, borderColor: theme.borderCard }]}
            onPress={(e) => e.stopPropagation()}
          >
            <AppCalendarGrid
              value={value}
              max={max}
              onChange={(iso) => {
                onChange(iso);
                setOpen(false);
              }}
            />
            {allowClear && value ? (
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('common.clearDate')}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const CELL_SIZE = 32;

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDay: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    borderRadius: 8,
  },
  clearButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
});
