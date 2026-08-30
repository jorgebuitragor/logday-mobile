import { BookOpen, Clock, Eye, Languages, Monitor, Moon, ShieldAlert, Smartphone, Snowflake, Sun, TriangleAlert } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import i18n, { SUPPORTED_LANGUAGES, setLanguagePreference, type SupportedLanguage } from '../../src/i18n';
import { usePreferences, type TimeFormat } from '../../src/settings/PreferencesContext';
import { useTheme, useThemePreference, type ThemePreference } from '../../src/theme/ThemeContext';

// Mismos 8 temas y mismo orden que `THEME_OPTIONS` en
// `logday-web/src/components/settings/SettingsSection.tsx` — pedido
// explícito del usuario ("seleccionable... similar a como se hace en
// Logday-web"). Antes mobile solo tenía Sistema/Claro/Oscuro.
const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark', 'high-contrast', 'visual-rest', 'sepia', 'oled', 'nordic'];

const THEME_ICONS: Record<ThemePreference, ComponentType<{ size?: number; color?: string }>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
  'high-contrast': TriangleAlert,
  'visual-rest': Eye,
  sepia: BookOpen,
  oled: Smartphone,
  nordic: Snowflake,
};

// Mapa explícito en vez de derivar la clave con
// `charAt(0).toUpperCase()+slice(1)` (que ya no alcanza con nombres
// con guion como "high-contrast" → produciría una clave inválida
// "themeHigh-contrast").
const THEME_LABEL_KEY: Record<ThemePreference, string> = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  'high-contrast': 'settings.themeHighContrast',
  'visual-rest': 'settings.themeVisualRest',
  sepia: 'settings.themeSepia',
  oled: 'settings.themeOled',
  nordic: 'settings.themeNordic',
};

const THEME_DESC_KEY: Record<ThemePreference, string> = {
  system: 'settings.themeSystemDesc',
  light: 'settings.themeLightDesc',
  dark: 'settings.themeDarkDesc',
  'high-contrast': 'settings.themeHighContrastDesc',
  'visual-rest': 'settings.themeVisualRestDesc',
  sepia: 'settings.themeSepiaDesc',
  oled: 'settings.themeOledDesc',
  nordic: 'settings.themeNordicDesc',
};

const TIME_FORMATS: TimeFormat[] = ['24h', '12h'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const { confirmDestructiveActions, setConfirmDestructiveActions, timeFormat, setTimeFormat } = usePreferences();

  return (
    <ScrollView style={{ backgroundColor: theme.bgBase }} contentContainerStyle={styles.content}>
      <Section title={t('settings.theme')} icon={Sun}>
        {THEME_PREFERENCES.map((pref, i) => (
          <OptionRow
            key={pref}
            icon={THEME_ICONS[pref]}
            label={t(THEME_LABEL_KEY[pref])}
            description={t(THEME_DESC_KEY[pref])}
            selected={preference === pref}
            onPress={() => setPreference(pref)}
            isLast={i === THEME_PREFERENCES.length - 1}
          />
        ))}
      </Section>

      <Section title={t('settings.language')} icon={Languages}>
        {SUPPORTED_LANGUAGES.map((lang, i) => (
          <OptionRow
            key={lang}
            label={t(`settings.language${lang.charAt(0).toUpperCase()}${lang.slice(1)}`)}
            selected={i18n.language === lang}
            onPress={() => setLanguagePreference(lang as SupportedLanguage)}
            isLast={i === SUPPORTED_LANGUAGES.length - 1}
          />
        ))}
      </Section>

      <Section title={t('settings.timeFormat')} icon={Clock}>
        {TIME_FORMATS.map((format, i) => (
          <OptionRow
            key={format}
            label={t(`settings.timeFormat${format}`)}
            selected={timeFormat === format}
            onPress={() => setTimeFormat(format)}
            isLast={i === TIME_FORMATS.length - 1}
          />
        ))}
      </Section>

      <Section title={t('settings.behavior')} icon={ShieldAlert}>
        <Pressable
          style={[styles.row, { borderBottomWidth: 0 }]}
          onPress={() => setConfirmDestructiveActions(!confirmDestructiveActions)}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{t('settings.confirmDeleteTitle')}</Text>
            <Text style={{ color: theme.textHint, fontSize: 12, marginTop: 2 }}>{t('settings.confirmDeleteDesc')}</Text>
          </View>
          <Switch
            value={confirmDestructiveActions}
            onValueChange={setConfirmDestructiveActions}
            trackColor={{ true: theme.accentStrong }}
          />
        </Pressable>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon size={14} color={theme.textSecondary} />
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      </View>
      <View style={[styles.sectionBody, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function OptionRow({
  icon: Icon,
  label,
  description,
  selected,
  onPress,
  isLast,
}: {
  icon?: ComponentType<{ size?: number; color?: string }>;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  isLast: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      style={[styles.row, { borderColor: theme.border, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth }]}
      onPress={onPress}
    >
      <View style={styles.rowLabel}>
        {Icon ? <Icon size={16} color={selected ? theme.accent : theme.textSecondary} /> : null}
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: theme.textPrimary }}>{label}</Text>
          {description ? (
            <Text style={{ color: theme.textHint, fontSize: 11, marginTop: 1 }}>{description}</Text>
          ) : null}
        </View>
      </View>
      {selected && <Text style={{ color: theme.accent, fontWeight: '700' }}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  sectionBody: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
