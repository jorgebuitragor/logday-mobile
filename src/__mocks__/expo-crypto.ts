// Mock automático de Jest para `expo-crypto` (módulo nativo): en Node,
// `randomUUID` sale del `crypto` de Node.
import { randomUUID as nodeRandomUUID } from 'crypto';

export function randomUUID(): string {
  return nodeRandomUUID();
}
