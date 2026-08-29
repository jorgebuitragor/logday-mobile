import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ConfirmDeleteModal } from '../../src/components/ConfirmDeleteModal';
import { getDailyEntry, getPreviousDailyEntry, softDeleteDailyEntry, upsertDailyEntry } from '../../src/db/dailyEntries';
import { useConfirmDelete } from '../../src/hooks/useConfirmDelete';
import { buildDailyCopyText } from '../../src/lib/dailyCopyText';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme } from '../../src/theme/ThemeContext';
import type { DailyEntry } from '../../src/types/dailyEntry';

export default function DailyEditorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { confirmDestructiveActions } = usePreferences();
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState('');
  const [previous, setPrevious] = useState<DailyEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const confirmDelete = useConfirmDelete<true>(confirmDestructiveActions);

  useEffect(() => {
    Promise.all([getDailyEntry(date), getPreviousDailyEntry(date)]).then(([entry, prev]) => {
      setContent(entry?.content ?? '');
      setPrevious(prev);
      setLoaded(true);
    });
  }, [date]);

  async function handleSave() {
    await upsertDailyEntry(date, content);
    router.back();
  }

  async function performDelete() {
    await softDeleteDailyEntry(date);
    router.back();
  }

  async function handleCopy() {
    const text = buildDailyCopyText(previous?.date ?? null, previous?.content ?? '', date, content);
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

  return (
    <ScrollView style={{ backgroundColor: theme.bgBase }} contentContainerStyle={styles.content}>
      <Text style={[styles.dateLabel, { color: theme.textPrimary }]}>{date}</Text>

      <View style={[styles.panel, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
        <Text style={[styles.panelTitle, { color: theme.textHint }]}>{t('dailyForm.previousPanel')}</Text>
        {previous ? (
          <>
            <Text style={[styles.panelDate, { color: theme.textSecondary }]}>{previous.date}</Text>
            <Text style={{ color: theme.textBody }}>{previous.content}</Text>
          </>
        ) : (
          <Text style={{ color: theme.textFaint }}>{t('dailyForm.noPrevious')}</Text>
        )}
      </View>

      <View style={[styles.panel, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
        <Text style={[styles.panelTitle, { color: theme.textHint }]}>{t('dailyForm.selectedPanel')}</Text>
        <TextInput
          style={[styles.textArea, { color: theme.textPrimary, backgroundColor: theme.bgInput, borderColor: theme.border }]}
          value={content}
          onChangeText={setContent}
          placeholder={t('dailyForm.placeholder')}
          placeholderTextColor={theme.textFaint}
          multiline
        />
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={[styles.button, { backgroundColor: theme.bgHover, borderColor: theme.border }]} onPress={handleCopy}>
          <Text style={{ color: theme.textPrimary }}>{copied ? t('dailyForm.copiedLong') : t('dailyForm.copyFormat')}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.saveButton, { backgroundColor: theme.accentStrong }]} onPress={handleSave}>
          <Text style={styles.saveText}>{t('dailyForm.save')}</Text>
        </Pressable>
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
  dateLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
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
  textArea: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButton: {
    borderWidth: 0,
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
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
