import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

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
  // (`movePreviousToSelected`/`moveSelectedToPrevious`). `dragX`/`dragY`
  // son *shared values* de Reanimated: `DailyActivityList` los escribe
  // en cada frame directo desde el hilo de UI (sin re-render de React,
  // ver DailyActivityList.tsx) y el fantasma flotante los lee con
  // `useAnimatedStyle` — el único estado de React acá es qué actividad
  // se está arrastrando (`dragItem`, cambia solo al empezar/terminar,
  // no por frame). Es esta pantalla (que ya tiene `content`/
  // `previousContent` de ambos paneles) quien decide en `handleDragEnd`
  // si el soltar cayó sobre el OTRO panel — usando `measureInWindow`
  // sobre estas refs — y hace el `splice`+`push` con las mismas
  // utilidades de serialización que ya usa el swipe.
  const previousPanelRef = useRef<View>(null);
  const selectedPanelRef = useRef<View>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const [dragItem, setDragItem] = useState<string | null>(null);

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

  function handleDragStart(item: string) {
    setDragItem(item);
  }

  // El soltar solo "cuenta" si cayó dentro de los límites del panel
  // CONTRARIO al de origen — medidos en vivo con `measureInWindow`
  // (no basta con guardar el layout una vez: el scroll pudo mover los
  // paneles desde que empezó el arrastre... salvo que acá el scroll ya
  // está bloqueado, ver `scrollEnabled={!dragItem}` más abajo, pero
  // medir en vivo igual es más robusto que asumir un layout fijo).
  function handleDragEnd(panel: 'previous' | 'selected', index: number, x: number, y: number) {
    setDragItem(null);
    const targetRef = panel === 'previous' ? selectedPanelRef : previousPanelRef;
    targetRef.current?.measureInWindow((tx, ty, tw, th) => {
      const hit = x >= tx && x <= tx + tw && y >= ty && y <= ty + th;
      if (!hit) return;
      if (panel === 'previous') {
        const sourceItems = parseActivityItems(previousContent);
        const item = sourceItems[index];
        if (item === undefined) return;
        handlePreviousChange(serializeActivityItems(sourceItems.filter((_, i) => i !== index)));
        handleContentChange(serializeActivityItems([...parseActivityItems(content), item]));
      } else {
        const sourceItems = parseActivityItems(content);
        const item = sourceItems[index];
        if (item === undefined) return;
        handleContentChange(serializeActivityItems(sourceItems.filter((_, i) => i !== index)));
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

  // `replace`, no `push` — cambiar de día es "otro estado de la misma
  // edición", no una pantalla nueva; con `push` el botón atrás del
  // sistema tendría que deshacer un paso por cada flecha tocada antes
  // de volver al listado. Sin límite en ninguna dirección: el resto de
  // la app tampoco restringe fechas futuras (ver `AppCalendarGrid`,
  // usado sin `max` en dailys.tsx) ni tiene un piso — el día se crea
  // recién al guardar la primera actividad, igual que `previousDate`.
  function goToDay(nextDate: string) {
    router.replace(`/daily/${nextDate}`);
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
      scrollEnabled={!dragItem}
    >
      <View style={styles.dateRow}>
        <Pressable
          onPress={() => goToDay(previousDate)}
          hitSlop={8}
          style={[styles.dateArrow, { borderColor: theme.border }]}
          accessibilityLabel={t('dailyForm.previousDay')}
        >
          <ChevronLeft size={18} color={theme.textSecondary} />
        </Pressable>
        <Text style={[styles.dateLabel, { color: theme.textPrimary }]}>{date}</Text>
        {isToday ? (
          <View style={[styles.todayBadge, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.todayBadgeText, { color: theme.accentInk }]}>{t('dailyForm.todayBadge')}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => goToDay(addDaysISO(date, 1))}
          hitSlop={8}
          style={[styles.dateArrow, { borderColor: theme.border }]}
          accessibilityLabel={t('dailyForm.nextDay')}
        >
          <ChevronRight size={18} color={theme.textSecondary} />
        </Pressable>
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
          dragX={dragX}
          dragY={dragY}
          onItemDragStart={(_index, item) => handleDragStart(item)}
          onItemDragEnd={(index, _item, x, y) => handleDragEnd('previous', index, x, y)}
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
          dragX={dragX}
          dragY={dragY}
          onItemDragStart={(_index, item) => handleDragStart(item)}
          onItemDragEnd={(index, _item, x, y) => handleDragEnd('selected', index, x, y)}
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
    {dragItem ? (
      // El fantasma se renderiza dentro de un `Modal` (no como View
      // absoluta hija de la pantalla) porque esta pantalla se presenta
      // con `presentation: 'modal'` y tiene su propio header — eso
      // desplaza el origen de coordenadas del contenido respecto al de
      // la ventana completa, así que una View absoluta posicionada con
      // `absoluteX`/`absoluteY` (coordenadas de ventana) quedaba
      // notoriamente lejos del dedo. Un `Modal` nativo (con
      // `statusBarTranslucent`) es su propia superficie a pantalla
      // completa con origen (0,0) en la esquina de la ventana, así que
      // esas mismas coordenadas caen exactas.
      <Modal transparent visible animationType="none" statusBarTranslucent>
        <DragGhost text={dragItem} dragX={dragX} dragY={dragY} accent={theme.accentStrong} />
      </Modal>
    ) : null}
    </View>
  );
}

// Aparte para poder usar `useAnimatedStyle` (un hook — no puede
// llamarse condicionalmente dentro del render de la pantalla). Lee
// `dragX`/`dragY` en el hilo de UI en cada frame sin pasar por React,
// así que seguir el dedo no compite con el resto de la pantalla.
function DragGhost({
  text,
  dragX,
  dragY,
  accent,
}: {
  text: string;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  accent: string;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value - 90 }, { translateY: dragY.value - 20 }],
  }));

  return (
    <View pointerEvents="none" style={styles.dragGhostLayer}>
      <Animated.View style={[styles.dragGhost, { backgroundColor: accent }, style]}>
        <Text style={styles.dragGhostText} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
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
  dateArrow: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 6,
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
  dragGhostLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dragGhost: {
    position: 'absolute',
    left: 0,
    top: 0,
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
