import { Bold, Code, Heading1, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

export interface TextSelection {
  start: number;
  end: number;
}

interface MarkdownToolbarProps {
  value: string;
  selection: TextSelection;
  onChange: (nextValue: string, nextSelection: TextSelection) => void;
}

// Toolbar de formato "barata" — en vez de un editor WYSIWYG real
// (`@10play/tentap-editor`, revertido: el usuario reportó varios bugs
// en vivo, coincidiendo con los issues de Android sin resolver que ya
// se le habían advertido — ver specs/pantalla-notes/design.md), estos
// botones envuelven la selección actual de un `TextInput` de texto
// plano con los mismos tokens de markdown que ya usa desktop
// (`**negrita**`, `` `código` ``, `# cabecera`, etc.) — el contenido
// sigue siendo el mismo string markdown de siempre, sin conversión a
// HTML ni dependencia nueva.

function wrapSelection(value: string, selection: TextSelection, prefix: string, suffix: string = prefix) {
  const { start, end } = selection;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  const next = `${before}${prefix}${selected}${suffix}${after}`;
  const newStart = start + prefix.length;
  const newEnd = newStart + selected.length;
  return { next, selection: { start: newStart, end: newEnd } };
}

// Antepone (o quita, si ya está) un prefijo a la línea donde empieza
// la selección — cabecera, lista, cita. Solo afecta esa línea, no cada
// línea de una selección multilínea (simplificación deliberada, ver
// design.md).
function toggleLinePrefix(value: string, selection: TextSelection, prefix: string) {
  const { start, end } = selection;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const nextNewline = value.indexOf('\n', lineStart);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  const line = value.slice(lineStart, lineEnd);
  const hasPrefix = line.startsWith(prefix);
  const newLine = hasPrefix ? line.slice(prefix.length) : `${prefix}${line}`;
  const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
  const delta = newLine.length - line.length;
  const newStart = Math.max(lineStart, start + delta);
  const newEnd = Math.max(lineStart, end + delta);
  return { next, selection: { start: newStart, end: newEnd } };
}

export function MarkdownToolbar({ value, selection, onChange }: MarkdownToolbarProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  function wrap(prefix: string, suffix?: string) {
    const result = wrapSelection(value, selection, prefix, suffix);
    onChange(result.next, result.selection);
  }

  function linePrefix(prefix: string) {
    const result = toggleLinePrefix(value, selection, prefix);
    onChange(result.next, result.selection);
  }

  function insertLink() {
    const { start, end } = selection;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const label = selected || 'texto';
    const next = `${before}[${label}](url)${after}`;
    // Deja seleccionado "url" para que el usuario lo reemplace directo.
    const urlStart = before.length + label.length + 3;
    onChange(next, { start: urlStart, end: urlStart + 3 });
  }

  const items: { icon: typeof Bold; onPress: () => void; key: string; label: string }[] = [
    { icon: Bold, onPress: () => wrap('**'), key: 'bold', label: t('noteForm.formatBold') },
    { icon: Italic, onPress: () => wrap('_'), key: 'italic', label: t('noteForm.formatItalic') },
    { icon: Code, onPress: () => wrap('`'), key: 'code', label: t('noteForm.formatCode') },
    { icon: Heading1, onPress: () => linePrefix('# '), key: 'h1', label: t('noteForm.formatH1') },
    { icon: Heading2, onPress: () => linePrefix('## '), key: 'h2', label: t('noteForm.formatH2') },
    { icon: List, onPress: () => linePrefix('- '), key: 'bulletList', label: t('noteForm.formatBulletList') },
    { icon: ListOrdered, onPress: () => linePrefix('1. '), key: 'orderedList', label: t('noteForm.formatOrderedList') },
    { icon: Quote, onPress: () => linePrefix('> '), key: 'quote', label: t('noteForm.formatQuote') },
    { icon: LinkIcon, onPress: insertLink, key: 'link', label: t('noteForm.formatLink') },
  ];

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.bgPanel }]}>
      {items.map(({ icon: Icon, onPress, key, label }) => (
        <Pressable key={key} onPress={onPress} hitSlop={4} style={styles.button} accessibilityLabel={label}>
          <Icon size={18} color={theme.textSecondary} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  button: {
    padding: 8,
  },
});
