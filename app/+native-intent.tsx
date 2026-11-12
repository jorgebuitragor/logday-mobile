// Enlaces del sistema que no son rutas de la app (ver Expo Router,
// "Customizing links"). "Compartir con Logday" en iOS entra como
// `logdaymobile://dataUrl=...` (expo-share-intent): se lleva a la pantalla
// de captura en vez de a "ruta no encontrada". Hoy la extensión de iOS está
// apagada (`disableIOS` en app.json, Android primero), así que solo cubre
// ese caso a futuro.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.includes('dataUrl=') ? '/capture' : path;
}
