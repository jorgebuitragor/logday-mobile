import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { DailyActivityList } from '../../src/components/DailyActivityList';
import { getDailyEntry, getPreviousDailyEntry, softDeleteDailyEntry, upsertDailyEntry } from '../../src/db/dailyEntries';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { buildDailyCopyText } from '../../src/lib/dailyCopyText';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DailyEditorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState('');
  // "Previo" == entrada no vacía más reciente antes de `date` (ver
  // src/db/dailyEntries.ts) — cuando existe, es totalmente editable, no
  // solo de referencia. Cuando no existe (no hay ningún daily anterior
  // registrado) no hay una fecha conocida a la que guardar, así que el
  // panel se muestra como mensaje informativo, no como lista editable
  // vacía; ver specs/pantalla-dailys/design.md.
  const [previousDate, setPreviousDate] = useState<string | null>(null);
  const [previousContent, setPreviousContent] = useState('');
  const [copied, setCopied] = useState(false);
  const confirmDelete = useConfirmDelete<true>(confirmDestructiveActions);

  useEffect(() => {
    Promise.all([getDailyEntry(date), getPreviousDailyEntry(date)]).then(([entry, prev]) => {
      setContent(entry?.content ?? '');
      setPreviousDate(prev?.date ?? null);
      setPreviousContent(prev?.content ?? '');
      setLoaded(true);
    });
  }, [date]);

  // Autosave por operación (añadir/editar/reordenar/eliminar actividad),
  // como el autosave con debounce de desktop pero sin debounce: cada
  // cambio de lista ya es una operación discreta (no tecla por tecla),
  // así que se persiste directo. Reemplaza el botón "Guardar" manual de
  // la primera versión de esta pantalla.
  function handleContentChange(next: string) {
    setContent(next);
    void upsertDailyEntry(date, next);
  }

  function handlePreviousChange(next: string) {
    if (!previousDate) return;
    setPreviousContent(next);
    void upsertDailyEntry(previousDate, next);
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
          {previousDate ? (
            <Text style={[styles.panelDate, { color: theme.textSecondary }]}>{previousDate}</Text>
          ) : null}
        </View>
        {previousDate ? (
          <DailyActivityList
            value={previousContent}
            onChange={handlePreviousChange}
            addPlaceholder={t('dailyForm.newActivityPlaceholder')}
            moveUpLabel={t('dailyForm.moveUp')}
            moveDownLabel={t('dailyForm.moveDown')}
            deleteLabel={t('dailyForm.deleteActivity')}
          />
        ) : (
          <Text style={{ color: theme.textFaint }}>{t('dailyForm.noPrevious')}</Text>
        )}
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
