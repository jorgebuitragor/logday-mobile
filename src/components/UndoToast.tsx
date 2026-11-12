import { Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { restoreFromTrash } from '../db/trash';
import { onTrashed, type TrashedItems } from '../lib/trashEvents';
import { useTheme } from '../theme/ThemeContext';

// "Eliminado · Deshacer" (specs/papelera/). Se monta una vez en el layout
// raíz y escucha `announceTrashed`. Un borrado nuevo reemplaza al aviso
// anterior; lo anterior sigue en la papelera.

const VISIBLE_MS = 5000;
// Sobre la barra de pestañas (≈56 px más el margen inferior del sistema).
const TAB_BAR_CLEARANCE = 64;

export function UndoToast() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<TrashedItems | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = onTrashed((trashed) => {
      if (timer.current) clearTimeout(timer.current);
      setCurrent(trashed);
      timer.current = setTimeout(() => setCurrent(null), VISIBLE_MS);
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!current) return null;

  async function undo() {
    const trashed = current;
    if (timer.current) clearTimeout(timer.current);
    setCurrent(null);
    if (!trashed) return;
    for (const { entity, key } of trashed.items) await restoreFromTrash(entity, key);
  }

  const message = current.items.length > 1
    ? t('trash.deletedMany', { count: current.items.length })
    : current.label
      ? t('trash.deletedNamed', { name: current.label })
      : t('trash.deleted');

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
      <View
        style={[styles.toast, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
        accessibilityLiveRegion="polite"
      >
        <Trash2 size={16} color={theme.textSecondary} />
        <Text style={[styles.message, { color: theme.textPrimary }]} numberOfLines={1}>
          {message}
        </Text>
        <Pressable onPress={undo} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.action, { color: theme.accent }]}>{t('trash.undo')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 480,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 14,
  },
  action: {
    fontSize: 14,
    fontWeight: '700',
  },
});
