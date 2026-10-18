# Evidencia

Toda la evidencia de esta carpeta también está embebida en `docs/INFORME-QA-SpendWise.html`, que se puede abrir sin el resto del repositorio. Ningún archivo contiene contraseñas ni tokens: las peticiones se guardan con `[REDACTED]` y `<TOKEN>` en su lugar.

## Verificación final del 17-oct-2026 (`report/`)

| Ruta | Contenido |
|---|---|
| `report/api/BUG-XX.json` | Petición y respuesta HTTP reales de cada defecto de API, con fecha, rol, cuerpo enviado, código y cuerpo recibido. Las peticiones de preparación (inicio de sesión, datos) van marcadas como `setup`. |
| `report/api/BUG-XX.png` | Captura de esa evidencia HTTP con el resultado esperado frente al real. |
| `report/api/IMP-0X.json` | Peticiones y respuestas de las mejoras que se observan por API (IMP-01 a IMP-03); sus capturas están en `report/improvements/`. |
| `report/BUG-XX/` | Defectos de interfaz: video MP4 con puntero visible y pasos numerados, una captura por paso (`BUG-XX-01.png`…), la captura final con el defecto marcado (`BUG-XX-final.png`) y los metadatos (`BUG-XX.json`: rol, URL, pasos, esperado, real y hora). |
| `report/improvements/` | Capturas de las mejoras IMP-01 a IMP-08 con lo observado y por qué es mejora y no defecto. |
| `report/descartados/` | Evidencia de los hallazgos que se descartaron tras verificarlos (BUG-30, BUG-46, BUG-49 y E2E-06). |
| `report/full-run.json` | Resultado de la corrida completa del 17-oct: cada prueba, su estado y el defecto al que corresponde cada fallo. |

## Registros de ejecución

| Archivo | Campaña |
|---|---|
| `test-run-2026-10-16.txt` | Primera ejecución (10 casos) |
| `test-run-api-2026-10-16.txt` | Suite API inicial |
| `test-run-contract-integration-e2e-2026-10-16.txt` | Contrato, integración y E2E iniciales |
| `final-execution-summary-2026-10-16.txt` | Regresión integral de 119 pruebas |
| `test-run-expanded-2026-10-16.txt` | Regresión ampliada |
| `test-run-mutation-2026-10-16.txt`, `test-run-expanded-mutants-2026-10-16.txt` | Mutación de peticiones y expansión |
| `test-run-adversarial-rounds-2026-10-16.txt`, `role-access-qa-2026-10-16.md`, `contract-data-r4-2026-10-16.txt`, `functional-ui-2026-10-16.md` | Rondas adversariales 1 a 5 |
| `test-run-newman-2026-10-16.txt`, `test-run-newman-2026-10-17.txt` | Postman/Newman |

## Cómo regenerarla

Con las variables de `.env` configuradas:

```bash
npm run evidence:api     # report/api/*.json
npm run evidence:cards   # report/api/*.png y capturas de mejoras por API
npm run evidence:ui      # report/BUG-XX/ y report/improvements/
npm run report:qa        # informe HTML, E1 en Markdown y páginas de los documentos
```

Las capturas de API reproducen los defectos contra el entorno y crean datos con descripciones identificables. La captura de BUG-41 activa una regla Block durante unos segundos y la elimina al terminar.
