import { useRouter, Tabs } from 'expo-router';
import { CalendarDays, CheckSquare, Notebook, Search, Settings, Timer } from 'lucide-react-native';
import { Image, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../src/theme/ThemeContext';

const logoMark = require('../../assets/logo-mark.png');

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  return (
    <Tabs
      // Fuerza remount del navigator al cambiar de idioma: los títulos
      // pasados vía `options` en <Tabs.Screen> no se releen de forma
      // reactiva en cada render del layout (a diferencia de
      // `screenOptions`, que sí es reactivo — por eso los colores de
      // tema se actualizan solos pero el idioma no lo hacía). Ver
      // specs/i18n/design.md.
      key={i18n.language}
      screenOptions={{
        headerStyle: { backgroundColor: theme.bgPanel },
        headerTintColor: theme.textPrimary,
        headerLeft: () => <Image source={logoMark} style={styles.headerLogo} />,
        headerRight: () => (
          <Pressable onPress={() => router.push('/search')} style={styles.headerSearch}>
            <Search color={theme.textPrimary} size={20} />
          </Pressable>
        ),
        tabBarStyle: { backgroundColor: theme.bgPanel, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        sceneStyle: { backgroundColor: theme.bgBase },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.tasks'),
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: t('tabs.notes'),
          tabBarIcon: ({ color, size }) => <Notebook color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dailys"
        options={{
          title: t('tabs.dailys'),
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="overtime"
        options={{
          title: t('tabs.overtime'),
          tabBarIcon: ({ color, size }) => <Timer color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLogo: {
    width: 24,
    height: 24,
    marginLeft: 16,
  },
  headerSearch: {
    marginRight: 16,
    padding: 4,
  },
});
