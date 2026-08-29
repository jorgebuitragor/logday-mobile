import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { createNote } from '../../src/db/notes';
import { useTheme } from '../../src/theme/ThemeContext';

// Igual que desktop (`createNote` en appStore.ts): una nota nueva se
// crea vacía de inmediato y se abre directo en el editor — no hay
// diálogo previo pidiendo título/carpeta/tags (ver
// specs/pantalla-notes/design.md, "Editor simplificado"). Esta
// pantalla es solo el paso intermedio de crear + navegar; no
// renderiza ningún formulario propio.
export default function NewNoteScreen() {
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    createNote({ title: '', content: '', folder: '', tags: [] }).then((id) => {
      router.replace(`/note/${id}`);
    });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgBase }}>
      <ActivityIndicator color={theme.accent} />
    </View>
  );
}
