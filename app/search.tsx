import { useRouter } from 'expo-router';
import { CalendarDays, CheckSquare, Notebook, SlidersHorizontal, Timer, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppDatePicker } from '../src/components/AppDatePicker';
import { FilterChip } from '../src/components/FilterChip';
import {
  EMPTY_FILTERS,
  listSearchLabels,
  searchAll,
  type SearchFilters,
  type SearchResult,
  type SearchResultKind,
} from '../src/db/search';
import { useTheme } from '../src/theme/ThemeContext';
import type { TaskStatus } from '../src/types/task';

const ICONS: Record<SearchResultKind, React.ElementType> = {
  task: CheckSquare,
  note: Notebook,
  daily: CalendarDays,
  overtime: Timer,
};

const ROUTES: Record<SearchResultKind, (id: string) => string> = {
  task: (id) => `/task/${id}`,
  note: (id) => `/note/${id}`,
  daily: (id) => `/daily/${id}`,
  overtime: (id) => `/overtime/${id}`,
};

const KINDS: SearchResultKind[] = ['task', 'note', 'daily', 'overtime'];
const KIND_TITLE_KEY: Record<SearchResultKind, string> = {
  task: 'search.tasksTitle',
  note: 'search.notesTitle',
  daily: 'search.dailysTitle',
  overtime: 'search.overtimeTitle',
};
const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [labels, setLabels] = useState<string[]>([]);
  const [results, setResults] = useState<Record<SearchResultKind, SearchResult[]>>({
    task: [],
    note: [],
    daily: [],
    overtime: [],
  });

  // Los chips de proyecto/tag se cargan una vez al abrir el panel (no
  // en cada tecla) — son valores conocidos de la base local, no
  // dependen de la búsqueda en curso.
  useEffect(() => {
    if (filtersOpen && labels.length === 0) {
      listSearchLabels().then(setLabels);
    }
  }, [filtersOpen, labels.length]);

  useEffect(() => {
    const handle = setTimeout(() => {
      searchAll(query, filters).then(setResults);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, filters]);

  const activeFilterCount =
    filters.kinds.length +
    filters.statuses.length +
    (filters.label ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  const showStatusChips = filters.kinds.length === 0 || filters.kinds.includes('task');

  const groups: { kind: SearchResultKind; title: string }[] = useMemo(
    () => [
      { kind: 'task', title: t('search.tasksTitle') },
      { kind: 'note', title: t('search.notesTitle') },
      { kind: 'daily', title: t('search.dailysTitle') },
      { kind: 'overtime', title: t('search.overtimeTitle') },
    ],
    [t]
  );

  const hasResults = groups.some((g) => results[g.kind].length > 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <View style={styles.searchRow}>
        <TextInput
          autoFocus
          style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          placeholderTextColor={theme.textFaint}
          selectionColor={theme.accent}
        />
        <Pressable
          onPress={() => setFiltersOpen((prev) => !prev)}
          style={[
            styles.filtersButton,
            {
              borderColor: activeFilterCount > 0 ? theme.accent : theme.border,
              backgroundColor: filtersOpen ? theme.accentSoft : 'transparent',
            },
          ]}
          accessibilityLabel={t('search.filtersToggle')}
        >
          <SlidersHorizontal size={16} color={activeFilterCount > 0 ? theme.accentInk : theme.textSecondary} />
          {activeFilterCount > 0 ? (
            <Text style={[styles.filtersBadge, { color: theme.accentInk }]}>{activeFilterCount}</Text>
          ) : null}
        </Pressable>
      </View>

      {filtersOpen ? (
        <View style={[styles.filtersPanel, { borderColor: theme.border, backgroundColor: theme.bgPanel }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {KINDS.map((kind) => (
              <FilterChip
                key={kind}
                label={t(KIND_TITLE_KEY[kind])}
                active={filters.kinds.includes(kind)}
                onPress={() => setFilters((prev) => ({ ...prev, kinds: toggle(prev.kinds, kind) }))}
              />
            ))}
          </ScrollView>

          {showStatusChips ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {STATUSES.map((status) => (
                <FilterChip
                  key={status}
                  label={t(
                    status === 'todo' ? 'taskForm.statusTodo' : status === 'in-progress' ? 'taskForm.statusInProgress' : 'taskForm.statusDone'
                  )}
                  active={filters.statuses.includes(status)}
                  onPress={() => setFilters((prev) => ({ ...prev, statuses: toggle(prev.statuses, status) }))}
                />
              ))}
            </ScrollView>
          ) : null}

          {labels.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {labels.map((label) => (
                <FilterChip
                  key={label}
                  label={label}
                  active={filters.label === label}
                  onPress={() => setFilters((prev) => ({ ...prev, label: prev.label === label ? null : label }))}
                />
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: theme.textHint }]}>{t('search.dateFrom')}</Text>
              <AppDatePicker
                value={filters.dateFrom ?? ''}
                onChange={(iso) => setFilters((prev) => ({ ...prev, dateFrom: iso || null }))}
                allowClear
              />
            </View>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: theme.textHint }]}>{t('search.dateTo')}</Text>
              <AppDatePicker
                value={filters.dateTo ?? ''}
                onChange={(iso) => setFilters((prev) => ({ ...prev, dateTo: iso || null }))}
                allowClear
              />
            </View>
          </View>

          {activeFilterCount > 0 ? (
            <Pressable style={styles.clearRow} onPress={() => setFilters(EMPTY_FILTERS)}>
              <X size={12} color={theme.textSecondary} />
              <Text style={[styles.clearText, { color: theme.textSecondary }]}>{t('search.filtersClear')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!query.trim() ? (
        <Text style={[styles.hint, { color: theme.textFaint }]}>{t('search.typeHint')}</Text>
      ) : !hasResults ? (
        <Text style={[styles.hint, { color: theme.textFaint }]}>
          {t('search.noResultsFor')} "{query}"
        </Text>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={groups}
          keyExtractor={(g) => g.kind}
          renderItem={({ item: group }) =>
            results[group.kind].length === 0 ? null : (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: theme.textHint }]}>{group.title}</Text>
                {results[group.kind].map((r) => {
                  const Icon = ICONS[r.kind];
                  return (
                    <Pressable
                      key={`${r.kind}-${r.id}`}
                      style={[styles.row, { borderColor: theme.border }]}
                      onPress={() => {
                        router.back();
                        router.push(ROUTES[r.kind](r.id) as never);
                      }}
                    >
                      <Icon color={theme.accent} size={16} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{r.title}</Text>
                        {r.snippet ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>{r.snippet}</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  filtersBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  filtersPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  chipRow: {
    gap: 6,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
    gap: 4,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    marginTop: 32,
  },
  list: {
    gap: 16,
  },
  group: {
    gap: 6,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
