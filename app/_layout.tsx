import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../src/i18n';
import { initDb } from '../src/db';
import { PreferencesProvider } from '../src/settings/PreferencesContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';

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
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((error: Error) => setDbError(error.message));
  }, []);

  if (dbError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textPrimary }}>{t('db.error', { message: dbError })}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bgBase }]}>
        <Text style={{ color: theme.textPrimary }}>{t('db.initializing')}</Text>
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
