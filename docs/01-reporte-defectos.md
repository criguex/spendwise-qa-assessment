# E1 — Reporte de defectos

> Estado inicial. Incorporar únicamente hallazgos reproducidos y adjuntar evidencia sanitizada.

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
| BUG-11 | Acceso directo de Employee a Policy Engine no muestra access-denied | Anexo G, web-15 | Media | Media | Confirmado |

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
- Resultado esperado: 400 sin creación.
- Resultado obtenido: `-0.01` y `1.001` devuelven 201 y quedan `AutoApproved`.
- Impacto: permite valores financieros inválidos y contamina reportes, tablero y auditoría.
- Severidad / prioridad: Alta / Alta.
- Evidencia: `evidence/test-run-api-2026-10-16.txt`.

## BUG-03 — Longitudes inválidas de gastos producen HTTP 500

- Reglas: RN-04 y RN-06.
- Datos: descripción 501, proveedor 201 y notas 1001 caracteres.
- Esperado: 400 que nombre campo y límite.
- Obtenido: 500 con `An unexpected error occurred.` en los tres casos.
- Severidad / prioridad: Alta / Alta; entrada controlada por usuario provoca error interno y no ofrece corrección accionable.

## BUG-04 — Paginación inválida produce HTTP 500

- Regla: RN-06.
- Pasos: `GET /api/v1/expenses?page=0` con sesión válida.
- Esperado: 400 comprensible.
- Obtenido: 500. La automatización también cubre tamaño negativo y texto no numérico.
- Severidad / prioridad: Media / Alta.

## BUG-05 — El motor permite reglas con nombre vacío o límite negativo

- Regla: RN-32.
- Obtenido: ambos cuerpos devuelven 201 y crean reglas inactivas; las reglas se eliminaron después de capturar evidencia.
- Impacto: configuración sensible queda en un estado inválido que puede alterar decisiones si se activa.
- Severidad / prioridad: Alta / Alta.

## BUG-06 — Swagger no describe el contrato de seguridad y errores

- La especificación no define `components.securitySchemes`, no marca endpoints protegidos y solo declara respuestas exitosas genéricas sin esquema.
- Esperado: documentación suficiente para autenticar, validar respuestas y conocer 400/401/403/404.
- Severidad / prioridad: Media / Media; dificulta integración, automatización y uso seguro.

## BUG-07 — Identificadores incumplen GUID y categorías omiten icono

- Anexos C y D declaran GUID e icono de categoría.
- Login, gastos y categorías contienen identificadores no válidos según UUID; `GET /categories` no devuelve `icon`.
- Severidad / prioridad: Media / Media por ruptura de contrato y consumidores estrictos.

## BUG-08 — Se puede eliminar un gasto AutoApproved

- Reglas: RN-51, RN-52 y estados finales del Anexo F.
- Flujo: crear gasto de USD 10 → confirmar `AutoApproved` → `DELETE /expenses/{id}`.
- Esperado: error; gasto e historial se conservan.
- Obtenido: 204 y eliminación del recurso.
- Severidad / prioridad: Alta / Alta por pérdida de gasto decidido y su trazabilidad.

## BUG-09 — Login desde ruta protegida no regresa a la ruta original

- Abrir `/expenses` sin sesión redirige al login; después de autenticarse se abre `/dashboard`.
- Esperado: regresar a `/expenses`.
- Severidad / prioridad: Media / Media; rompe continuidad del flujo y enlaces compartidos.

## BUG-10 — Administrator ve una acción New expense no autorizada

- La API rechaza crear gastos como Administrator, pero Dashboard muestra el botón `New expense`.
- Esperado: la navegación solo ofrece opciones utilizables por el rol.
- Severidad / prioridad: Media / Media; contradicción de permisos y experiencia confusa.

## BUG-11 — Employee no recibe pantalla access-denied al abrir Policy Engine

- Con sesión Employee, navegar directamente a `/policies` lleva al login en vez de mostrar el componente `access-denied`.
- Esperado: pantalla de acceso denegado para respuesta 403.
- Severidad / prioridad: Media / Media.

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

