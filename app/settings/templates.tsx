// Ajustes → Plantillas (logday-server specs/plantillas, v1): qué plantilla
// usan el mensaje del Daily y el Excel de horas extra. Puerto de
// TemplatesSettingsTab.tsx de Desktop, con controles de React Native.
// - Daily: la de Logday (el mensaje de siempre, predeterminada) o una propia,
//   un texto con marcadores.
// - Excel: Legacy (el de siempre, predeterminado), la de Logday (genérica) o
//   un .xlsx cargado.
// Se guarda solo en este teléfono, sin sync.
import { ChevronDown, ChevronRight, FileSpreadsheet, Share2, Upload } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

import { addDaysISO, dateFromLocalISO, todayISO } from '../../src/lib/dates';
import { shareOvertimeTemplate } from '../../src/lib/templateFiles';
import { buildDailyMessage, type DailyTemplateSource, type OvertimeTemplateSource } from '../../src/lib/templates/choice';
import { DAILY_TEMPLATE_MARKERS, LOGDAY_DAILY_TEMPLATE, dailyTemplateContext, renderTemplate } from '../../src/lib/templates/dailyTemplate';
import { OVERTIME_TEMPLATE_MARKERS } from '../../src/lib/templates/overtimeTemplate';
import { useTemplates } from '../../src/settings/TemplatesContext';
import { useTheme } from '../../src/theme/ThemeContext';

const ERROR_COLOR = '#dc2626';
const WARN_COLOR = '#d97706';
const MONO = { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) };
const marker = (name: string) => `{{${name}}}`;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Las opciones como radios en tarjetas. */
function SourcePicker<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; title: string; desc: string; disabled?: boolean }[];
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.picker}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled: o.disabled }}
            disabled={o.disabled}
            onPress={() => onChange(o.id)}
            style={[
              styles.pickerCard,
              {
                borderColor: active ? theme.accent : theme.borderCard,
                backgroundColor: active ? theme.accentSoft : theme.bgSurface,
                opacity: o.disabled ? 0.55 : 1,
              },
            ]}
          >
            <Text style={{ color: active ? theme.accentInk : theme.textPrimary, fontSize: 13, fontWeight: '600' }}>{o.title}</Text>
            <Text style={{ color: theme.textHint, fontSize: 11, marginTop: 2, lineHeight: 15 }}>{o.desc}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Notice({ kind, children }: { kind: 'info' | 'warn' | 'error'; children: string }) {
  const theme = useTheme();
  const color = kind === 'error' ? ERROR_COLOR : kind === 'warn' ? WARN_COLOR : theme.textSecondary;
  return (
    <View style={[styles.notice, { borderColor: kind === 'info' ? theme.border : color }]}>
      <Text style={{ color, fontSize: 12, lineHeight: 17 }}>{children}</Text>
    </View>
  );
}

function SecondaryButton({ label, icon: Icon, onPress }: { label: string; icon?: typeof Upload; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.secondaryButton, { borderColor: theme.border }]}>
      {Icon ? <Icon size={13} color={theme.textSecondary} /> : null}
      <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function DailyTemplateSection() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { templates, setDailyTemplate } = useTemplates();
  const language = i18n.language === 'en' ? 'en' : 'es';
  const source: DailyTemplateSource = templates.daily?.source ?? 'logday';
  const saved = templates.daily?.text ?? '';
  const [draft, setDraft] = useState(saved);
  const selection = useRef({ start: saved.length, end: saved.length });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lo guardado manda cuando cambia por fuera (al cargar de AsyncStorage):
  // se ajusta durante el render, sin un efecto.
  const [syncedSaved, setSyncedSaved] = useState(saved);
  if (saved !== syncedSaved) {
    setSyncedSaved(saved);
    setDraft(saved);
  }
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  const save = (text: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setDailyTemplate({ source: 'custom', text }), 500);
  };
  const edit = (text: string) => {
    setDraft(text);
    save(text);
  };

  const choose = (next: DailyTemplateSource) => {
    // Al pasar a Propia por primera vez se parte del mensaje de siempre.
    if (next === 'custom' && !saved.trim()) {
      setDraft(LOGDAY_DAILY_TEMPLATE);
      selection.current = { start: LOGDAY_DAILY_TEMPLATE.length, end: LOGDAY_DAILY_TEMPLATE.length };
      setDailyTemplate({ source: 'custom', text: LOGDAY_DAILY_TEMPLATE });
      return;
    }
    setDailyTemplate({ source: next });
  };

  // Inserta en el cursor (o reemplaza lo seleccionado) y deja el cursor
  // lógico después del marcador, para insertar varios seguidos.
  const insert = (name: string) => {
    const { start, end } = selection.current;
    const at = Math.min(start, draft.length);
    const to = Math.min(Math.max(end, at), draft.length);
    const text = draft.slice(0, at) + marker(name) + draft.slice(to);
    const pos = at + marker(name).length;
    selection.current = { start: pos, end: pos };
    edit(text);
  };

  // Vista previa con datos de ejemplo: hoy y el día anterior, como el
  // editor del Daily de Mobile.
  const input = useMemo(() => {
    const today = todayISO();
    return {
      prevDate: dateFromLocalISO(addDaysISO(today, -1)),
      prevActivities: t('templates.previewPrev'),
      todayDate: dateFromLocalISO(today),
      todayActivities: t('templates.previewToday'),
      language,
    } as const;
  }, [language, t]);
  const preview = buildDailyMessage(source === 'custom' ? { source, text: draft } : { source }, input);
  const check = source === 'custom' && draft.trim() ? renderTemplate(draft, dailyTemplateContext(input)) : null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('templates.dailyTitle')}</Text>
      <Text style={[styles.sectionDesc, { color: theme.textHint }]}>{t('templates.dailyDesc')}</Text>
      <SourcePicker
        label={`${t('templates.dailyTitle')}: ${t('templates.sourceLabel')}`}
        value={source}
        onChange={choose}
        options={[
          { id: 'logday', title: t('templates.sourceLogday'), desc: t('templates.sourceLogdayDailyDesc') },
          { id: 'custom', title: t('templates.sourceCustom'), desc: t('templates.sourceCustomDailyDesc') },
        ]}
      />

      {source === 'custom' ? (
        <View style={styles.block}>
          <View style={styles.editorHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('templates.editorLabel')}</Text>
            <SecondaryButton
              label={t('templates.startWithLogday')}
              onPress={() => {
                selection.current = { start: LOGDAY_DAILY_TEMPLATE.length, end: LOGDAY_DAILY_TEMPLATE.length };
                edit(LOGDAY_DAILY_TEMPLATE);
              }}
            />
          </View>
          <TextInput
            accessibilityLabel={t('templates.editorLabel')}
            value={draft}
            onChangeText={edit}
            onSelectionChange={(e) => {
              selection.current = e.nativeEvent.selection;
            }}
            onBlur={() => {
              if (saveTimer.current) clearTimeout(saveTimer.current);
              if (draft !== saved) setDailyTemplate({ source: 'custom', text: draft });
            }}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
            style={[
              styles.editor,
              MONO,
              { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary },
            ]}
          />
          <Text style={[styles.hint, { color: theme.textHint }]}>{t('templates.insertMarker')}:</Text>
          <View style={styles.chips} accessibilityLabel={t('templates.insertMarker')}>
            {DAILY_TEMPLATE_MARKERS.map((name) => (
              <Pressable
                key={name}
                onPress={() => insert(name)}
                style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.bgSurface }]}
              >
                <Text style={[{ color: theme.textSecondary, fontSize: 11 }, MONO]}>{marker(name)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.hint, { color: theme.textHint }]}>
            {t('templates.markerHint', { open: '{{#hoy.es_hoy}}', close: '{{/hoy.es_hoy}}' })}
          </Text>
          {!draft.trim() ? <Notice kind="info">{t('templates.emptyCustom')}</Notice> : null}
          {check?.error ? <Notice kind="error">{t('templates.syntaxError', { detail: check.error })}</Notice> : null}
          {check && check.unknown.length > 0 ? (
            <Notice kind="warn">{t('templates.unknownMarkers', { list: check.unknown.map(marker).join(', ') })}</Notice>
          ) : null}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('templates.preview')}</Text>
        <View style={[styles.preview, { borderColor: theme.borderCard, backgroundColor: theme.bgInput }]}>
          <Text selectable style={{ color: theme.textBody, fontSize: 12, lineHeight: 18 }}>
            {preview}
          </Text>
        </View>
      </View>
    </View>
  );
}

function OvertimeTemplateSection() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { templates, setOvertimeTemplateSource, loadOvertimeTemplate } = useTemplates();
  const [helpOpen, setHelpOpen] = useState(false);
  const overtime = templates.overtime;
  const source: OvertimeTemplateSource = overtime?.source ?? 'legacy';
  const hasFile = Boolean(overtime?.fileName);
  const loadedDate = overtime?.loadedAt
    ? new Date(overtime.loadedAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  async function handleLoad() {
    try {
      await loadOvertimeTemplate();
    } catch (err) {
      Alert.alert(t('templates.loadError'), errorMessage(err));
    }
  }

  async function handleShare(which: 'logday' | 'custom') {
    try {
      await shareOvertimeTemplate(which, overtime?.fileName);
    } catch (err) {
      Alert.alert(t('templates.shareError'), errorMessage(err));
    }
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('templates.overtimeTitle')}</Text>
      <Text style={[styles.sectionDesc, { color: theme.textHint }]}>{t('templates.overtimeDesc')}</Text>
      <SourcePicker
        label={`${t('templates.overtimeTitle')}: ${t('templates.sourceLabel')}`}
        value={source}
        onChange={setOvertimeTemplateSource}
        options={[
          { id: 'legacy', title: t('templates.sourceLegacy'), desc: t('templates.sourceLegacyDesc') },
          { id: 'logday', title: t('templates.sourceLogday'), desc: t('templates.sourceLogdayXlsxDesc') },
          {
            id: 'custom',
            title: t('templates.sourceCustom'),
            desc: hasFile ? t('templates.sourceCustomXlsxDesc') : t('templates.sourceCustomXlsxEmpty'),
            disabled: !hasFile,
          },
        ]}
      />

      <View style={[styles.fileBox, { borderColor: theme.borderCard, backgroundColor: theme.bgSurface }]}>
        <View style={styles.fileRow}>
          <FileSpreadsheet size={16} color={theme.textHint} />
          <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={2}>
            {hasFile ? t('templates.loadedFile', { name: overtime?.fileName, date: loadedDate }) : t('templates.noFile')}
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <SecondaryButton icon={Upload} label={hasFile ? t('templates.replace') : t('templates.load')} onPress={() => void handleLoad()} />
          {hasFile ? <SecondaryButton icon={Share2} label={t('templates.shareCustom')} onPress={() => void handleShare('custom')} /> : null}
          <SecondaryButton icon={Share2} label={t('templates.shareLogday')} onPress={() => void handleShare('logday')} />
        </View>
      </View>

      <View style={[styles.help, { borderColor: theme.borderCard }]}>
        <Pressable
          style={styles.helpHeader}
          onPress={() => setHelpOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: helpOpen }}
        >
          {helpOpen ? <ChevronDown size={14} color={theme.textSecondary} /> : <ChevronRight size={14} color={theme.textSecondary} />}
          <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{t('templates.xlsxHelpTitle')}</Text>
        </Pressable>
        {helpOpen ? (
          <View style={{ gap: 6, marginTop: 8 }}>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              {t('templates.xlsxHelp1', { values: OVERTIME_TEMPLATE_MARKERS.values.map(marker).join(', ') })}
            </Text>
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>{t('templates.xlsxHelp2', { row: '{{fila.…}}' })}</Text>
            <Text style={[styles.helpText, MONO, { color: theme.textHint, fontSize: 11 }]}>
              {t('templates.xlsxHelp3', { list: OVERTIME_TEMPLATE_MARKERS.row.map(marker).join(', ') })}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function TemplatesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  // Mismo arreglo que Ajustes: espacio al final del tamaño del teclado para
  // poder desplazar el editor por encima de él.
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const keyboardSpacer = useAnimatedStyle(() => ({ height: keyboard.height.value }));

  return (
    <ScrollView
      style={{ backgroundColor: theme.bgBase }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>{t('templates.intro')}</Text>
      <DailyTemplateSection />
      <OvertimeTemplateSection />
      <Animated.View style={keyboardSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  sectionDesc: {
    fontSize: 12,
    marginTop: -6,
  },
  picker: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  block: {
    gap: 8,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  editor: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  preview: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  help: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
