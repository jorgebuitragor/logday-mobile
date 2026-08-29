import { useRouter } from 'expo-router';
import { CalendarDays, CheckSquare, Notebook, Timer } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchAll, type SearchResult, type SearchResultKind } from '../src/db/search';
import { useTheme } from '../src/theme/ThemeContext';

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

export default function SearchScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<SearchResultKind, SearchResult[]>>({
    task: [],
    note: [],
    daily: [],
    overtime: [],
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      searchAll(query).then(setResults);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const groups: { kind: SearchResultKind; title: string }[] = [
    { kind: 'task', title: t('search.tasksTitle') },
    { kind: 'note', title: t('search.notesTitle') },
    { kind: 'daily', title: t('search.dailysTitle') },
    { kind: 'overtime', title: t('search.overtimeTitle') },
  ];

  const hasResults = groups.some((g) => results[g.kind].length > 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.bgInput }]}>
        <TextInput
          autoFocus
          style={{ color: theme.textPrimary, flex: 1 }}
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          placeholderTextColor={theme.textFaint}
        />
      </View>

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
  inputWrap: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
