import { ScrollText } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';

import { useSync } from '../settings/SyncContext';
import { useTheme } from '../theme/ThemeContext';

// Gate bloqueante de consentimiento — montado una vez en
// app/_layout.tsx, se activa solo cuando policyGate (SyncContext) no
// es null (login/refresh trajeron una policy_version que el usuario
// todavía no aceptó). Ver specs/cumplimiento-datos-personales/
// (task-manager) "Consentimiento general obligatorio": nunca un
// checkbox premarcado, nunca "seguir usando implica aceptar" — el
// botón "Acepto" arranca deshabilitado hasta hacer scroll al final.
export function PolicyGateModal() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { policyGate, acceptPolicyGate, rejectPolicyGate } = useSync();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [accepting, setAccepting] = useState(false);

  if (!policyGate) return null;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 8) setScrolledToEnd(true);
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      await acceptPolicyGate();
    } finally {
      setAccepting(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.panel, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}>
          <View style={styles.header}>
            <ScrollText size={16} color={theme.accentInk} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('sync.policyGateTitle')}</Text>
          </View>

          <ScrollView
            style={styles.textScroll}
            onScroll={handleScroll}
            scrollEventThrottle={100}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>{policyGate.text}</Text>
          </ScrollView>

          {!scrolledToEnd && (
            <Text style={[styles.hint, { color: theme.textHint }]}>{t('sync.policyGateScrollHint')}</Text>
          )}

          <View style={styles.footer}>
            <Pressable style={styles.rejectButton} onPress={() => void rejectPolicyGate()}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>
                {t('sync.policyGateReject')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.acceptButton, { backgroundColor: theme.accentStrong, opacity: scrolledToEnd && !accepting ? 1 : 0.4 }]}
              onPress={() => void handleAccept()}
              disabled={!scrolledToEnd || accepting}
            >
              <Text style={styles.acceptButtonText}>{t('sync.policyGateAccept')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  textScroll: {
    maxHeight: 320,
  },
  hint: {
    fontSize: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  rejectButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  acceptButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
