import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../src/i18n';
import { initDb } from '../src/db';
import { PreferencesProvider } from '../src/settings/PreferencesContext';
import { ThemeProvider, useTheme, useThemeScheme } from '../src/theme/ThemeContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <PreferencesProvider>
          <RootLayoutInner />
        </PreferencesProvider>
      </ThemeProvider>
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
          headerStyle: { backgroundColor: theme.bgPanel },
          headerTintColor: theme.textPrimary,
          contentStyle: { backgroundColor: theme.bgBase },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="task/new" options={{ title: t('taskForm.newTitle'), presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ title: t('taskForm.editTitle'), presentation: 'modal' }} />
        <Stack.Screen name="note/new" options={{ title: t('noteForm.newTitle'), presentation: 'modal' }} />
        <Stack.Screen name="note/[id]" options={{ title: t('noteForm.editTitle'), presentation: 'modal' }} />
        <Stack.Screen name="daily/[date]" options={{ title: t('tabs.dailys'), presentation: 'modal' }} />
        <Stack.Screen name="overtime/new" options={{ title: t('overtimeForm.newTitle'), presentation: 'modal' }} />
        <Stack.Screen name="overtime/[id]" options={{ title: t('overtimeForm.editTitle'), presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ title: t('search.placeholder'), presentation: 'modal' }} />
      </Stack>
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
