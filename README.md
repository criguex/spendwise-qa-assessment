# SpendWise — Evaluación QA

Paquete de trabajo para la prueba técnica de QA Analyst.

## Arquitectura y principios

La suite usa Playwright + TypeScript + Zod y separa responsabilidades:

- `HttpClient`: transporte, puerta del entorno y autenticación HTTP.
- Servicios de dominio: autenticación, gastos, aprobaciones y políticas.
- Builders: datos únicos y legibles por escenario.
- Contratos Zod: validación del comportamiento real en runtime.
- Page Objects y componentes: interacción E2E sin selectores duplicados.
- Especificaciones: solo orquestación y expectativas de negocio.

Esto aplica SOLID, especialmente responsabilidad única, inversión de dependencias mediante servicios inyectados y extensión por composición. Los Page Objects no contienen assertions de negocio ocultas ni lógica de creación de datos.

## Ejecución de la automatización

Requisitos: Node.js 20 o superior. No requiere instalar dependencias.

```bash
export SPENDWISE_PROXY_USER="..."
export SPENDWISE_PROXY_PASSWORD="..."
export SPENDWISE_SEED_PASSWORD="..."
npm install
npx playwright install chromium
npm test
npm run test:mutation
```

Las credenciales se reciben por variables de entorno y no se guardan en el repositorio ni en las evidencias. Los tokens y cookies se enmascaran en la salida.

## Estructura

- `docs/01-reporte-defectos.md`: hallazgos con evidencia y trazabilidad.
- `docs/01-reporte-defectos.html`: informe visual listo para entregar o imprimir.
- `docs/02-estrategia-plan.md`: estrategia basada en riesgos.
- `docs/03-casos-prueba.md`: diseño y priorización de casos.
- `docs/04-resumen-ejecutivo.md`: recomendación para negocio.
- `tests/api/`: positivos, negativos, límites y RBAC.
- `tests/contract/`: estructura OpenAPI y contratos de runtime.
- `tests/integration/`: flujos entre servicios y ciclo de vida.
- `tests/e2e/`: flujos de navegador con POM.
- `src/`: clientes, servicios, builders, contratos y Page Objects.
- `postman/`: colección Postman/Newman con validación de estructura, datos y comportamiento.
- `evidence/`: evidencias sanitizadas, sin secretos.
- `playwright-report/`: reporte HTML generado por la última ejecución integral.
- `openapi/spendwise-openapi.json`: contrato de la API suministrada por el entorno.
- `docs/06-observacion-no-funcional.md`: medición serial segura y límites de rendimiento.
- `docs/07-pruebas-mutantes.md`: operadores y mutation score de solicitudes black-box.
- `docs/08-informe-mutacion-ampliada.html`: BUG-22 a BUG-34 con cURL, videos, capturas y traces.
- `docs/09-oportunidades-mejora.md`: recomendaciones IMP-01 a IMP-08 separadas de los defectos.
- `docs/10-informe-adversarial.html`: dos rondas de autorización y manipulación de estados con evidencia.

## Resultado final verificado

- Playwright: 232 pruebas disponibles en 34 archivos. Las cinco rondas adversariales cubren autorización, estados, contrato/datos y recuperación UI; las tres últimas agregaron 74 verificaciones ejecutadas y 25 casos automatizados nuevos, y confirmaron BUG-37/38.
- Newman: 15 requests, 25 aserciones, 20 aprobadas y 5 fallidas por defectos confirmados.
- Hallazgos: 38 defectos confirmados y 8 oportunidades de mejora; las rondas adversariales agregaron BUG-35 a BUG-38.
- Recomendación: **NO GO condicionado**.

## Uso de IA

Se utilizó IA como apoyo para estructurar la estrategia, proponer técnicas de diseño, preparar una base de automatización y revisar claridad y trazabilidad. Cada resultado fue contrastado contra los anexos y el comportamiento observado; las decisiones, ejecuciones y conclusiones finales fueron revisadas por el candidato. No se incluyeron contraseñas ni tokens en los entregables.

