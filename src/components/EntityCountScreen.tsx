import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { countRows } from '../db';
import { useTheme } from '../theme/ThemeContext';

interface EntityCountScreenProps {
  label: string;
  table: string;
}

export function EntityCountScreen({ label, table }: EntityCountScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    countRows(table).then(setCount);
  }, [table]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgBase }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{label}</Text>
      <Text style={{ color: theme.textSecondary }}>
        {count === null ? t('entityCount.loading') : t('entityCount.count', { count })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
