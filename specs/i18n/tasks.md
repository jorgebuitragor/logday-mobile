# i18n — Tareas

Estado: implementado, pendiente de confirmación en vivo.

- [x] Decidir idiomas y librería: **es (default) + en, i18next +
      react-i18next + expo-localization**.
      Satisface: "Idiomas y librería" en `requirements.md`.
- [x] `src/i18n/index.ts` + `src/i18n/locales/{es,en}.json`.
- [x] Migrar las mismas pantallas que `temas/` a `t('...')`, sin
      literales inline nuevos.
      Satisface: "Cobertura" en `requirements.md`.
- [x] Selector manual (`setLanguagePreference`) + persistencia en
      AsyncStorage, consumido en el tab de Ajustes. Ver "Selector
      manual y persistencia" en `design.md`.
- [x] `npx tsc --noEmit` sin errores.
- [x] **Bug encontrado en vivo** (usuario, idioma en español, tab bar
      mostraba "Tasks/Notes/Overtime" en inglés): el diccionario `es`
      tenía esas claves literalmente en inglés. Corregido copiando el
      vocabulario real de `task-manager/src/lib/i18n.ts` (Tareas/
      Notas/Extras; "Dailys" se queda igual en ambos idiomas). Ver
      "Vocabulario: copiado de `task-manager`" en `design.md`. También
      corrige la afirmación falsa en `requirements.md` de que ningún
      cliente de Logday tenía i18n — `task-manager` sí tiene una
      implementación propia.
- [ ] Verificar en vivo en el dispositivo Android del usuario: los
      textos se ven en español (default) sin literales en inglés
      colados (salvo los valores de `status`, ver "Explícitamente
      pendiente" en `design.md`).
