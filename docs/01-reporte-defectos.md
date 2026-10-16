# E1 — Reporte de defectos

> Estado final verificado el 16 de octubre de 2026. Evidencia seleccionada y sanitizada; no
> contiene contraseñas ni tokens.

| ID | Título | Regla | Severidad | Prioridad | Estado |
|---|---|---|---|---|---|
| BUG-01 | La API crea gastos con monto igual a cero | RN-02, RN-06 | Alta | Alta | Confirmado |
| BUG-02 | La API acepta montos negativos y con más de dos decimales | RN-02 | Alta | Alta | Confirmado |
| BUG-03 | Longitudes inválidas de gastos producen HTTP 500 | RN-04, RN-06 | Alta | Alta | Confirmado |
| BUG-04 | Paginación inválida produce HTTP 500 | RN-06 | Media | Alta | Confirmado |
| BUG-05 | El motor permite reglas con nombre vacío o límite negativo | RN-32 | Alta | Alta | Confirmado |
| BUG-06 | Swagger omite seguridad, respuestas negativas y esquemas de respuesta | Documentación API | Media | Media | Confirmado |
| BUG-07 | Identificadores de usuarios/categorías no cumplen GUID y categoría omite icono | Anexos C y D | Media | Media | Confirmado |
| BUG-08 | Se puede eliminar un gasto AutoApproved | RN-51, RN-52; Anexo F | Alta | Alta | Confirmado |
| BUG-09 | Login desde ruta protegida no regresa a la ruta original | Anexo G, web-10 | Media | Media | Confirmado |
| BUG-10 | Administrator ve acción New expense que no puede utilizar | Anexo G, web-14 | Media | Media | Confirmado |

## BUG-01 — La API crea gastos con monto igual a cero

- Regla / requisito: RN-02 exige monto mayor que cero; RN-06 exige 400 para entradas fuera de rango.
- Ambiente: API del entorno exclusivo, versión observada el 16 de octubre de 2026.
- Rol y usuario: Employee, `employee3@spendwise.test`.
- Precondiciones: puerta del entorno superada; sesión válida del usuario.
- Pasos:
  1. Iniciar sesión mediante `POST /api/v1/auth/login`.
  2. Ejecutar `POST /api/v1/expenses` con una descripción única, fecha actual y `amount: 0`.
- Resultado esperado: HTTP 400, mensaje de validación que identifique `amount` y ningún gasto creado.
- Resultado obtenido: HTTP 201; el gasto se crea.
- Severidad: **Alta**. Permite persistir transacciones económicamente inválidas y afecta listados, métricas, auditoría y calidad contable.
- Prioridad: **Alta**. La validación debe corregirse antes de producción y cubrirse en API y UI.
- Reproducibilidad: 2/2; debe reconfirmarse después de una corrección.
- Evidencia: `evidence/BUG-01-api-response.txt` y `evidence/test-run-2026-10-16.txt`.
- Notas: la prueba usa una descripción con marca temporal y no envía propietario, estado ni número.

## BUG-02 — La API acepta montos negativos y con más de dos decimales

- Regla: RN-02.
- Ambiente: API del entorno exclusivo.
- Rol y usuario: Employee, `employee3@spendwise.test`.
- Precondiciones: sesión válida y payload base con descripción/fecha únicas.
- Pasos: crear un gasto con `amount: -0.01`; repetir con `amount: 1.001`.
- Resultado esperado: 400 sin creación.
- Resultado obtenido: `-0.01` y `1.001` devuelven 201 y quedan `AutoApproved`.
- Impacto: permite valores financieros inválidos y contamina reportes, tablero y auditoría.
- Severidad / prioridad: Alta / Alta, por corrupción de información financiera antes de producción.
- Reproducibilidad: 2/2 por partición.
- Evidencia: `evidence/test-run-api-2026-10-16.txt`.

## BUG-03 — Longitudes inválidas de gastos producen HTTP 500

- Reglas: RN-04 y RN-06.
- Rol y usuario: Employee, `employee2@spendwise.test`.
- Precondiciones: sesión válida; variar un solo campo en cada solicitud.
- Datos: descripción 501, proveedor 201 y notas 1001 caracteres.
- Pasos: enviar tres `POST /api/v1/expenses`, uno por cada campo sobre su máximo.
- Esperado: 400 que nombre campo y límite.
- Obtenido: 500 con `An unexpected error occurred.` en los tres casos.
- Severidad / prioridad: Alta / Alta; entrada controlada por usuario provoca error interno y no ofrece corrección accionable.
- Reproducibilidad: 3/3.
- Evidencia: reporte Playwright y `evidence/test-run-api-2026-10-16.txt`.

## BUG-04 — Paginación inválida produce HTTP 500

- Regla: RN-06.
- Rol y usuario: Employee, `employee1@spendwise.test`.
- Precondiciones: sesión válida.
- Pasos: `GET /api/v1/expenses?page=0` con sesión válida.
- Esperado: 400 comprensible.
- Obtenido: 500. La automatización también cubre tamaño negativo y texto no numérico.
- Severidad / prioridad: Media / Alta; un error del cliente se contabiliza como indisponibilidad del servidor.
- Reproducibilidad: confirmada en regresión final.
- Evidencia: reporte Playwright y `evidence/test-run-api-2026-10-16.txt`.

## BUG-05 — El motor permite reglas con nombre vacío o límite negativo

- Regla: RN-32.
- Ambiente: API del entorno exclusivo.
- Rol y usuario: Administrator, `admin@spendwise.test`.
- Precondiciones: sesión de administrador; reglas nuevas creadas inactivas para limitar el impacto.
- Pasos: crear una regla con nombre vacío y otra con `maxAmount: -1`.
- Obtenido: ambos cuerpos devuelven 201 y crean reglas inactivas; las reglas se eliminaron después de capturar evidencia.
- Esperado: 400 y ninguna regla persistida.
- Impacto: configuración sensible queda en un estado inválido que puede alterar decisiones si se activa.
- Severidad / prioridad: Alta / Alta.
- Reproducibilidad: 2/2; limpieza realizada por ID exacto.
- Evidencia: reporte Playwright y `evidence/test-run-api-2026-10-16.txt`.

## BUG-06 — Swagger no describe el contrato de seguridad y errores

- Rol/usuario: no aplica; análisis estático del OpenAPI descargado del entorno asignado.
- Pasos: inspeccionar `components.securitySchemes`, seguridad por operación, respuestas negativas y esquemas.
- La especificación no define `components.securitySchemes`, no marca endpoints protegidos y solo declara respuestas exitosas genéricas sin esquema.
- Esperado: documentación suficiente para autenticar, validar respuestas y conocer 400/401/403/404.
- Severidad / prioridad: Media / Media; dificulta integración, automatización y uso seguro.
- Reproducibilidad: determinista sobre `openapi/spendwise-openapi.json`.
- Evidencia: `CON-03` en el reporte Playwright.

## BUG-07 — Identificadores incumplen GUID y categorías omiten icono

- Anexos C y D declaran GUID e icono de categoría.
- Rol y usuario: Employee, `employee1@spendwise.test`.
- Pasos: autenticar; consultar gastos y categorías; validar respuestas con esquemas de consumidor Zod.
- Login, gastos y categorías contienen identificadores no válidos según UUID; `GET /categories` no devuelve `icon`.
- Esperado: GUID/UUID válidos y propiedad `icon` en cada categoría.
- Severidad / prioridad: Media / Media por ruptura de contrato y consumidores estrictos.
- Reproducibilidad: confirmada por `CON-04`, `CON-05` y `CON-06`.
- Evidencia: reporte Playwright y `evidence/test-run-contract-integration-e2e-2026-10-16.txt`.

## BUG-08 — Se puede eliminar un gasto AutoApproved

- Reglas: RN-51, RN-52 y estados finales del Anexo F.
- Rol y usuario: Employee, `employee2@spendwise.test`.
- Precondiciones: sesión válida y gasto único creado por la propia prueba.
- Flujo: crear gasto de USD 10 → confirmar `AutoApproved` → `DELETE /expenses/{id}`.
- Esperado: error; gasto e historial se conservan.
- Obtenido: 204 y eliminación del recurso.
- Severidad / prioridad: Alta / Alta por pérdida de gasto decidido y su trazabilidad.
- Reproducibilidad: confirmada en regresión final mediante `INT-03`.
- Evidencia: reporte Playwright y `evidence/test-run-contract-integration-e2e-2026-10-16.txt`.

## BUG-09 — Login desde ruta protegida no regresa a la ruta original

- Rol y usuario: Employee, `employee2@spendwise.test`.
- Abrir `/expenses` sin sesión redirige al login; después de autenticarse se abre `/dashboard`.
- Esperado: regresar a `/expenses`.
- Resultado obtenido: Dashboard visible y URL `/dashboard`.
- Severidad / prioridad: Media / Media; rompe continuidad del flujo y enlaces compartidos.
- Reproducibilidad: confirmada por `E2E-03`.
- Evidencia: `evidence/selected/BUG-09/` contiene PNG y MP4 seleccionados.

## BUG-10 — Administrator ve una acción New expense no autorizada

- Rol y usuario: Administrator, `admin@spendwise.test`.
- Precondición: sesión válida de administrador.
- La API rechaza crear gastos como Administrator, pero Dashboard muestra el botón `New expense`.
- Esperado: la navegación solo ofrece opciones utilizables por el rol.
- Resultado obtenido: enlace lateral y botón `New expense` visibles.
- Severidad / prioridad: Media / Media; contradicción de permisos y experiencia confusa.
- Reproducibilidad: confirmada por `E2E-07`.
- Evidencia: `evidence/selected/BUG-10/` contiene PNG y MP4 seleccionados.

## Control descartado — E2E-06 acceso directo de Employee a Policy Engine

La revisión cuadro por cuadro demostró que la aplicación sí presenta “You don't have access to
this page”. El fallo original provenía de navegar antes de que la sesión terminara de establecerse
y de buscar un `data-testid` no exigido por el requisito. Se corrigió la sincronización y el locator;
el caso pasa. Se conserva evidencia en `evidence/selected/E2E-06-ACCESS-DENIED-PASS/` para demostrar
la depuración y evitar reportar un falso positivo.

## Plantilla de hallazgo

### BUG-XX — Título orientado al impacto

- Regla / requisito:
- Ambiente:
- Rol y usuario:
- Precondiciones:
- Pasos:
  1. 
- Resultado esperado:
- Resultado obtenido:
- Severidad y justificación:
- Prioridad y justificación:
- Reproducibilidad:
- Evidencia:
- Notas / alcance:

