import { CheckCircle2, Circle, Clock } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeContext';
import type { TaskStatus } from '../types/task';

// Extraído de `app/(tabs)/index.tsx` (`renderStatusIcon`/`STATUS_COLOR`
// locales) al necesitarse el mismo ícono/color también en
// `TaskKanbanBoard.tsx` — mismo criterio que el resto de este
// proyecto (extraer recién en el segundo consumidor real).
export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '', // se resuelve con theme.textMuted, ver abajo
  'in-progress': '#fbbf24',
  done: '#4ade80',
};

export function TaskStatusIcon({ status, size = 18 }: { status: TaskStatus; size?: number }) {
  const theme = useTheme();
  const color = status === 'todo' ? theme.textMuted : STATUS_COLOR[status];
  if (status === 'in-progress') return <Clock size={size} color={color} />;
  if (status === 'done') return <CheckCircle2 size={size} color={color} />;
  return <Circle size={size} color={color} />;
}
