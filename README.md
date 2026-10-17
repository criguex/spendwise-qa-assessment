# SpendWise — Prueba técnica de QA

Evaluación de aceptación de caja negra de SpendWise (aplicación web y API) frente a los Anexos A–H del enunciado.

Empiece por `00-INDICE.html`.

## Entregables

| Entregable | Documento |
|---|---|
| E1 · Reporte de defectos | `docs/INFORME-QA-SpendWise.html` (un solo archivo con la evidencia embebida) y `docs/01-reporte-defectos.md` |
| E2 · Estrategia y plan | `docs/02-estrategia-plan.md` / `.html` |
| E3 · Casos y automatización | `docs/03-casos-prueba.md` / `.html`, código en `tests/` y `postman/` |
| E4 · Resumen ejecutivo | `docs/04-resumen-ejecutivo.md` / `.html` |
| Complementos | `docs/06` observación no funcional, `docs/07` mutación de peticiones, `docs/09` oportunidades de mejora |

## Resultado

- 39 defectos confirmados: 17 de severidad alta, 21 media y 1 baja. Todos se re-ejecutaron el 17-oct-2026 y siguen ocurriendo.
- Recomendación: **no liberar** hasta corregir y re-verificar los defectos de severidad alta.
- 238 pruebas automatizadas en 36 archivos (Playwright) y una colección Postman/Newman de 15 peticiones y 25 aserciones.

## Cómo ejecutar

Requisitos: Node.js 20 o superior.

```bash
npm ci
npx playwright install chromium
cp .env.example .env   # completar con los datos del entorno asignado
```

Variables de `.env` (las credenciales se entregan por canal aparte y nunca se guardan en el repositorio):

| Variable | Uso |
|---|---|
| `SPENDWISE_WEB_URL`, `SPENDWISE_API_URL` | Direcciones del entorno asignado |
| `SPENDWISE_PROXY_USER`, `SPENDWISE_PROXY_PASSWORD` | Puerta de acceso del entorno |
| `SPENDWISE_SEED_PASSWORD` | Contraseña común de las cuentas del Anexo G |

| Comando | Qué ejecuta |
|---|---|
| `npm test` | Suite completa (componentes, contrato, API, integración y E2E) |
| `npm run test:api` · `test:contract` · `test:integration` · `test:e2e` · `test:component` | Un nivel de la pirámide |
| `npm run test:smoke` · `test:negative` · `test:boundary` | Por etiqueta |
| `npm run test:policy` | Reglas del motor: recibo desde USD 25 y umbral de USD 50 |
| `npm run test:mutation` · `test:adversarial` · `test:adversarial:extended` | Campañas de mutación y adversariales |
| `npm run test:postman` | Colección Postman con Newman |
| `npm run typecheck` | Verificación de tipos |
| `npm run evidence:api` | Re-ejecuta los defectos de API y guarda petición/respuesta saneadas en `evidence/report/api/` |
| `npm run evidence:ui` | Graba video y capturas de los defectos de interfaz en `evidence/report/BUG-XX/` |
| `npm run report:qa` | Genera el informe HTML, el E1 en Markdown y las páginas de cada documento |

Las pruebas crean sus propios datos con descripciones únicas, no dependen del orden de ejecución y las reglas de política de prueba se crean inactivas y se eliminan al terminar. Las pruebas que hoy fallan lo hacen por defectos reportados: la suite conserva el resultado esperado del anexo y no se adaptó al comportamiento del producto.

## Arquitectura de la automatización

Playwright + TypeScript + Zod, con responsabilidades separadas:

- `src/api/`: `HttpClient` (transporte, puerta del entorno, autenticación) y servicios de dominio (gastos, aprobaciones, políticas, reportes, recibos).
- `src/data/`: builders con datos únicos y catálogos de mutantes.
- `src/contracts/`: esquemas de consumidor Zod.
- `src/pages/`: Page Objects y componentes para E2E.
- `tests/`: especificaciones por nivel; las aserciones de negocio viven en las pruebas, no en los Page Objects.

## Evidencia y seguridad

- `evidence/report/`: verificación final del 17-oct (petición y respuesta HTTP por defecto de API; video, capturas y metadatos por defecto de interfaz).
- `evidence/selected/`: corridas del 16-oct con trazas de Playwright. Las trazas se sanearon con `npm run evidence:sanitize` (contraseñas, cabeceras Authorization, cookies y tokens reemplazados por `[REDACTED]`).
- `evidence/*.txt`: registros de cada campaña de ejecución.
- La entrega no contiene contraseñas ni tokens.

## Uso de IA

Se usaron asistentes de IA de programación (Codex y Claude Code) como apoyo:

- **Para qué:** proponer la estructura de la estrategia y de los casos, generar la base de la automatización (servicios, builders, Page Objects y pruebas), ejecutar campañas de mutación y adversariales, redactar fichas de defectos y generar el informe HTML.
- **Con qué instrucciones:** evaluar contra los anexos del enunciado, reproducir cada hallazgo al menos dos veces antes de reportarlo, no adaptar las pruebas al comportamiento del producto, no incluir secretos en la evidencia y no hacer carga ni pruebas fuera del entorno asignado.
- **Qué se conservó y qué se corrigió:** se conservaron los hallazgos que se reprodujeron en el entorno. Se descartaron o corrigieron los que no resistieron la verificación: E2E-06 y BUG-30 eran falsos positivos; el alcance de BUG-06 y BUG-07 se ajustó tras revisar el OpenAPI; BUG-18 se reclasificó al medir el motor (aprueba USD 50); la verificación final y la corrida completa encontraron BUG-39 y BUG-40 y se agregaron sus pruebas. Las trazas se sanearon antes de entregar.

Todo lo entregado puede ejecutarse y explicarse con los comandos de este archivo.
