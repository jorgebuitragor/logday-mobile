import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../src/i18n';
import { initDb } from '../src/db';
import { PolicyGateModal } from '../src/components/PolicyGateModal';
import { PreferencesProvider } from '../src/settings/PreferencesContext';
import { SyncProvider } from '../src/settings/SyncContext';
import { ThemeProvider, useTheme, useThemeScheme } from '../src/theme/ThemeContext';

// `SafeAreaProvider` no estaba montado en ningún lado — nada en la
// app leía los insets del sistema (gestos/barra de navegación de
// Android, notch de iOS). Pasó desapercibido hasta que
// `MarkdownToolbar` quedó pegada al borde inferior real de la
// pantalla, invadiendo la zona de gestos de Android (ver
// specs/pantalla-notes/design.md, "Safe area").
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PreferencesProvider>
            <SyncProvider>
              <RootLayoutInner />
            </SyncProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutInner() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const scheme = useThemeScheme();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((error: Error) => setDbError(error.message));
  }, []);

  // Sin esta pieza, Android no tenía ningún <StatusBar> declarado — el
  // estilo de íconos quedaba en lo que sea que el SO decidiera por
  // defecto, que en modo claro terminaba siendo íconos claros sobre
  // fondo claro (invisibles, "la barra se ve totalmente blanca"). Con
  // edge-to-edge (Android reciente/Expo actual) la barra ya no tiene
  // `backgroundColor` propio — es un overlay transparente sobre el
  // contenido — así que lo único que hace falta es fijar `style`
  // (color de íconos/texto) según el tema.
  const statusBar = <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />;

  if (dbError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        {statusBar}
        <Text style={{ color: theme.textPrimary }}>{t('db.error', { message: dbError })}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        {statusBar}
        <Text style={{ color: theme.textPrimary }}>{t('db.initializing')}</Text>
      </View>
    );
  }

  return (
    <>
      {statusBar}
      <Stack
        key={i18n.language}
        screenOptions={{
          // `Stack` (expo-router) usa el header nativo (native-stack),
          // a diferencia de `Tabs` (JS header, ver
          // `app/(tabs)/_layout.tsx`) — su `headerStyle` solo acepta
          // `backgroundColor`, no bordes/sombra manuales. La sombra
          // nativa por defecto se quita igual con
          // `headerShadowVisible`, que sí está soportado acá.
          headerStyle: { backgroundColor: theme.bgPanel },
          headerTintColor: theme.textPrimary,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: theme.bgBase },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="task/new" options={{ title: t('taskForm.newTitle'), presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ title: t('taskForm.editTitle'), presentation: 'modal' }} />
        <Stack.Screen name="note/new" options={{ title: t('noteForm.editTitle'), presentation: 'modal' }} />
        <Stack.Screen name="note/[id]" options={{ title: t('noteForm.editTitle'), presentation: 'modal' }} />
        <Stack.Screen name="daily/[date]" options={{ title: t('tabs.dailys'), presentation: 'modal' }} />
        <Stack.Screen name="overtime/new" options={{ title: t('overtimeForm.newTitle'), presentation: 'modal' }} />
        <Stack.Screen name="overtime/[id]" options={{ title: t('overtimeForm.editTitle'), presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ title: t('search.placeholder'), presentation: 'modal' }} />
      </Stack>
      <PolicyGateModal />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
