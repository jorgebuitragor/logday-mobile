import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { countRows } from '../db';

interface EntityCountScreenProps {
  label: string;
  table: string;
}

export function EntityCountScreen({ label, table }: EntityCountScreenProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    countRows(table).then(setCount);
  }, [table]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label}</Text>
      <Text>{count === null ? 'Cargando...' : `${count} registros locales`}</Text>
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
