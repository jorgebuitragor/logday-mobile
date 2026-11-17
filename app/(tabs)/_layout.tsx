import { useRouter, useSegments } from 'expo-router';
import TopTabs, { type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { CalendarDays, CheckSquare, House, Notebook, Search, Settings, Timer } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LogoMark } from '../../src/components/LogoMark';
import { useTheme } from '../../src/theme/ThemeContext';

// Pestañas deslizables (specs/navegacion/): `TopTabs` de expo-router
// (react-native-tab-view + react-native-pager-view) con la barra abajo,
// para cambiar de pestaña deslizando de lado, como en Instagram. Pedido
// de Jorge el 17 nov 2026. Antes era `Tabs` (bottom-tabs) con fundido.
// `TopTabs` no dibuja cabecera ni la barra de abajo como bottom-tabs, así
// que las dos son propias y copian el aspecto anterior: logo, título,
// búsqueda y engranaje arriba; ícono y nombre abajo.

type IconType = ComponentType<{ color: string; size: number }>;

// Inicio (specs/inicio/) es la primera pestaña. Ajustes salió de la barra
// (ya eran 5 pestañas) a un engranaje en la cabecera de todas las
// pestañas, junto a la búsqueda.
const TABS: { name: string; titleKey: string; Icon: IconType }[] = [
  { name: 'index', titleKey: 'tabs.home', Icon: House },
  { name: 'tasks', titleKey: 'tabs.tasks', Icon: CheckSquare },
  { name: 'notes', titleKey: 'tabs.notes', Icon: Notebook },
  { name: 'dailys', titleKey: 'tabs.dailys', Icon: CalendarDays },
  { name: 'overtime', titleKey: 'tabs.overtime', Icon: Timer },
];

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: theme.bgBase }]}>
      <TabsHeader />
      <TopTabs
        // Fuerza remount del navigator al cambiar de idioma: los títulos
        // pasados vía `options` no se releen de forma reactiva. Ver
        // specs/i18n/design.md.
        key={i18n.language}
        tabBarPosition="bottom"
        tabBar={(props: MaterialTopTabBarProps) => <BottomBar {...props} />}
        screenOptions={{
          swipeEnabled: true,
          animationEnabled: true,
          // Se pinta al llegar a la pestaña, y la vecina se adelanta para
          // que el deslizamiento no muestre un hueco.
          lazy: true,
          lazyPreloadDistance: 1,
          sceneStyle: { backgroundColor: theme.bgBase },
        }}
      >
        {TABS.map(({ name, titleKey }) => (
          <TopTabs.Screen key={name} name={name} options={{ title: t(titleKey) }} />
        ))}
      </TopTabs>
    </View>
  );
}

/** Cabecera común: logo, título de la pestaña activa, búsqueda y Ajustes. */
function TabsHeader() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  // En el Inicio el último segmento es "(tabs)"; en las demás, su nombre.
  const current = TABS.find((tab) => tab.name === segments[segments.length - 1]) ?? TABS[0];

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top, backgroundColor: theme.bgPanel, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.headerLogo}>
        <LogoMark size={24} />
      </View>
      <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1} accessibilityRole="header">
        {t(current.titleKey)}
      </Text>
      <View style={styles.headerActions}>
        <Pressable onPress={() => router.push('/search')} style={styles.headerIcon} accessibilityLabel={t('search.placeholder')}>
          <Search color={theme.textPrimary} size={20} />
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} style={styles.headerIcon} accessibilityLabel={t('tabs.settings')}>
          <Settings color={theme.textPrimary} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

/** Barra de abajo con el aspecto de la de bottom-tabs: ícono y nombre. */
function BottomBar({ state, navigation, descriptors }: MaterialTopTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: insets.bottom, backgroundColor: theme.bgPanel, borderTopColor: theme.border },
      ]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route: { key: string; name: string }, index: number) => {
        const focused = state.index === index;
        const color = focused ? theme.accent : theme.textMuted;
        const tab = TABS.find((x) => x.name === route.name);
        const title: string = descriptors[route.key]?.options.title ?? route.name;
        const Icon = tab?.Icon ?? House;
        return (
          <Pressable
            key={route.key}
            style={styles.barItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={title}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          >
            <Icon color={color} size={24} />
            <Text style={[styles.barLabel, { color }]} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerLogo: {
    width: 24,
    height: 24,
    marginLeft: 16,
  },
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    fontSize: 17,
    marginLeft: 16,
    // Misma altura que la cabecera de bottom-tabs en Android.
    lineHeight: 56,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  headerIcon: {
    padding: 4,
  },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    minHeight: 52,
    gap: 2,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
