# E2 — Estrategia y plan de pruebas

## Objetivo

Evaluar mediante pruebas de aceptación de caja negra si SpendWise protege la identidad y los datos, aplica correctamente las reglas financieras y de autorización, conserva una auditoría confiable y comunica los errores de forma accionable.

## Priorización basada en riesgos

1. **Autorización e identidad (crítico):** una falla puede exponer gastos, permitir decisiones indebidas o atribuir acciones al usuario incorrecto.
2. **Motor de políticas y límites monetarios (crítico):** errores en 25, 49.99 y 50 USD cambian aceptación y estado del gasto.
3. **Integridad del ciclo de vida y auditoría (alto):** estados finales, doble decisión, autoaprobación y borrado deben ser consistentes e inmutables.
4. **Validación y recibos (alto):** entradas inválidas no deben crear datos ni producir 5xx; el recibo debe ser real y estar asociado.
5. **Reportes, tablero y CSV (alto):** riesgo de totales incorrectos, fuga por alcance o fórmula ejecutable en una hoja de cálculo.
6. **Usabilidad, accesibilidad y recuperación ante errores (medio):** mensajes claros, conservación de datos y operación por teclado.

## Enfoque

- API: contrato, validación, particiones, valores límite, autorización, transiciones de estado y respuestas negativas.
- Interfaz web: flujos críticos, navegación por rol, mensajes, persistencia del formulario, accesibilidad básica y cierre de sesión.
- Datos: identificadores únicos y descripciones con marca temporal; cada prueba automatizada inicia sesión y crea únicamente sus propios datos cuando lo necesita.
- Exploración dirigida: sesiones cortas por riesgo con registro de evidencia y de preguntas abiertas.

## Modelo de cobertura

Se utiliza una pirámide adaptada a caja negra:

| Capa | Objetivo | Ejemplos | Frecuencia |
|---|---|---|---|
| Componentes | Verificar builders y esquemas de consumidor sin red | datos únicos, inmutabilidad, rechazo de contratos inválidos | Cada cambio |
| Contrato | Detectar divergencias entre OpenAPI, anexos y runtime | rutas, seguridad, códigos, GUID, campos obligatorios | Cada cambio de API |
| API funcional | Reglas y validación con feedback rápido | autenticación, límites, particiones, RBAC | Cada commit autorizado |
| Integración | Consistencia entre servicios y estados | crear-detalle-historial, visibilidad entre roles, borrado | Diario / release |
| E2E | Riesgos que dependen del navegador | login, retorno a ruta, navegación por rol, logout | Smoke y release |

La mayor cobertura vive bajo la interfaz; E2E se reserva para flujos que requieren cookie httpOnly, navegación o presentación del error. Esto reduce fragilidad y tiempo sin sacrificar confianza.

## Técnicas de diseño

- Particiones equivalentes: credencial válida, inválida, inactiva y desconocida; roles autorizados y no autorizados.
- Valores límite: 0, 0.01, 24.99, 25, 49.99, 50; máximos y máximo + 1 en textos.
- Transición de estados: registro a AutoApproved/PendingApproval/Rejected y estados finales.
- Tabla de decisión: acción de política, monto, recibo, rol y relación jerárquica.
- Pruebas negativas: cuerpos incompletos, UUID inexistente, paginación inválida, acción inválida y doble decisión.
- Pairwise dirigido: combinaciones de rol, propiedad, visibilidad y operación, conservando exhaustividad en permisos críticos.

## Matriz de trazabilidad resumida

| Riesgo / reglas | Cobertura automatizada |
|---|---|
| RN-01, RN-02, RN-04, RN-06 | `expenses-boundaries.spec.ts` |
| RN-30, RN-31 | `expense-lifecycle.spec.ts` |
| RN-32 | `policies.spec.ts` |
| RN-50, RN-51, RN-52 | integración create/detail/history/delete |
| Anexo G: autenticación | `auth.spec.ts`, `authentication.spec.ts` |
| Anexo G: RBAC/visibilidad | `rbac.spec.ts`, integración y navegación E2E |
| Contrato y estructura | `openapi-structure.spec.ts`, `runtime-contracts.spec.ts` |

## Arquitectura de automatización

- SOLID: transporte, dominio, datos, contratos y UI tienen responsabilidades separadas.
- POM por composición: `AppPage` usa componentes de navegación y usuario; los selectores se centralizan.
- Fixtures inyectan servicios y administran el ciclo de vida del cliente.
- Builders producen descripciones únicas y permiten declarar datos hostiles de forma explícita.
- Assertions permanecen en las especificaciones, salvo expectativas de presentación propias de un componente visual.
- No hay `waitForTimeout`, dependencias de orden ni credenciales embebidas.

## Estrategia de datos y limpieza

- Cada creación usa identificador temporal/UUID y una cuenta adecuada al escenario.
- Las pruebas que modifican políticas deben crearlas inactivas y eliminarlas en `finally`; una prueba que impida cleanup se registra y se corrige manualmente por ID exacto.
- No se intentan borrar gastos finales como cleanup, porque esa operación forma parte de lo que se valida.
- Evidencias y reportes excluyen `Authorization`, cookies, contraseña y archivos sensibles.

## CI y controles de calidad

- `typecheck` y componentes se pueden ejecutar en cada push sin secretos.
- Las suites contra el entorno son manuales mediante GitHub Environment y secretos protegidos.
- Un solo worker para integración/E2E evita interferencia en configuración compartida.
- Reintento máximo de uno solo en CI y conservación de trace/video únicamente al fallar.
- Los artefactos tienen retención corta; antes de entregar se usan evidencias sanitizadas, no trazas crudas.

## Gestión de defectos

Un fallo automatizado no se convierte automáticamente en defecto. Se revisa el requisito, se descarta problema de datos o selector, se reproduce, se sanitiza evidencia y se agrupan síntomas con la misma causa probable para evitar duplicados. Severidad refleja impacto; prioridad refleja urgencia de corrección.

## Criterios de entrada

- Aplicación y API disponibles mediante el acceso asignado.
- Swagger accesible y cuentas del Anexo G operativas.
- Reglas iniciales del motor verificadas antes de los escenarios monetarios.

## Criterios de salida

- Riesgos críticos cubiertos y al menos 15 casos diseñados / 8 automatizados ejecutados.
- Hallazgos reproducidos, sin duplicados y con evidencia sanitizada.
- Sin defectos críticos abiertos para recomendar liberación; todo bloqueo o cobertura pendiente queda declarado.

## Fuera de alcance

Rendimiento, carga, DoS, acceso a otros entornos, ingeniería social y las funciones excluidas expresamente en el Anexo A. La extracción asistida de recibos se considera opcional y se probará como máximo con pocos archivos pequeños.

## Supuestos y limitaciones

- Caja negra, sin código fuente ni observabilidad interna.
- Entorno exclusivo pero efímero; la evidencia relevante se conserva localmente.
- La sesión expira en 60 minutos; la automatización obtiene una sesión nueva por escenario lógico.
- El enunciado excluye expresamente rendimiento y carga. No se ejecutaron concurrencia, estrés, volumen ni endurance. Solo se registró una observación serial de una llamada por endpoint crítico, sin SLA ni conclusión estadística, en `docs/06-observacion-no-funcional.md`.

