import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { todayISO } from '../lib/dates';
import { useTheme } from '../theme/ThemeContext';
import type { Task, TaskStatus } from '../types/task';

// Puerto conceptual de `CalendarView.tsx` de desktop, solo la mitad
// que aplica acá: tasks ubicadas por fecha de vencimiento en una
// grilla mensual. Desktop combina esa grilla con un sistema aparte de
// "eventos de calendario" (recordatorios, repetición, colores —
// `CalendarEvent`/`saveCalendarEvent`) que mobile no tiene ni tiene
// sentido portar en este checkpoint: el usuario pidió "más vistas en
// tareas", no un sistema de eventos/recordatorios nuevo — ver
// specs/vistas-tasks/requirements.md.
//
// No reusa `AppCalendarGrid` (el componente ya existente de
// selector-fecha/): esa grilla está pensada para un modal angosto de
// selección de fecha (celdas de 32px fijos, sin espacio para puntos
// de estado debajo del número). Acá la grilla ocupa el ancho completo
// de la pantalla del tab, con celdas más altas — un contexto visual
// distinto, no vale forzar el mismo componente.

const STATUS_DOT_COLOR: Record<TaskStatus, string> = {
  todo: '#9ca3af',
  'in-progress': '#fbbf24',
  done: '#4ade80',
};

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

interface TaskCalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export function TaskCalendarView({ tasks, onSelectTask }: TaskCalendarViewProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const today = todayISO();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (task.due) {
        (map[task.due] ??= []).push(task);
      }
    }
    return map;
  }, [tasks]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dayNames = getDayNames(i18n.language);
  const monthLabel = new Intl.DateTimeFormat(getLocale(i18n.language), { month: 'long' }).format(
    new Date(viewYear, viewMonth, 1)
  );

  // Siempre 42 celdas (6 filas) por el mismo motivo que
  // `AppCalendarGrid`: que el alto de la grilla no salte al navegar
  // entre meses con distinto número de semanas.
  const cells: (number | null)[] = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goPrevMonth} hitSlop={8} style={styles.navButton}>
          <ChevronLeft size={18} color={theme.textHint} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>
          {monthLabel} {viewYear}
        </Text>
        <Pressable onPress={goNextMonth} hitSlop={8} style={styles.navButton}>
          <ChevronRight size={18} color={theme.textHint} />
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
          const dayTasks = tasksByDate[iso] ?? [];
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          return (
            <Pressable
              key={iso}
              onPress={() => setSelectedDate(isSelected ? null : iso)}
              style={[
                styles.cell,
                styles.dayCell,
                { borderColor: theme.border },
                isSelected && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isToday ? '700' : '400',
                  color: isToday ? theme.accentInk : theme.textPrimary,
                }}
              >
                {day}
              </Text>
              {dayTasks.length > 0 ? (
                <View style={styles.dotsRow}>
                  {dayTasks.slice(0, 3).map((tk) => (
                    <View key={tk.id} style={[styles.dot, { backgroundColor: STATUS_DOT_COLOR[tk.status] }]} />
                  ))}
                  {dayTasks.length > 3 ? (
                    <Text style={[styles.moreText, { color: theme.textHint }]}>+{dayTasks.length - 3}</Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {selectedDate ? (
        <View style={[styles.dayPanel, { borderTopColor: theme.border }]}>
          <Text style={[styles.dayPanelTitle, { color: theme.textPrimary }]}>{selectedDate}</Text>
          {selectedTasks.length === 0 ? (
            <Text style={{ color: theme.textFaint, fontSize: 13 }}>{t('taskList.noTasksDate')}</Text>
          ) : (
            <FlatList
              data={selectedTasks}
              keyExtractor={(tk) => tk.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.dayTaskRow, { borderColor: theme.border }]}
                  onPress={() => onSelectTask(item)}
                >
                  <View style={[styles.dot, { backgroundColor: STATUS_DOT_COLOR[item.status] }]} />
                  <Text
                    style={[
                      styles.dayTaskTitle,
                      {
                        color: item.status === 'done' ? theme.textMuted : theme.textPrimary,
                        textDecorationLine: item.status === 'done' ? 'line-through' : 'none',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {item.project && item.project !== 'inbox' ? (
                    <Text style={[styles.dayTaskProject, { color: theme.textHint }]} numberOfLines={1}>
                      {item.project}
                    </Text>
                  ) : null}
                </Pressable>
              )}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDay: {
    flexBasis: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: '14.28%',
    height: 52,
    alignItems: 'center',
    paddingTop: 4,
  },
  dayCell: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  moreText: {
    fontSize: 8,
    marginLeft: 1,
  },
  dayPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  dayPanelTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayTaskTitle: {
    flex: 1,
    fontSize: 14,
  },
  dayTaskProject: {
    fontSize: 11,
  },
});
