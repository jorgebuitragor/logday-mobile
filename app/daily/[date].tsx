import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

  // Arrastre entre paneles (mantener presionado el grip + mover) —
  // segunda forma de mover una actividad, además del swipe existente
  // (`movePreviousToSelected`/`moveSelectedToPrevious`). A diferencia
  // del swipe, acá `DailyActivityList` no toca su propio estado: solo
  // reporta índice + coordenadas absolutas de pantalla, y es esta
  // pantalla (que ya tiene `content`/`previousContent` de ambos
  // paneles) quien decide en `handleDragEnd` si el soltar cayó sobre
  // el OTRO panel — usando `measureInWindow` sobre estas refs — y
  // hace el `splice`+`push` con las mismas utilidades de serialización
  // que ya usa el swipe.
  const previousPanelRef = useRef<View>(null);
  const selectedPanelRef = useRef<View>(null);
  const [dragState, setDragState] = useState<{
    panel: 'previous' | 'selected';
    index: number;
    item: string;
    x: number;
    y: number;
  } | null>(null);

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

  function handleDragStart(panel: 'previous' | 'selected', index: number, item: string, x: number, y: number) {
    setDragState({ panel, index, item, x, y });
  }

  function handleDragMove(x: number, y: number) {
    setDragState((prev) => (prev ? { ...prev, x, y } : prev));
  }

  // El soltar solo "cuenta" si cayó dentro de los límites del panel
  // CONTRARIO al de origen — medidos en vivo con `measureInWindow`
  // (no basta con guardar el layout una vez: el scroll pudo mover los
  // paneles desde que empezó el arrastre... salvo que acá el scroll ya
  // está bloqueado, ver `scrollEnabled={!dragState}` más abajo, pero
  // medir en vivo igual es más robusto que asumir un layout fijo).
  function handleDragEnd(x: number, y: number) {
    const active = dragState;
    setDragState(null);
    if (!active) return;
    const targetRef = active.panel === 'previous' ? selectedPanelRef : previousPanelRef;
    targetRef.current?.measureInWindow((tx, ty, tw, th) => {
      const hit = x >= tx && x <= tx + tw && y >= ty && y <= ty + th;
      if (!hit) return;
      if (active.panel === 'previous') {
        const sourceItems = parseActivityItems(previousContent);
        const item = sourceItems[active.index];
        if (item === undefined) return;
        handlePreviousChange(serializeActivityItems(sourceItems.filter((_, i) => i !== active.index)));
        handleContentChange(serializeActivityItems([...parseActivityItems(content), item]));
      } else {
        const sourceItems = parseActivityItems(content);
        const item = sourceItems[active.index];
        if (item === undefined) return;
        handleContentChange(serializeActivityItems(sourceItems.filter((_, i) => i !== active.index)));
        handlePreviousChange(serializeActivityItems([...parseActivityItems(previousContent), item]));
      }
    });
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
    <View style={{ flex: 1, backgroundColor: theme.bgBase }}>
    <ScrollView
      style={{ backgroundColor: theme.bgBase }}
      contentContainerStyle={styles.content}
      scrollEnabled={!dragState}
    >
      <View style={styles.dateRow}>
        <Text style={[styles.dateLabel, { color: theme.textPrimary }]}>{date}</Text>
        {isToday ? (
          <View style={[styles.todayBadge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.todayBadgeText, { color: theme.accentInk }]}>{t('dailyForm.todayBadge')}</Text>
          </View>
        ) : null}
      </View>

      <View ref={previousPanelRef} style={[styles.panel, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
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
          onItemDragStart={(index, item, x, y) => handleDragStart('previous', index, item, x, y)}
          onItemDragMove={handleDragMove}
          onItemDragEnd={handleDragEnd}
        />
      </View>

      <View
        ref={selectedPanelRef}
        style={[styles.panel, styles.accentPanel, { backgroundColor: theme.bgPanel, borderColor: theme.accent }]}
      >
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
          onItemDragStart={(index, item, x, y) => handleDragStart('selected', index, item, x, y)}
          onItemDragMove={handleDragMove}
          onItemDragEnd={handleDragEnd}
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
    {dragState ? (
      // Renderizado como hermano del ScrollView (no dentro) para que su
      // posición dependa solo de coordenadas absolutas de pantalla
      // (`absoluteX`/`absoluteY` del gesto), sin verse afectada por el
      // offset de scroll del contenido.
      <View
        pointerEvents="none"
        style={[
          styles.dragGhost,
          { left: dragState.x - 90, top: dragState.y - 20, backgroundColor: theme.accentStrong },
        ]}
      >
        <Text style={styles.dragGhostText} numberOfLines={1}>
          {dragState.item}
        </Text>
      </View>
    ) : null}
    </View>
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
  dragGhost: {
    position: 'absolute',
    width: 180,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dragGhostText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});
