import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { listTasks } from '../db/tasks';
import i18n from '../i18n';
import { DIGEST_ID_PREFIX, digestBody, planDueDigests } from './dueDigest';
import { onLocalTaskChange, onPullFinished } from './syncEvents';

// Notificaciones locales del resumen de vencimientos (specs/notificaciones/).
// Sin push ni servidor: todo se programa en el teléfono con
// expo-notifications. Apagado por omisión; el permiso se pide al encenderlo
// en Ajustes, nunca al abrir la app.

const ENABLED_KEY = 'dueDigestEnabled';
const TIME_KEY = 'dueDigestTime';
export const DEFAULT_DIGEST_TIME = '08:00';
const CHANNEL_ID = 'due-digest';
// Una ráfaga de cambios (un pull de muchas tareas) reprograma una sola vez.
const DEBOUNCE_MS = 1500;

export async function isDueDigestEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
}

export async function getDueDigestTime(): Promise<string> {
  return (await AsyncStorage.getItem(TIME_KEY)) || DEFAULT_DIGEST_TIME;
}

/** Enciende el resumen. Pide el permiso si hace falta; si se niega, queda
 *  apagado y devuelve `false`. */
export async function enableDueDigest(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) {
    await AsyncStorage.setItem(ENABLED_KEY, 'false');
    return false;
  }
  await AsyncStorage.setItem(ENABLED_KEY, 'true');
  await rescheduleDueDigests();
  return true;
}

export async function disableDueDigest(): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, 'false');
  await rescheduleDueDigests();
}

export async function setDueDigestTime(hhmm: string): Promise<void> {
  await AsyncStorage.setItem(TIME_KEY, hhmm);
  await rescheduleDueDigests();
}

// Una reprogramación a la vez; si se pide otra mientras corre, se repite
// una vez al terminar (mismo patrón que `reconcileSync`).
let running: Promise<void> | null = null;
let again = false;

export function rescheduleDueDigests(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await rescheduleOnce();
      } while (again);
    } catch (e) {
      console.warn('[notificaciones] no se pudo reprogramar el resumen', e);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function rescheduleOnce(): Promise<void> {
  if (Platform.OS === 'web') return;
  // Se borran solo los resúmenes propios, por su prefijo.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(DIGEST_ID_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
  if (!(await isDueDigestEnabled())) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: i18n.t('notifications.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const plan = planDueDigests(await listTasks(), new Date(), await getDueDigestTime());
  for (const digest of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: digest.id,
      content: {
        title: i18n.t('notifications.digestTitle'),
        body: digestBody(i18n.t.bind(i18n), digest),
        data: { url: '/' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: digest.fireAt, channelId: CHANNEL_ID },
    });
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSoon(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void rescheduleDueDigests();
  }, DEBOUNCE_MS);
}

/** Lo llama el layout raíz con la base lista: reprograma ahora, después de
 *  cada pull, al cambiar una tarea aquí y al volver la app al frente.
 *  `onOpen` recibe la ruta de una notificación tocada (el Inicio). */
export function startDueDigestScheduling(onOpen: (url: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  // Con la app abierta, el resumen también se muestra.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  void rescheduleDueDigests();
  const offPull = onPullFinished(scheduleSoon);
  const offTask = onLocalTaskChange(scheduleSoon);
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') scheduleSoon();
  });
  const response = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = r.notification.request.content.data?.url;
    if (typeof url === 'string') onOpen(url);
  });
  return () => {
    offPull();
    offTask();
    appState.remove();
    response.remove();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}
