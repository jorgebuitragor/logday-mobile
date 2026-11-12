import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '../theme/ThemeContext';
import { LOGO_DOC_PATH, LOGO_FOLD_PATH, LOGO_TREND_LENGTH, LOGO_TREND_PATH } from './LogoMark';

// Splash de arranque (specs/splash/). Toma el relevo del splash nativo
// (`expo-splash-screen`, ícono sobre el fondo claro u oscuro del sistema) y
// lo cierra en cuanto pinta su primer cuadro. Muestra el ícono y el
// wordmark de la marca ("log" + "day" en JetBrains Mono, como la landing)
// con los colores del tema activo, y anima la entrada:
//   1. el ícono aparece con un leve zoom;
//   2. la línea de tendencia del documento se dibuja;
//   3. el wordmark sube y aparece.
// Cuando la app está lista (`done`) y la entrada terminó, se desvanece y
// avisa con `onHidden`. La app ya está montada debajo, así que la espera
// extra es como mucho lo que dura la entrada. Con "reducir movimiento"
// no anima: aparece completo y se quita sin desvanecerse.

const LOGO_SIZE = 88;
const INTRO_MS = 700;
const EXIT_MS = 220;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface BootSplashProps {
  /** La app terminó de arrancar (base lista). */
  done: boolean;
  /** Se terminó de ocultar: el padre deja de montarlo. */
  onHidden: () => void;
  /** Texto para lectores de pantalla mientras carga. */
  accessibilityLabel: string;
}

export function BootSplash({ done, onHidden, accessibilityLabel }: BootSplashProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  // Cuándo termina la entrada: no se oculta antes, para no cortarla.
  const introEnd = useRef(0);

  const logo = useSharedValue(reduceMotion ? 1 : 0);
  const line = useSharedValue(reduceMotion ? 1 : 0);
  const word = useSharedValue(reduceMotion ? 1 : 0);
  const container = useSharedValue(1);

  useEffect(() => {
    introEnd.current = Date.now() + (reduceMotion ? 0 : INTRO_MS);
    if (reduceMotion) return;
    const ease = Easing.out(Easing.cubic);
    logo.value = withTiming(1, { duration: 380, easing: ease });
    line.value = withDelay(220, withTiming(1, { duration: 480, easing: Easing.inOut(Easing.quad) }));
    word.value = withDelay(320, withTiming(1, { duration: 380, easing: ease }));
  }, [reduceMotion, logo, line, word]);

  useEffect(() => {
    if (!done) return;
    const wait = Math.max(0, introEnd.current - Date.now());
    const timer = setTimeout(() => {
      if (reduceMotion) {
        onHidden();
        return;
      }
      container.value = withTiming(0, { duration: EXIT_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onHidden);
      });
    }, wait);
    return () => clearTimeout(timer);
  }, [done, reduceMotion, container, onHidden]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ scale: 0.9 + 0.1 * logo.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: 10 * (1 - word.value) }],
  }));
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LOGO_TREND_LENGTH * (1 - line.value) }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: theme.bgBase }, containerStyle]}
      // El primer cuadro pintado reemplaza al splash nativo.
      onLayout={() => void SplashScreen.hideAsync().catch(() => {})}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.stack}>
        <Animated.View style={logoStyle}>
          <Svg viewBox="0 0 64 64" width={LOGO_SIZE} height={LOGO_SIZE}>
            <Rect x={0} y={0} width={64} height={64} rx={15} fill={theme.accent} />
            <Path d={LOGO_DOC_PATH} fill="#ffffff" />
            <Path d={LOGO_FOLD_PATH} fill={theme.accent} fillOpacity={0.24} />
            <AnimatedPath
              d={LOGO_TREND_PATH}
              fill="none"
              stroke={theme.accent}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={LOGO_TREND_LENGTH}
              animatedProps={lineProps}
            />
          </Svg>
        </Animated.View>
        <Animated.View style={wordStyle}>
          <Text style={[styles.wordmark, { color: theme.textPrimary }]}>
            log<Text style={{ color: theme.accent }}>day</Text>
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stack: {
    alignItems: 'center',
    gap: 18,
  },
  wordmark: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 30,
    letterSpacing: -0.9,
  },
});
