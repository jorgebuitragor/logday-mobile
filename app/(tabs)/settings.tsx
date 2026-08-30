import { BookOpen, Clock, Cloud, CloudOff, Eye, EyeOff, Languages, Monitor, Moon, RefreshCw, ShieldAlert, Smartphone, Snowflake, Sun, TriangleAlert } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import i18n, { SUPPORTED_LANGUAGES, setLanguagePreference, type SupportedLanguage } from '../../src/i18n';
import { usePreferences, type TimeFormat } from '../../src/settings/PreferencesContext';
import { useSync } from '../../src/settings/SyncContext';
import { useTheme, useThemePreference, type ThemePreference } from '../../src/theme/ThemeContext';

const CONNECTED_COLOR = '#4ade80';
const ERROR_COLOR = '#dc2626';

function relativeTime(t: (key: string, opts?: Record<string, unknown>) => string, iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return t('sync.justNow');
  if (diffMin < 60) return t('sync.minutesAgo', { count: diffMin });
  return t('sync.hoursAgo', { count: Math.floor(diffMin / 60) });
}

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

      <SyncSection />
    </ScrollView>
  );
}

function SyncSection() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { syncConfig, syncConnectionStatus, syncErrorMsg, lastCheckedAt, syncConnect, syncDisconnect, checkConnection } = useSync();
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);

  const isConnected = syncConnectionStatus === 'connected';
  const isConnecting = syncConnectionStatus === 'connecting';
  const statusColor = isConnected ? CONNECTED_COLOR : syncConnectionStatus === 'error' ? ERROR_COLOR : theme.textFaint;
  const statusLabel =
    syncConnectionStatus === 'connected'
      ? t('sync.statusConnected')
      : syncConnectionStatus === 'connecting'
        ? t('sync.connecting')
        : syncConnectionStatus === 'error'
          ? t('sync.statusError')
          : t('sync.statusDisconnected');

  async function handleConnect() {
    try {
      await syncConnect(serverUrl, email, password);
      setPassword('');
    } catch {
      // el error ya queda en syncErrorMsg, se muestra abajo
    }
  }

  async function handleCheck() {
    setChecking(true);
    await checkConnection();
    setChecking(false);
  }

  return (
    <Section title={t('sync.title')} icon={isConnected ? Cloud : CloudOff}>
      <View style={[styles.syncBody, { borderColor: theme.border }]}>
        <View style={styles.syncStatusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{statusLabel}</Text>
          {isConnecting ? <ActivityIndicator size="small" color={theme.textSecondary} /> : null}
        </View>

        {syncConfig.enabled ? (
          <>
            <Text style={{ color: theme.textHint, fontSize: 12, marginTop: 4 }}>
              {t('sync.connectedAs', { email: syncConfig.email })} · {syncConfig.serverUrl}
            </Text>
            <Text style={{ color: theme.textHint, fontSize: 12, marginTop: 2 }}>
              {lastCheckedAt ? t('sync.lastChecked', { time: relativeTime(t, lastCheckedAt) }) : t('sync.lastCheckedNever')}
            </Text>
            {syncErrorMsg ? (
              <Text style={{ color: ERROR_COLOR, fontSize: 12, marginTop: 6 }}>{syncErrorMsg}</Text>
            ) : null}
            <View style={styles.syncButtonRow}>
              <Pressable
                style={[styles.syncButton, { borderColor: theme.border }]}
                onPress={handleCheck}
                disabled={checking}
              >
                {checking ? (
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                ) : (
                  <RefreshCw size={14} color={theme.textSecondary} />
                )}
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{t('sync.checkConnection')}</Text>
              </Pressable>
              <Pressable style={[styles.syncButton, { borderColor: ERROR_COLOR }]} onPress={() => syncDisconnect()}>
                <Text style={{ color: ERROR_COLOR, fontSize: 13, fontWeight: '600' }}>{t('sync.disconnect')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {syncErrorMsg ? (
              <Text style={{ color: ERROR_COLOR, fontSize: 12, marginTop: 6, marginBottom: 4 }}>{syncErrorMsg}</Text>
            ) : null}
            <TextInput
              style={[styles.syncInput, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder={t('sync.serverUrlPlaceholder')}
              placeholderTextColor={theme.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TextInput
              style={[styles.syncInput, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              placeholder={t('sync.emailPlaceholder')}
              placeholderTextColor={theme.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.syncInput, { flex: 1, borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                placeholder={t('sync.password')}
                placeholderTextColor={theme.textFaint}
                autoCapitalize="none"
                secureTextEntry={!showPassword}
              />
              <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={16} color={theme.textSecondary} />
                ) : (
                  <Eye size={16} color={theme.textSecondary} />
                )}
              </Pressable>
            </View>
            <Pressable
              style={[styles.connectButton, { backgroundColor: theme.accentStrong }]}
              onPress={handleConnect}
              disabled={isConnecting || !serverUrl.trim() || !email.trim() || !password}
            >
              <Text style={styles.connectButtonText}>{isConnecting ? t('sync.connecting') : t('sync.connect')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </Section>
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
  syncBody: {
    padding: 12,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 20,
  },
  connectButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  syncButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
