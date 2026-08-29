import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { DailyActivityList, parseActivityItems, serializeActivityItems } from '../../src/components/DailyActivityList';
import { getDailyEntry, softDeleteDailyEntry, upsertDailyEntry } from '../../src/db/dailyEntries';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { buildDailyCopyText } from '../../src/lib/dailyCopyText';
import { addDaysISO, todayISO } from '../../src/lib/dates';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function DailyEditorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState('');
  const [previousContent, setPreviousContent] = useState('');
  const [copied, setCopied] = useState(false);
  const confirmDelete = useConfirmDelete<true>(confirmDestructiveActions);

  // "Previo" es siempre `date - 1 día` (no "la entrada anterior no
  // vacía más reciente", como en la primera versión) — el usuario debe
  // poder registrar el día previo al que está viendo aunque nunca haya
  // tenido contenido, no solo consultar/editar el último registrado
  // hace tiempo. Igual que `date`, se crea recién al guardar la
  // primera actividad (upsert), no hace falta que ya exista.
  const previousDate = addDaysISO(date, -1);

  useEffect(() => {
    Promise.all([getDailyEntry(date), getDailyEntry(previousDate)]).then(([entry, prev]) => {
      setContent(entry?.content ?? '');
      setPreviousContent(prev?.content ?? '');
      setLoaded(true);
    });
  }, [date, previousDate]);

  // Autosave por operación (añadir/editar/reordenar/eliminar/mover
  // actividad), como el autosave con debounce de desktop pero sin
  // debounce: cada cambio de lista ya es una operación discreta (no
  // tecla por tecla), así que se persiste directo.
  function handleContentChange(next: string) {
    setContent(next);
    void upsertDailyEntry(date, next);
  }

  function handlePreviousChange(next: string) {
    setPreviousContent(next);
    void upsertDailyEntry(previousDate, next);
  }

  // Mover una actividad entre paneles (swipe, ver DailyActivityList) —
  // quita del panel de origen (ya lo hizo el propio componente antes
  // de llamar este callback) y la agrega al final del otro.
  function movePreviousToSelected(item: string) {
    const next = serializeActivityItems([...parseActivityItems(content), item]);
    handleContentChange(next);
  }

  function moveSelectedToPrevious(item: string) {
    const next = serializeActivityItems([...parseActivityItems(previousContent), item]);
    handlePreviousChange(next);
  }

  async function performDelete() {
    await softDeleteDailyEntry(date);
    router.back();
  }

  async function handleCopy() {
    const text = buildDailyCopyText(previousDate, previousContent, date, content);
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textSecondary }}>{t('dailyForm.loadingDaily')}</Text>
      </View>
    );
  }

  const isToday = date === todayISO();
  const previewText = buildDailyCopyText(previousDate, previousContent, date, content);

  return (
    <ScrollView style={{ backgroundColor: theme.bgBase }} contentContainerStyle={styles.content}>
      <View style={styles.dateRow}>
        <Text style={[styles.dateLabel, { color: theme.textPrimary }]}>{date}</Text>
        {isToday ? (
          <View style={[styles.todayBadge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.todayBadgeText, { color: theme.accentInk }]}>{t('dailyForm.todayBadge')}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.panel, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
        <View style={styles.panelHeader}>
          <Text style={[styles.panelTitle, { color: theme.textHint }]}>{t('dailyForm.previousPanel')}</Text>
          <Text style={[styles.panelDate, { color: theme.textSecondary }]}>{previousDate}</Text>
        </View>
        <DailyActivityList
          value={previousContent}
          onChange={handlePreviousChange}
          addPlaceholder={t('dailyForm.newActivityPlaceholder')}
          moveUpLabel={t('dailyForm.moveUp')}
          moveDownLabel={t('dailyForm.moveDown')}
          deleteLabel={t('dailyForm.deleteActivity')}
          moveToOtherLabel={t('dailyForm.moveToSelected')}
          onMoveItemToOther={movePreviousToSelected}
        />
      </View>

      <View style={[styles.panel, styles.accentPanel, { backgroundColor: theme.bgPanel, borderColor: theme.accent }]}>
        <View style={styles.panelHeader}>
          <Text style={[styles.panelTitle, { color: theme.accentInk }]}>{t('dailyForm.selectedPanel')}</Text>
          <Text style={[styles.panelDate, { color: theme.textSecondary }]}>{date}</Text>
        </View>
        <DailyActivityList
          value={content}
          onChange={handleContentChange}
          accent
          addPlaceholder={t('dailyForm.newActivityPlaceholder')}
          moveUpLabel={t('dailyForm.moveUp')}
          moveDownLabel={t('dailyForm.moveDown')}
          deleteLabel={t('dailyForm.deleteActivity')}
          moveToOtherLabel={t('dailyForm.moveToPrevious')}
          onMoveItemToOther={moveSelectedToPrevious}
        />
      </View>

      <View style={[styles.panel, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
        <View style={styles.panelHeader}>
          <Text style={[styles.panelTitle, { color: theme.textHint }]}>{t('dailyForm.previewTitle')}</Text>
          <Pressable onPress={handleCopy}>
            <Text style={[styles.copyLink, { color: copied ? theme.accentInk : theme.accent }]}>
              {copied ? t('dailyForm.copiedLong') : t('dailyForm.copyFormat')}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.previewText, { color: theme.textTertiary }]}>
          {previewText || t('dailyForm.previewEmpty')}
        </Text>
      </View>

      <Pressable
        style={[styles.deleteButton, { borderColor: '#dc2626' }]}
        onPress={() => confirmDelete.request(true, performDelete)}
      >
        <Text style={styles.deleteText}>{t('dailyForm.delete')}</Text>
      </Pressable>

      <ConfirmDeleteModal
        visible={confirmDelete.isOpen}
        title={t('dailyForm.confirmDeleteTitle')}
        message={t('dailyForm.confirmDeleteMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={confirmDelete.cancel}
        onConfirm={() => {
          performDelete();
          confirmDelete.cancel();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  accentPanel: {
    borderWidth: 2,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panelDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  copyLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 12,
    lineHeight: 18,
  },
  deleteButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
