# E3 — Casos de prueba

| ID | Prioridad | Técnica | Caso / resultado esperado | Automatizado |
|---|---:|---|---|---|
| AUTH-01 | P0 | Camino feliz | Login válido devuelve token, expiración e identidad correcta | Sí |
| AUTH-02 | P0 | Partición inválida | Usuario inexistente devuelve 401 indistinguible de contraseña incorrecta | Sí |
| AUTH-03 | P0 | Partición / seguridad | Usuario inactivo devuelve el mismo 401 `invalid_credentials` | Sí |
| AUTH-04 | P1 | Campos obligatorios | Login con campos vacíos devuelve 400 | Sí |
| AUTH-05 | P1 | Transición / seguridad | Quinto intento fallido bloquea una cuenta y el login válido permanece bloqueado 15 min | No |
| SEC-01 | P0 | Autorización negativa | Endpoint protegido sin sesión devuelve 401 | Sí |
| CAT-01 | P2 | Catálogo / orden | Categorías devuelve exactamente nueve entradas ordenadas por nombre | Sí |
| RBAC-01 | P0 | Matriz de permisos | Employee no puede leer políticas: 403 | Sí |
| RBAC-02 | P0 | Matriz de permisos | Administrator no puede crear gastos: 403 | Sí |
| RBAC-03 | P0 | Alcance indirecto | Manager1 no ve gasto de Employee3: 404 | No |
| RBAC-04 | P0 | Regla especial | Ningún usuario aprueba/rechaza su propio gasto: 403 | No |
| VAL-01 | P0 | Valor límite | Monto 0 se rechaza con 400 y referencia al campo | Sí |
| VAL-02 | P0 | Valores límite | Montos -0.01 y 0.001 se rechazan; 0.01 se acepta | No |
| POL-01 | P0 | Configuración base | Finance ve las dos reglas iniciales esperadas | Sí |
| POL-02 | P0 | Límites 24.99/25 | 24.99 sin recibo se acepta; 25 sin recibo se rechaza explicando el requisito | No |
| POL-03 | P0 | Límites 49.99/50 | 49.99 con recibo queda AutoApproved; 50 queda PendingApproval | No |
| LIFE-01 | P0 | Transición de estados | Rechazar pendiente exige motivo no vacío ni espacios | No |
| LIFE-02 | P0 | Estado final | Segunda decisión sobre un gasto decidido falla y no agrega historial | No |
| AUD-01 | P0 | Integridad / auditoría | Cada transición agrega exactamente un evento con actor y estados correctos | No |
| DEL-01 | P1 | Estado / propiedad | Propietario elimina gasto pendiente; gasto decidido o ajeno no se elimina | No |
| REP-01 | P1 | Alcance / cálculo | Dashboard y reportes excluyen rechazados y fechas futuras según alcance del rol | No |
| CSV-01 | P0 | Robustez / seguridad | CSV conserva columnas y neutraliza textos que empiezan por `=`, `+`, `-` o `@` | No |
| UI-01 | P1 | Accesibilidad | Login, menú y acceso denegado tienen labels/nombres y `data-testid` definidos | No |
| UI-02 | P1 | Recuperación | Error de envío conserva el formulario y muestra un mensaje visible | No |
| SESS-01 | P0 | Sesión | Sign out elimina cookie; Atrás no revela información protegida | No |

