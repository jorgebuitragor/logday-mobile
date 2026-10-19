import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import type { NotesSortBy } from '../settings/PreferencesContext';

interface NoteSortSheetProps {
  visible: boolean;
  value: NotesSortBy;
  onSelect: (value: NotesSortBy) => void;
  onClose: () => void;
}

const OPTIONS: NotesSortBy[] = ['updated', 'created', 'title'];

// Mismo criterio de ordenar que el dropdown de NoteList.tsx en
// desktop (updated/created/title, pinned siempre primero), como hoja
// inferior en vez de dropdown anclado — mismo patrón visual que
// NoteActionsSheet, sin sus modos adicionales (acá es una sola lista).
export function NoteSortSheet({ visible, value, onSelect, onClose }: NoteSortSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const labels: Record<NotesSortBy, string> = {
    updated: t('noteSort.sortUpdated'),
    created: t('noteSort.sortCreated'),
    title: t('noteSort.sortTitle'),
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: theme.textFaint }]}>{t('noteSort.label')}</Text>
          {OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={styles.row}
              onPress={() => {
                onSelect(option);
                onClose();
              }}
            >
              <Text style={[styles.rowLabel, { color: value === option ? theme.accentInk : theme.textPrimary }]}>
                {labels[option]}
              </Text>
              {value === option ? <Check size={16} color={theme.accentInk} /> : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 15,
  },
});
