import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '../theme/ThemeContext';

interface LogoMarkProps {
  size?: number;
}

// Puerto exacto del ícono SVG del sidebar de desktop
// (`task-manager/src/components/sidebar/Sidebar.tsx`, línea ~502):
// cuadrado redondeado color de acento + documento blanco + esquina
// doblada + línea de tendencia, todo en `var(--accent)`. Antes mobile
// usaba una imagen PNG fija (`assets/logo-mark.png`) — mismos colores
// siempre, sin importar el tema activo. Un SVG con el color tomado de
// `theme.accent` en vez de un archivo de imagen es lo que lo hace
// adaptable: cambia solo con re-renderizar, no hace falta un asset
// distinto por tema (y ahora hay 8, no 2) — ver
// specs/temas-adicionales/design.md.
export function LogoMark({ size = 24 }: LogoMarkProps) {
  const theme = useTheme();
  return (
    <Svg viewBox="0 0 64 64" width={size} height={size}>
      <Rect x={0} y={0} width={64} height={64} rx={15} fill={theme.accent} />
      <Path d="M19 13.5h19L47 21.5V48.5a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V15.5a2 2 0 0 1 2-2z" fill="#ffffff" />
      <Path d="M38 13.5L47 21.5h-9z" fill={theme.accent} fillOpacity={0.24} />
      <Path
        d="M20 36h4l3-8.5 4.5 13L44 25"
        fill="none"
        stroke={theme.accent}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
