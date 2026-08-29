import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import i18n, { SUPPORTED_LANGUAGES, setLanguagePreference, type SupportedLanguage } from '../../src/i18n';
import { usePreferences } from '../../src/settings/PreferencesContext';
import { useTheme, useThemePreference, type ThemePreference } from '../../src/theme/ThemeContext';

const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const { confirmDestructiveActions, setConfirmDestructiveActions } = usePreferences();

  return (
    <ScrollView style={{ backgroundColor: theme.bgBase }} contentContainerStyle={styles.content}>
      <Section title={t('settings.theme')}>
        {THEME_PREFERENCES.map((pref, i) => (
          <OptionRow
            key={pref}
            label={t(`settings.theme${pref.charAt(0).toUpperCase()}${pref.slice(1)}`)}
            selected={preference === pref}
            onPress={() => setPreference(pref)}
            isLast={i === THEME_PREFERENCES.length - 1}
          />
        ))}
      </Section>

      <Section title={t('settings.language')}>
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

      <Section title={t('settings.behavior')}>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionBody, { backgroundColor: theme.bgPanel, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
  isLast,
}: {
  label: string;
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
      <Text style={{ color: theme.textPrimary }}>{label}</Text>
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
  sectionTitle: {
    marginBottom: 8,
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
});
