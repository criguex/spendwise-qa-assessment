# QA de permisos SpendWise — 2026-10-16

## Alcance y método

Comprobación API de solo lectura con las ocho cuentas de prueba configuradas en `.env`. Se consultaron gastos, dashboard, reportes, políticas, cola de aprobación y categorías. La prueba repetible está en `tests/api/role-access-readonly.spec.ts`; no imprime identidades, respuestas de negocio, tokens ni cookies.

La matriz se derivó de las reglas de Anexo G citadas por los casos/evidencias presentes en el proyecto. No se encontró una copia del anexo original en la carpeta del proyecto ni entre los archivos de Downloads con nombre SpendWise; por ello, la trazabilidad disponible es indirecta.

## Resultado confirmado

`RBAC-RO-01`: 1 prueba pasó; 48 respuestas HTTP coincidieron con la matriz esperada.

| Cuenta de prueba | Gastos | Dashboard | Reportes | Políticas | Aprobaciones | Categorías |
|---|---:|---:|---:|---:|---:|---:|
| Employee (4 cuentas) | 200 | 200 | 200 | 403 | 403 | 200 |
| Manager (2 cuentas) | 200 | 200 | 200 | 403 | 200 | 200 |
| FinanceController | 200 | 200 | 200 | 200 | 200 | 200 |
| Administrator | 200 | 200 | 200 | 200 | 403 | 200 |

Comprobación API en serie de escritura denegada: 2/2 pruebas pasaron. Finance no puede crear reglas y Administrator no puede crear gastos (403). El test de lectura no crea, edita ni elimina datos.

Comando reproducible para la matriz de lectura:

```bash
npm test -- --project=api tests/api/role-access-readonly.spec.ts --workers=1 --reporter=line --trace=off
```

## Falsos positivos / limitaciones

- En una ejecución anterior del subset existente, 21 aserciones pasaron. Cuatro casos se reportaron como fallidos únicamente durante `dispose()` por `ENOENT` de archivos temporales de Playwright en `test-results/artifacts`; las aserciones de autorización de esos casos aparecen aprobadas antes del error. La matriz nueva, en ejecución serial y sin trazas, pasó limpiamente.
- R2-AUTH-07 (Administrator puede leer gastos globalmente) y R2-AUTH-09 (Finance hereda capacidad Employee para crear gastos propios) están documentados como falsos positivos descartados en la sección 7 del informe de QA.
- La prueba nueva confirma acceso al recurso y matriz por rol, pero no inspecciona contenido de gastos. Los controles de propietario/alcance de filas quedan cubiertos por las pruebas existentes R2-AUTH-01..06 y R2-AUTH-10..11; esas pruebas crean datos controlados y no se ejecutaron en esta revisión no destructiva.

