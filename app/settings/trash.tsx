import { useFocusEffect, useNavigation } from 'expo-router';
import { CalendarOff, CheckSquare, Clock, FileText, NotebookPen, RotateCcw, Trash2, X } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useCallback, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { EmptyState } from '../../src/components/EmptyState';
import {
  deleteForever, emptyTrash, isAutoPurgeEnabled, listTrash, restoreFromTrash, setAutoPurgeEnabled, TRASH_RETENTION_DAYS,
  type TrashEntity, type TrashItem,
} from '../../src/db/trash';
import { absenceTypeLabel } from '../../src/lib/absenceLabels';
import { useTheme } from '../../src/theme/ThemeContext';

// Papelera (specs/papelera/), dentro de Ajustes como en Web: lo borrado
// en este teléfono o en otro cliente, lo más reciente primero, con
// Restaurar, Eliminar para siempre y Vaciar. "Eliminar para siempre" borra
// la copia de este teléfono; en el servidor queda como borrado, igual que
// en Desktop y Web.

const ICONS: Record<TrashEntity, ComponentType<{ size?: number; color?: string }>> = {
  task: CheckSquare,
  note: FileText,
  daily_entry: NotebookPen,
  overtime_entry: Clock,
  absence_day: CalendarOff,
};

const ENTITY_LABEL: Record<TrashEntity, string> = {
  task: 'trash.entityTask',
  note: 'trash.entityNote',
  daily_entry: 'trash.entityDaily',
  overtime_entry: 'trash.entityOvertime',
  absence_day: 'trash.entityAbsence',
};

function locale(language: string): string {
  return language === 'es' ? 'es-CO' : 'en-US';
}

function formatDay(iso: string, language: string): string {
  return new Intl.DateTimeFormat(locale(language), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));
}

type Pending = { kind: 'forever'; item: TrashItem } | { kind: 'empty' } | null;

export default function TrashScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [autoPurge, setAutoPurge] = useState(true);
  const [pending, setPending] = useState<Pending>(null);

  const reload = useCallback(() => {
    void listTrash().then(setItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
      void isAutoPurgeEnabled().then(setAutoPurge);
    }, [reload])
  );

  const hasItems = !!items && items.length > 0;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: hasItems
        ? () => (
            <Pressable onPress={() => setPending({ kind: 'empty' })} hitSlop={10} accessibilityRole="button">
              <Text style={{ color: '#dc2626', fontWeight: '600' }}>{t('trash.empty')}</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, hasItems, t]);

  function title(item: TrashItem): string {
    if (item.entity === 'daily_entry') return formatDay(item.key, i18n.language);
    if (item.entity === 'absence_day') {
      const type = item.absenceType ? absenceTypeLabel(t, item.absenceType) : '';
      return `${type} · ${item.date ? formatDay(item.date, i18n.language) : ''}`;
    }
    if (item.entity === 'overtime_entry') {
      const day = item.date ? formatDay(item.date, i18n.language) : '';
      return item.title ? `${day} · ${item.title}` : day;
    }
    return item.title || t('trash.untitled');
  }

  function subtitle(item: TrashItem): string {
    const when = new Intl.DateTimeFormat(locale(i18n.language), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      .format(new Date(item.deletedAt));
    const preview = item.entity === 'daily_entry' && item.title ? ` · ${item.title}` : '';
    return `${t(ENTITY_LABEL[item.entity])} · ${t('trash.deletedOn', { when })}${preview}`;
  }

  async function restore(item: TrashItem) {
    const result = await restoreFromTrash(item.entity, item.key);
    if (result.dateTaken) {
      Alert.alert(t('trash.dateTakenTitle'), t('trash.dateTakenMessage'));
      return;
    }
    reload();
  }

  async function confirm() {
    const current = pending;
    setPending(null);
    if (!current) return;
    if (current.kind === 'empty') await emptyTrash();
    else await deleteForever(current.item.entity, current.item.key);
    reload();
  }

  function toggleAutoPurge(value: boolean) {
    setAutoPurge(value);
    void setAutoPurgeEnabled(value);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgBase }}>
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => `${item.entity}:${item.key}`}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
        ListHeaderComponent={
          <View style={[styles.purgeRow, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 15 }}>{t('trash.autoPurge', { days: TRASH_RETENTION_DAYS })}</Text>
              <Text style={{ color: theme.textHint, fontSize: 12, marginTop: 2 }}>{t('trash.autoPurgeDesc')}</Text>
            </View>
            <Switch value={autoPurge} onValueChange={toggleAutoPurge} trackColor={{ true: theme.accentStrong }} />
          </View>
        }
        ListEmptyComponent={items ? <EmptyState icon={Trash2} message={t('trash.emptyState')} hint={t('trash.emptyHint')} /> : null}
        renderItem={({ item }) => {
          const Icon = ICONS[item.entity];
          return (
            <View style={[styles.row, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
              <Icon size={18} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 15 }} numberOfLines={1}>{title(item)}</Text>
                <Text style={{ color: theme.textHint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{subtitle(item)}</Text>
              </View>
              <Pressable
                onPress={() => void restore(item)}
                hitSlop={8}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={t('trash.restore')}
              >
                <RotateCcw size={18} color={theme.accent} />
              </Pressable>
              <Pressable
                onPress={() => setPending({ kind: 'forever', item })}
                hitSlop={8}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={t('trash.deleteForever')}
              >
                <X size={18} color="#dc2626" />
              </Pressable>
            </View>
          );
        }}
      />
      <ConfirmDeleteModal
        visible={pending !== null}
        title={pending?.kind === 'empty' ? t('trash.confirmEmptyTitle') : t('trash.confirmForeverTitle')}
        message={t('trash.confirmForeverMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={pending?.kind === 'empty' ? t('trash.empty') : t('trash.deleteForever')}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  purgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    padding: 6,
  },
});
