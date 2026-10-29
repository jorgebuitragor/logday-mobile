import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

interface TaskProgressBarProps {
  progress: number;
  /** Ancho de la pista en px. La fila del listado tiene más sitio que
   *  la tarjeta del Kanban. */
  width?: number;
  fontSize?: number;
}

/** Barra fina + porcentaje, discreta, para la fila del listado y la
 *  tarjeta del Kanban. Solo se monta si la tarea tiene progreso (también
 *  con `0`: `0` es progreso en cero, `null` es no tenerlo). Colores del
 *  tema activo (pista `borderCard`, relleno `accent`), así vale en claro
 *  y oscuro sin valores propios. */
export function TaskProgressBar({ progress, width = 44, fontSize = 11 }: TaskProgressBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('taskList.progressLabel', { value: progress })}
      accessibilityValue={{ min: 0, max: 100, now: progress }}
    >
      <View style={[styles.track, { width, backgroundColor: theme.borderCard }]}>
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: theme.accent }]} />
      </View>
      <Text style={[styles.text, { color: theme.textHint, fontSize }]}>{progress}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  text: {
    fontVariant: ['tabular-nums'],
  },
});
