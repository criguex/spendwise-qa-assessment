# E3 — Casos de prueba

Los 26 casos base se diseñaron antes de ejecutar, priorizados por riesgo (P0 = bloquea la salida). La columna "Automatizado en" indica la prueba que lo ejecuta; los resultados están en el informe de QA.

| ID | Prioridad | Técnica | Caso / resultado esperado | Automatizado en | Resultado |
|---|---:|---|---|---|---|
| AUTH-01 | P0 | Camino feliz | Login válido devuelve token, expiración e identidad correcta | `AUTH-01`, `E2E-01` | Pasa |
| AUTH-02 | P0 | Partición inválida | Usuario inexistente devuelve 401 indistinguible de contraseña incorrecta | `AUTH-02` | Pasa |
| AUTH-03 | P0 | Partición / seguridad | Usuario inactivo devuelve el mismo 401 `invalid_credentials` | `AUTH-03` | Pasa |
| AUTH-04 | P1 | Campos obligatorios | Login con campos vacíos devuelve 400 | `AUTH-04` | Pasa |
| AUTH-05 | P1 | Transición / seguridad | Quinto intento fallido bloquea la cuenta 15 min; un acierto antes del quinto reinicia el contador | Manual con una sola cuenta (nomanager), fuera de la suite para no bloquear cuentas compartidas | Pasa en API; la web no muestra el estado bloqueado: BUG-46 |
| SEC-01 | P0 | Autorización negativa | Endpoint protegido sin sesión devuelve 401 | `SEC-01`, `AUTHX` | Pasa |
| CAT-01 | P2 | Catálogo / orden | Nueve categorías ordenadas por nombre, con ícono | `CAT-01`, `CON-06` | Falla: BUG-07 |
| RBAC-A | P0 | Matriz de permisos | Employee y Manager no leen políticas: 403 | `RBAC-01`, `RBAC-02` | Pasa |
| RBAC-B | P0 | Matriz de permisos | Administrator no registra gastos: 403 | `RBAC-04` | Pasa |
| RBAC-C | P0 | Alcance indirecto | Un gerente no ve gastos de quien no le reporta: 404 | `INT-02`, `R2-AUTH-04`, `RBAC-RO-01` | Pasa |
| RBAC-D | P0 | Regla especial | Nadie aprueba ni rechaza su propio gasto: 403 | `R2-FLOW-03` | Pasa |
| VAL-01 | P0 | Valor límite | Monto 0 se rechaza con 400 | `VAL-01` | Falla: BUG-01 |
| VAL-02 | P0 | Valores límite | -0,01 y 1,001 se rechazan; 0,01 se acepta | `VAL-02`, `VAL-03` | Falla: BUG-02 |
| POL-01 | P0 | Configuración base | Finance ve las dos reglas iniciales | `POL-01` | Pasa |
| POL-RCPT | P0 | Límites 24,99 / 25 | 24,99 sin recibo se acepta; 25 y 80 sin recibo se rechazan | `RCPT-01`, `RCPT-02`, `RCPT-03` | Falla: BUG-39 |
| POL-THR | P0 | Límites 49,99 / 50 | 49,99 con recibo queda AutoApproved; 50 queda PendingApproval | `THR-01`, `THR-02` | Falla: BUG-18 |
| LIFE-01 | P0 | Transición de estados | Rechazar exige motivo no vacío | `MUT-APR-02`, `MUT-APR-03` | Falla: BUG-29 |
| LIFE-02 | P0 | Estado final | Una segunda decisión falla y no agrega historial | `R2-FLOW-01`, `R2-FLOW-02` | Falla: BUG-35, BUG-36 |
| AUD-01 | P0 | Integridad / auditoría | Cada transición agrega un evento con actor y estados | `INT-01` | Pasa |
| DEL-01 | P1 | Estado / propiedad | Solo el dueño elimina un gasto pendiente | `INT-03`, `R2-AUTH-03`, `R2-AUTH-06` | Falla: BUG-08 |
| REP-01 | P1 | Alcance / cálculo | Reportes excluyen rechazados según el alcance del rol | `INT-ANA-01..03`, `ANA` | Falla: BUG-12 |
| CSV-01 | P0 | Robustez / seguridad | CSV neutraliza textos que empiezan por `=`, `+`, `-` o `@` | `E2E-M12` | Falla: BUG-13 |
| UI-01 | P1 | Accesibilidad | Login, menú y acceso denegado tienen nombres y `data-testid` | `E2E-A11`, `EXPUI-05/06`, `MUT-UI` | Falla: BUG-21, 31, 32 |
| UI-02 | P1 | Recuperación | Un envío fallido conserva el formulario y muestra un mensaje | `UI-02` | Falla: BUG-38 |
| TAB-01 | P1 | Partición por estado | La pestaña Pending de My Expenses lista los gastos PendingApproval | `E2E-M13`, `MUT-STATE-06` | Falla: BUG-40 |
| SESS-01 | P0 | Sesión | Sign out elimina la cookie; Atrás no muestra datos protegidos | `E2E-04` | Pasa |

## Ampliación ejecutada

| ID / familia | Prioridad | Técnica | Cobertura agregada | Automatizado |
|---|---:|---|---|---|
| AUTHX-01..06 | P0 | Particiones / sesión | `/auth/me` por cuatro roles, token alterado y logout | Sí |
| ANA-01..12 | P0-P1 | Contrato / invariantes | Dashboard y reportes por rol, aritmética, fechas y autenticación | Sí |
| APR-01..08 | P0 | Matriz RBAC | Cola de aprobación por rol, 401 y recursos inexistentes | Sí |
| QUERY-01..08 | P0-P1 | Filtros / particiones | Búsqueda, cuatro estados, paginación, 404 y categoría inexistente | Sí |
| REC-01..03 | P0 | Seguridad negativa | Autenticación, tipo no permitido y rol Administrator | Sí |
| INT-POL-01..03 | P0 | Ciclo CRUD / RBAC | Crear, actualizar y eliminar regla inactiva con cleanup; Finance no escribe | Sí |
| INT-ANA-01..03 | P0 | Consistencia cruzada | Exclusión de rechazados en total, conteo y categorías | Sí |
| E2E-M01..12 | P0-P1 | E2E por módulo | Gastos, aprobaciones, políticas, reportes, ruta prohibida y CSV | Sí |
| E2E-A11..13 | P1 | Accesibilidad / roles | Nombres accesibles y navegación Manager/Finance | Sí |
| EXPA-01..08 | P0-P1 | Exploratoria / límites | Obligatorios, fecha inválida, campos del servidor, comprobante y filtros | Sí |
| APR-CON-01 | P0 | Contrato de consumidor | La cola identifica al solicitante requerido para decidir | Sí |
| EXPUI-01..06 | P0-P1 | Exploratoria UI | RBAC visual, umbral, solicitante, Delete y etiquetas accesibles | Sí |
| MUT-EXP-01..16 | P0-P1 | Mutación black-box | Delete, replace, boundary, type, reference y trust-boundary | Sí |
| MUT-AUTH/EXPQ/APR/POL/REP/REC | P0-P1 | Mutación cruzada API | 24 mutantes sobre seis módulos; 14 candidatos estables antes de depuración | Sí |
| MUT-STATE-01..10 | P0-P1 | Mutación E2E de estado | Refresh, Back, cancelación, doble submit, paginación, deep links y logout | Sí |
| MUT-UI-01..13 | P1 | UI mutante | Teclado, filtros, labels, errores, búsqueda y viewport móvil | Sí |
| R2-AUTH-01..11 | P0 | Seguridad funcional | IDOR/BOLA, alcance por rol, acceso cruzado y mass assignment | Sí |
| R2-FLOW-01..12 | P0 | Máquina de estados adversarial | Decisión repetida, estados finales, self-approval, JSON/rutas/métodos manipulados | Sí |
| R3-RBAC | P0 | Matriz autorizada | 48 lecturas por ocho cuentas y dos escrituras denegadas | Sí |
| R4-DATA/HTTP/QUERY | P0-P1 | Contrato y particiones | Tipos, fechas, UUID, Unicode, query, Content-Type y métodos | Sí |
| R5-UI | P1 | Recuperación/navegación | Error de envío y navegación Back/Forward | Sí |
| RCPT-01..03, THR-01..02 | P0 | Valores límite del motor | Recibo obligatorio desde USD 25 y umbral de autoaprobación en USD 50 (verificación final) | Sí |
| E2E-M13 | P1 | Partición por estado | La pestaña Pending muestra los gastos PendingApproval (verificación final) | Sí |
| R6-API-01..13 | P0-P1 | Reglas del anexo sin cobertura | Numeración (RN-07), regla que decide (RN-31), estados finales (RN-40, RN-52), colas por rol, orden y paginación por defecto, longitud del recibo, comentario al aprobar (RN-41), tablero (RN-61), mensaje de tipos de recibo (RN-22) | Sí |
| R6-INT-01..02 | P0 | Tabla de decisión del motor | Acción Block por encima del límite y regla inactiva sin efecto (Anexo E) | Sí |
| R6-UI-01..20 | P1 | Exploratoria dirigida por reglas | Métricas reales (RN-62), fechas futuras (RN-61), CSV íntegro y botones de exportar (RN-63), errores de carga (RN-70), nombres de botones de ícono (RN-72), estados de login, cookie de sesión, acceso denegado, límite 0 y ver recibo (Anexo G, RN-23, RN-32) | Sí |

Total automatizado disponible: **274 pruebas en 39 archivos**. Todas se descubren con `npx playwright test --list`.

