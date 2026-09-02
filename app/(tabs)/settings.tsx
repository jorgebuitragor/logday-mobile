import { BookOpen, Clock, Cloud, CloudOff, Download, Eye, EyeOff, Languages, Monitor, Moon, RefreshCw, ShieldAlert, ShieldCheck, Smartphone, Snowflake, Sun, TriangleAlert, UserX } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import i18n, { SUPPORTED_LANGUAGES, setLanguagePreference, type SupportedLanguage } from '../../src/i18n';
import { getPolicyRemote } from '../../src/lib/syncApi';
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

  // El teclado tapaba el formulario de Sincronización (reportado con
  // captura) — mismo problema y misma solución ya establecida en el
  // editor de notas (`note/[id].tsx`): `KeyboardAvoidingView` no
  // funciona en este dispositivo (edge-to-edge en Android no dispara
  // los eventos clásicos de `Keyboard`), así que se lee la altura real
  // del teclado vía `useAnimatedKeyboard` y se agrega como espacio
  // extra al final del `ScrollView` — le da lugar de sobra para
  // desplazarse y que el campo enfocado quede arriba del teclado.
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardSpacer = useAnimatedStyle(() => ({ height: keyboard.height.value }));

  // El espacio extra de arriba alcanza para poder scrollear, pero no
  // mueve la vista solo — el usuario lo reportó ("no lo sube y ajusta
  // automáticamente... debo hacer scroll"). Se agrega el ajuste
  // automático: al enfocar un campo se mide su posición real en
  // pantalla (`measureInWindow`, mismo API ya usado en esta sesión
  // para el drop de Kanban) y, si queda tapado por el teclado, se
  // desplaza el `ScrollView` lo justo para destaparlo. Con `setTimeout`
  // porque `onFocus` dispara ANTES de que el teclado termine de
  // animar su apertura — medir de inmediato usaría la altura vieja
  // (0 o la anterior) del teclado, no la real.
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const windowHeight = useWindowDimensions().height;

  function scrollInputIntoView(node: TextInput | null) {
    if (!node) return;
    setTimeout(() => {
      node.measureInWindow((x, y, width, height) => {
        const keyboardTop = windowHeight - keyboard.height.value;
        const margin = 16;
        const overlap = y + height - (keyboardTop - margin);
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: scrollYRef.current + overlap, animated: true });
        }
      });
    }, 300);
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: theme.bgBase }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScroll={(e) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
    >
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

      <SyncSection scrollInputIntoView={scrollInputIntoView} />
      <PrivacySection />
      <Animated.View style={keyboardSpacer} />
    </ScrollView>
  );
}

function SyncSection({ scrollInputIntoView }: { scrollInputIntoView: (node: TextInput | null) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { syncConfig, syncConnectionStatus, syncErrorMsg, lastCheckedAt, syncConnect, syncDisconnect, checkConnection } = useSync();
  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const serverUrlRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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
              ref={serverUrlRef}
              style={[styles.syncInput, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
              value={serverUrl}
              onChangeText={setServerUrl}
              onFocus={() => scrollInputIntoView(serverUrlRef.current)}
              placeholder={t('sync.serverUrlPlaceholder')}
              placeholderTextColor={theme.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TextInput
              ref={emailRef}
              style={[styles.syncInput, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => scrollInputIntoView(emailRef.current)}
              placeholder={t('sync.emailPlaceholder')}
              placeholderTextColor={theme.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordRef}
                style={[styles.syncInput, { flex: 1, borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => scrollInputIntoView(passwordRef.current)}
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

// Solo tiene sentido con sync activo (ver
// specs/cumplimiento-datos-personales/ en task-manager) — sin
// servidor no hay ningún tratamiento de terceros de qué hablar.
function PrivacySection() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { syncConfig, exportMyData, deleteMyAccount } = useSync();

  const [policyText, setPolicyText] = useState<string | null>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!syncConfig.enabled) return null;

  async function handleViewPolicy() {
    if (policyText !== null) {
      setPolicyText(null);
      return;
    }
    setLoadingPolicy(true);
    try {
      const policy = await getPolicyRemote(syncConfig.serverUrl);
      setPolicyText(policy.text);
    } finally {
      setLoadingPolicy(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteMyAccount(deletePassword);
      setShowDeleteModal(false);
      setDeletePassword('');
    } catch {
      setDeleteError(t('sync.deleteAccountError'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Section title={t('sync.privacyTitle')} icon={ShieldCheck}>
      <Pressable
        style={[styles.privacyRow, { borderColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
        onPress={() => void handleViewPolicy()}
        disabled={loadingPolicy}
      >
        <ShieldCheck size={14} color={theme.textSecondary} />
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{t('sync.privacyViewPolicy')}</Text>
      </Pressable>
      {policyText !== null && (
        <ScrollView style={[styles.policyTextBox, { borderColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <Text style={{ color: theme.textHint, fontSize: 11, lineHeight: 16 }}>{policyText}</Text>
        </ScrollView>
      )}
      <Pressable
        style={[styles.privacyRow, { borderColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
        onPress={() => void exportMyData()}
      >
        <Download size={14} color={theme.textSecondary} />
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{t('sync.exportDataButton')}</Text>
      </Pressable>
      <Pressable style={styles.privacyRow} onPress={() => setShowDeleteModal(true)}>
        <UserX size={14} color={ERROR_COLOR} />
        <Text style={{ color: ERROR_COLOR, fontSize: 13, fontWeight: '600' }}>{t('sync.deleteAccountButton')}</Text>
      </Pressable>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setShowDeleteModal(false)}>
          <Pressable
            style={[modalStyles.panel, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[modalStyles.title, { color: theme.textPrimary }]}>{t('sync.deleteAccountConfirmTitle')}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 10 }}>
              {t('sync.deleteAccountConfirmMessage')}
            </Text>
            <TextInput
              style={[styles.syncInput, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder={t('sync.deleteAccountPasswordPlaceholder')}
              placeholderTextColor={theme.textFaint}
              secureTextEntry
              autoCapitalize="none"
            />
            {deleteError ? <Text style={{ color: ERROR_COLOR, fontSize: 12, marginTop: 6 }}>{deleteError}</Text> : null}
            <View style={modalStyles.buttonRow}>
              <Pressable style={modalStyles.cancelButton} onPress={() => setShowDeleteModal(false)}>
                <Text style={{ color: theme.textSecondary }}>{t('absence.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.confirmButton, { backgroundColor: ERROR_COLOR, opacity: deleting ? 0.6 : 1 }]}
                onPress={() => void handleDeleteAccount()}
                disabled={deleting}
              >
                <Text style={modalStyles.confirmText}>{t('sync.deleteAccountButton')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Section>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
});

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
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  policyTextBox: {
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
