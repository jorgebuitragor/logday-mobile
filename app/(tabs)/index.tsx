import { useFocusEffect, useRouter } from 'expo-router';
import { AlertCircle, CalendarDays, CalendarOff, CheckSquare, ChevronRight, FileText, NotebookPen, Plus, Timer } from 'lucide-react-native';
import type { ComponentType, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TaskStatusIcon } from '../../src/components/TaskStatusIcon';
import { listAbsenceDays } from '../../src/db/absences';
import { getDailyEntry } from '../../src/db/dailyEntries';
import { listNotes } from '../../src/db/notes';
import { listOvertimeEntries } from '../../src/db/overtime';
import { listTasks } from '../../src/db/tasks';
import { useReloadOnRemoteChange } from '../../src/hooks/useReloadOnRemoteChange';
import { absenceTypeLabel } from '../../src/lib/absenceLabels';
import { dateFromISO } from '../../src/lib/colombianHolidays';
import { todayISO } from '../../src/lib/dates';
import { buildHomeSummary, type HomeSummary } from '../../src/lib/homeSummary';
import { useTheme } from '../../src/theme/ThemeContext';
import type { ThemeTokens } from '../../src/theme/tokens';
import type { Task } from '../../src/types/task';

// Inicio (specs/inicio/): la primera pestaña. Un resumen adaptado del
// `DashboardView` de Desktop: lo que vence, el daily de hoy, la semana y
// las notas recientes, con botones de captura. Solo lee SQLite; no toca
// el sync. La lógica vive en `src/lib/homeSummary.ts`.

const OVERDUE_COLOR = '#dc2626';
const HOLIDAY_COLOR = '#f59e0b';

function locale(language: string): string {
  return language === 'es' ? 'es-CO' : 'en-US';
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  const reload = useCallback(() => {
    const today = todayISO();
    void Promise.all([listTasks(), listNotes(), getDailyEntry(today), listAbsenceDays(), listOvertimeEntries()]).then(
      ([tasks, notes, daily, absences, overtime]) =>
        setSummary(buildHomeSummary({ today, tasks, notes, todayDaily: daily?.content ?? null, absences, overtime }))
    );
  }, []);

  useFocusEffect(reload);
  useReloadOnRemoteChange(['task', 'note', 'daily_entry', 'absence_day', 'overtime_entry'], reload);

  if (!summary) return <View style={{ flex: 1, backgroundColor: theme.bgBase }} />;

  const today = todayISO();
  const dateLabel = new Intl.DateTimeFormat(locale(i18n.language), { weekday: 'long', day: 'numeric', month: 'long' }).format(dateFromISO(today));
  const openTask = (task: Task) => router.push(`/task/${task.id}`);
  const dueCount = summary.overdue.length + summary.dueToday.length;

  return (
    <ScrollView style={{ backgroundColor: theme.bgBase }} contentContainerStyle={styles.content}>
      <Text style={[styles.date, { color: theme.textSecondary }]}>{capitalize(dateLabel)}</Text>

      <View style={styles.captureRow}>
        <CaptureButton icon={CheckSquare} label={t('home.newTask')} onPress={() => router.push('/task/new')} theme={theme} />
        <CaptureButton icon={FileText} label={t('home.newNote')} onPress={() => router.push('/note/new')} theme={theme} />
        <CaptureButton icon={Timer} label={t('home.newOvertime')} onPress={() => router.push('/overtime/new')} theme={theme} />
      </View>

      {summary.isEmpty ? (
        <View style={[styles.card, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t('home.welcomeTitle')}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>{t('home.welcomeBody')}</Text>
        </View>
      ) : null}

      <Card title={t('home.dailyTitle')} icon={NotebookPen} theme={theme}>
        <Pressable onPress={() => router.push(`/daily/${today}`)} style={styles.dailyRow} accessibilityRole="button">
          {summary.todayDaily ? (
            <Text style={{ color: theme.textBody, flex: 1, fontSize: 14, lineHeight: 20 }} numberOfLines={4}>
              {summary.todayDaily.trim()}
            </Text>
          ) : (
            <Text style={{ color: theme.accent, flex: 1, fontSize: 14, fontWeight: '600' }}>{t('home.dailyStart')}</Text>
          )}
          <ChevronRight size={16} color={theme.textHint} />
        </Pressable>
      </Card>

      <Card
        title={t('home.tasksTitle')}
        icon={dueCount > 0 ? AlertCircle : CheckSquare}
        iconColor={summary.overdue.length > 0 ? OVERDUE_COLOR : undefined}
        theme={theme}
      >
        {summary.overdue.length + summary.dueToday.length + summary.dueThisWeek.length === 0 ? (
          <Text style={{ color: theme.textHint, fontSize: 14 }}>{t('home.nothingDue')}</Text>
        ) : (
          <>
            <TaskGroup label={t('home.overdue')} tasks={summary.overdue} color={OVERDUE_COLOR} onPress={openTask} theme={theme} lang={i18n.language} />
            <TaskGroup label={t('home.dueToday')} tasks={summary.dueToday} onPress={openTask} theme={theme} lang={i18n.language} />
            <TaskGroup label={t('home.dueThisWeek')} tasks={summary.dueThisWeek} onPress={openTask} theme={theme} lang={i18n.language} showDate />
          </>
        )}
      </Card>

      <Card title={t('home.weekTitle')} icon={CalendarDays} theme={theme}>
        <View style={styles.weekRow}>
          {summary.week.map((day) => {
            const d = dateFromISO(day.date);
            const weekday = new Intl.DateTimeFormat(locale(i18n.language), { weekday: 'narrow' }).format(d);
            const parts = [
              day.isHoliday ? t('home.holiday') : null,
              day.absence ? absenceTypeLabel(t, day.absence) : null,
              day.overtimeHours > 0 ? t('home.overtimeHours', { hours: day.overtimeHours }) : null,
            ].filter(Boolean);
            return (
              <View
                key={day.date}
                style={[styles.weekDay, day.isToday && { backgroundColor: theme.accentSoft, borderRadius: 8 }]}
                accessible
                accessibilityLabel={[new Intl.DateTimeFormat(locale(i18n.language), { weekday: 'long', day: 'numeric' }).format(d), ...parts].join(', ')}
              >
                <Text style={{ color: theme.textHint, fontSize: 11 }}>{weekday.toUpperCase()}</Text>
                <Text style={{ color: day.isHoliday ? HOLIDAY_COLOR : theme.textPrimary, fontSize: 16, fontWeight: day.isToday ? '700' : '500' }}>
                  {d.getDate()}
                </Text>
                <View style={styles.weekMarks}>
                  {day.absence ? <CalendarOff size={12} color={theme.textSecondary} /> : null}
                  {day.overtimeHours > 0 ? (
                    <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '600' }}>{`${day.overtimeHours}h`}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Card title={t('home.recentNotes')} icon={FileText} theme={theme}>
        {summary.recentNotes.length === 0 ? (
          <Text style={{ color: theme.textHint, fontSize: 14 }}>{t('home.noNotes')}</Text>
        ) : (
          summary.recentNotes.map((note) => (
            <Pressable key={note.id} onPress={() => router.push(`/note/${note.id}`)} style={styles.listRow} accessibilityRole="button">
              <FileText size={14} color={theme.textHint} />
              <Text style={{ color: theme.textBody, flex: 1, fontSize: 14 }} numberOfLines={1}>
                {note.title || t('trash.untitled')}
              </Text>
            </Pressable>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Card({
  title,
  icon: Icon,
  iconColor,
  theme,
  children,
}: {
  title: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  iconColor?: string;
  theme: ThemeTokens;
  children: ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Icon size={16} color={iconColor ?? theme.textSecondary} />
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function CaptureButton({
  icon: Icon,
  label,
  onPress,
  theme,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  theme: ThemeTokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.captureButton, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}
      accessibilityRole="button"
    >
      <View style={styles.captureIcon}>
        <Icon size={18} color={theme.accent} />
        <Plus size={10} color={theme.accent} style={styles.capturePlus} />
      </View>
      <Text style={{ color: theme.textPrimary, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function TaskGroup({
  label,
  tasks,
  color,
  onPress,
  theme,
  lang,
  showDate,
}: {
  label: string;
  tasks: Task[];
  color?: string;
  onPress: (task: Task) => void;
  theme: ThemeTokens;
  lang: string;
  showDate?: boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: color ?? theme.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
        {`${label} · ${tasks.length}`}
      </Text>
      {tasks.map((task) => (
        <Pressable key={task.id} onPress={() => onPress(task)} style={styles.listRow} accessibilityRole="button">
          <TaskStatusIcon status={task.status} size={14} />
          <Text style={{ color: theme.textBody, flex: 1, fontSize: 14 }} numberOfLines={1}>{task.title}</Text>
          {showDate && task.due ? (
            <Text style={{ color: theme.textHint, fontSize: 12 }}>
              {new Intl.DateTimeFormat(locale(lang), { weekday: 'short', day: 'numeric' }).format(dateFromISO(task.due))}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
  },
  captureRow: {
    flexDirection: 'row',
    gap: 8,
  },
  captureButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  captureIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturePlus: {
    position: 'absolute',
    right: -4,
    top: -4,
  },
  card: {
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  weekMarks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 14,
  },
});
