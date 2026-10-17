# Evidencia funcional de interfaz — 2026-10-16

## UI-02 — Error de envío no comunicado

Regla en `docs/03-casos-prueba.md`: ante un error al enviar un gasto, la interfaz conserva los valores y muestra un mensaje visible.

Escenario repetible: `tests/e2e/ui-functional-recovery.spec.ts` inicia sesión como Employee, completa un gasto de prueba de USD 12.34 y sustituye la respuesta del `POST /api/v1/expenses` por HTTP 500 con un mensaje de fallo simulado. La solicitud se intercepta en el navegador; no se crea ningún gasto.

Resultado: **2/2 reproducciones**. Descripción, proveedor y monto permanecen en el formulario, pero no aparece ningún mensaje visible de error. La aserción del mensaje falla en ambas ejecuciones.

Evidencia visual generada por Playwright:

- `test-results/artifacts/ui-functional-recovery-Fun-51094-nd-preserves-entered-values-e2e/test-failed-1.png`
- `test-results/artifacts/ui-functional-recovery-Fun-51094-nd-preserves-entered-values-e2e-repeat1/test-failed-1.png`

Comando:

```bash
npm test -- --project=e2e tests/e2e/ui-functional-recovery.spec.ts --grep 'UI-02' --repeat-each=2 --workers=1 --reporter=line --trace=off
```

La prueba de Forward añadida en el mismo archivo pasó en su ejecución inicial. No se detectó contradicción en ese recorrido.
