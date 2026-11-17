import { Alert } from 'react-native';

// Menú de la pulsación larga en las filas de las listas (Tareas, Dailys,
// Extras). Reemplaza al deslizar para borrar desde el 17 nov 2026: el
// deslizamiento de lado quedó para cambiar de pestaña (specs/navegacion/).
// "Eliminar" pasa por `useConfirmDelete` como antes, así que sigue la
// opción de confirmar las acciones destructivas y el aviso de deshacer.
export function openDeleteMenu(opts: {
  title: string;
  deleteLabel: string;
  cancelLabel: string;
  onDelete: () => void;
}): void {
  Alert.alert(
    opts.title,
    undefined,
    [
      { text: opts.cancelLabel, style: 'cancel' },
      { text: opts.deleteLabel, style: 'destructive', onPress: opts.onDelete },
    ],
    { cancelable: true },
  );
}
