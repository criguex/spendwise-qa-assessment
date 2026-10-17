# E1 — Reporte de defectos

> Generado desde `scripts/report/defects.mjs`. Versión visual con evidencia embebida: `docs/INFORME-QA-SpendWise.html`.

| ID | Título | Módulo | Regla | Severidad | Prioridad | 17-oct |
|---|---|---|---|---|---|---|
| BUG-01 | La API registra gastos con monto cero | Registro de gastos | RN-02, RN-06 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-02 | La API acepta montos negativos y con más de dos decimales | Registro de gastos | RN-02 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-03 | Textos que superan su longitud máxima producen error 500 | Registro de gastos | RN-04, RN-06 | Alta | Alta | Reproduce · 17 de oct, 13:31 |
| BUG-04 | El listado de gastos con página cero responde 500 | Listados y filtros | RN-06 | Media | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-05 | El motor de políticas acepta reglas con nombre vacío o límite negativo | Motor de políticas | RN-32 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-06 | El OpenAPI no documenta respuestas de error ni esquemas de respuesta | Contrato de la API | Anexo G §4, Criterio profesional | Media | Media | Reproduce · 17 de oct, 00:22 |
| BUG-07 | Las categorías no devuelven su ícono | Contrato de la API | Anexo D | Baja | Media | Reproduce · 17 de oct, 00:22 |
| BUG-08 | Se pueden eliminar gastos ya decididos (AutoApproved, Approved y Rejected) | Aprobaciones y auditoría | RN-52, RN-51, Anexo F §3 | Alta | Alta | Reproduce · 17 de oct, 13:31 |
| BUG-09 | Tras iniciar sesión desde una ruta protegida no se vuelve a esa ruta | Acceso y navegación | Anexo G §3.10 | Media | Media | Reproduce · 17 de oct, 00:18 |
| BUG-10 | Administrator ve y puede abrir "New expense" aunque no puede registrar gastos | Acceso y navegación | Anexo G §2.2, Anexo G §3.14 | Media | Media | Reproduce · 17 de oct, 00:18 |
| BUG-11 | Registrar un gasto con una categoría inexistente responde 500 | Registro de gastos | RN-05, RN-06 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-12 | Reportes y tablero suman los gastos rechazados en los totales | Reportes y CSV | RN-61 | Alta | Alta | Reproduce · 17 de oct, 13:31 |
| BUG-13 | La exportación CSV no neutraliza valores que empiezan por "=" | Reportes y CSV | RN-63 | Alta | Alta | Reproduce · 17 de oct, 00:18 |
| BUG-14 | La API acepta campos obligatorios vacíos o ausentes | Registro de gastos | RN-01, RN-06 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-15 | Cualquier texto se acepta como "recibo" del gasto | Recibos | RN-23 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-16 | Un estado inexistente en el filtro de reportes se ignora | Reportes y CSV | RN-06 | Media | Media | Reproduce · 17 de oct, 00:22 |
| BUG-17 | Finance ve controles para crear, editar y borrar reglas | Motor de políticas | Anexo G §2.2, Anexo G §3.14 | Media | Media | Reproduce · 17 de oct, 00:18 |
| BUG-18 | Un gasto de exactamente USD 50 se aprueba automáticamente | Motor de políticas | Anexo E §2, Anexo E §4 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-19 | La cola de aprobación no muestra quién envió el gasto | Aprobaciones y auditoría | RN-43 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-20 | La interfaz ofrece "Delete" en gastos ya decididos | Aprobaciones y auditoría | RN-52 | Media | Alta | Reproduce · 17 de oct, 00:19 |
| BUG-21 | El campo Notes no está asociado a su etiqueta | Interfaz y accesibilidad | RN-72 | Media | Media | Reproduce · 17 de oct, 00:19 |
| BUG-22 | El listado de gastos acepta pageSize=0 | Listados y filtros | RN-06 | Media | Media | Reproduce · 17 de oct, 00:22 |
| BUG-23 | Un estado inexistente en el filtro de gastos se ignora | Listados y filtros | RN-06, RN-60 | Media | Media | Reproduce · 17 de oct, 00:22 |
| BUG-24 | Una categoría inexistente en el filtro de gastos se ignora | Listados y filtros | RN-05, RN-06 | Media | Media | Reproduce · 17 de oct, 00:22 |
| BUG-25 | Un ID de aprobación mal formado responde 404 sin cuerpo | Aprobaciones y auditoría | RN-06 | Media | Media | Reproduce · 17 de oct, 00:22 |
| BUG-26 | Reportes acepta un rango de fechas invertido | Reportes y CSV | RN-06, RN-61 | Media | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-27 | Reportes acepta una categoría inexistente | Reportes y CSV | RN-05, RN-06 | Media | Media | Reproduce · 17 de oct, 00:22 |
| BUG-28 | Un archivo que no es PDF pero se declara PDF provoca error 500 | Recibos | RN-21, RN-22 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-29 | Se puede rechazar un gasto sin motivo | Aprobaciones y auditoría | RN-41, RN-50, Anexo F §3 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-31 | El filtro de estado activo no anuncia su selección | Interfaz y accesibilidad | RN-72, WCAG 2.1 · 4.1.2 | Media | Media | Reproduce · 17 de oct, 00:20 |
| BUG-32 | Los filtros de Reports no tienen etiquetas asociadas | Interfaz y accesibilidad | RN-72 | Media | Media | Reproduce · 17 de oct, 00:20 |
| BUG-33 | La pantalla Reports consulta un rango de fechas invertido sin avisar | Reportes y CSV | RN-70 | Media | Alta | Reproduce · 17 de oct, 00:20 |
| BUG-34 | My Expenses se desborda horizontalmente en pantallas de 320 px | Interfaz y accesibilidad | WCAG 2.1 · 1.4.10, Criterio profesional | Media | Media | Reproduce · 17 de oct, 00:20 |
| BUG-35 | Aprobar dos veces el mismo gasto responde 200 y duplica la auditoría | Aprobaciones y auditoría | RN-40, RN-50, Anexo F §3 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-36 | Un gasto ya decidido puede cambiar de decisión | Aprobaciones y auditoría | RN-40, RN-44, Anexo F §3 | Alta | Alta | Reproduce · 17 de oct, 13:31 |
| BUG-37 | La API acepta propiedades que el contrato prohíbe | Contrato de la API | OpenAPI additionalProperties: false, RN-03 | Media | Media | Reproduce · 17 de oct, 00:22 |
| BUG-38 | Si el registro de un gasto falla, la interfaz no muestra ningún error | Interfaz y accesibilidad | RN-70, RN-71 | Media | Alta | Reproduce · 17 de oct, 00:21 |
| BUG-39 | Se aceptan gastos de USD 25 o más sin recibo | Recibos | RN-20, Anexo E §4 | Alta | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-40 | La pestaña Pending de My Expenses siempre aparece vacía | Listados y filtros | RN-60, RN-70, Anexo F §1 | Media | Alta | Reproduce · 17 de oct, 00:22 |
| BUG-41 | La regla Block rechaza los montos por debajo del límite y deja pasar los que lo superan | Motor de políticas | Anexo E §2, Anexo E §3 | Alta | Alta | Reproduce · 17 de oct, 13:38 |
| BUG-42 | Las decisiones automáticas no indican qué regla las produjo | Motor de políticas | RN-31, RN-30 | Media | Media | Reproduce · 17 de oct, 13:31 |
| BUG-43 | Aprobar no admite el comentario opcional | Aprobaciones y auditoría | RN-41, RN-50 | Media | Media | Reproduce · 17 de oct, 13:31 |
| BUG-44 | El tablero suma gastos con fecha futura en el mes en curso | Reportes y CSV | RN-61 | Media | Alta | Reproduce · 17 de oct, 13:31 |
| BUG-45 | El error de carga de recibos no menciona todos los tipos aceptados | Recibos | RN-22, RN-21 | Baja | Media | Reproduce · 17 de oct, 13:31 |
| BUG-47 | El botón "Export CSV" de My Expenses no hace nada | Reportes y CSV | RN-63 | Media | Media | Reproduce · 17 de oct, 13:46 |
| BUG-48 | La interfaz muestra indicadores fijos que simulan métricas | Reportes y CSV | RN-62 | Media | Media | Reproduce · 17 de oct, 13:46 |
| BUG-50 | Si falla la carga, la interfaz muestra listas vacías en lugar de un error | Interfaz y accesibilidad | RN-70 | Media | Alta | Reproduce · 17 de oct, 13:48 |

## BUG-01 — La API registra gastos con monto cero

- Regla: RN-02, RN-06
- Rol y usuario: Employee, `employee3@spendwise.test`
- Dónde: `POST /api/v1/expenses`
- Precondiciones: Sesión válida de employee3.
- Pasos:
  1. Iniciar sesión como employee3.
  2. Registrar un gasto con descripción y fecha válidas y "amount": 0.
- Resultado esperado: HTTP 400 con un mensaje que nombre el campo amount; el gasto no se crea.
- Resultado obtenido: HTTP 201. El gasto se guarda con monto 0 y queda AutoApproved.
- Severidad: **Alta**. Persiste un gasto sin valor económico que el motor aprueba solo; contamina listados, tablero, reportes y auditoría.
- Prioridad: **Alta**. Es la validación más básica del registro (RN-02) y su corrección es puntual.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: VAL-01, MUT-EXP-07, Newman: monto cero
- Evidencia: `evidence/report/api/BUG-01.json`
- Sugerencia: Validar amount > 0 en el servidor antes de evaluar reglas y responder 400 con el nombre del campo.

## BUG-02 — La API acepta montos negativos y con más de dos decimales

- Regla: RN-02
- Rol y usuario: Employee, `employee3@spendwise.test`
- Dónde: `POST /api/v1/expenses`
- Precondiciones: Sesión válida de employee3.
- Pasos:
  1. Iniciar sesión como employee3.
  2. Registrar un gasto con "amount": -0.01.
  3. Registrar otro con "amount": 1.001.
- Resultado esperado: HTTP 400 en ambos casos y ningún gasto creado.
- Resultado obtenido: HTTP 201 en ambos casos; los dos gastos quedan AutoApproved.
- Severidad: **Alta**. Un monto negativo resta en los totales y uno con tres decimales hace que lo evaluado y lo guardado no coincidan.
- Prioridad: **Alta**. Corrompe información financiera desde el primer día de uso.
- Reproducibilidad: 2/2 por partición el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: VAL-02, VAL-03, MUT-EXP-08, MUT-EXP-09, Newman: monto negativo
- Evidencia: `evidence/report/api/BUG-02.json`
- Sugerencia: Rechazar montos ≤ 0 y con escala mayor a 2 sin redondear en silencio.

## BUG-03 — Textos que superan su longitud máxima producen error 500

- Regla: RN-04, RN-06
- Rol y usuario: Employee, `employee2@spendwise.test`
- Dónde: `POST /api/v1/expenses`
- Precondiciones: Sesión válida de employee2. Se varía un solo campo por petición.
- Pasos:
  1. Iniciar sesión como employee2.
  2. Registrar un gasto con descripción de 501 caracteres.
  3. Repetir con proveedor de 201 caracteres.
  4. Repetir con notas de 1001 caracteres.
  5. Repetir con un enlace de recibo de más de 500 caracteres.
- Resultado esperado: HTTP 400 que indique el campo y su límite.
- Resultado obtenido: HTTP 500 "An unexpected error occurred." en los cuatro casos.
- Severidad: **Alta**. Una entrada normal del usuario llega sin validar a la capa de datos y rompe el registro con un error interno.
- Prioridad: **Alta**. RN-04 fija los límites; el usuario no sabe qué corregir y el error cuenta como caída del servicio.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 13:31.
- Pruebas: VAL-04, VAL-05, VAL-06, MUT-EXP-05, R6-API-09, Newman: descripción 501
- Evidencia: `evidence/report/api/BUG-03.json`
- Sugerencia: Validar longitudes (500/200/1000/500) en el contrato de entrada antes de persistir.

## BUG-04 — El listado de gastos con página cero responde 500

- Regla: RN-06
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `GET /api/v1/expenses?page=0`
- Precondiciones: Sesión válida de employee1.
- Pasos:
  1. Iniciar sesión como employee1.
  2. Consultar GET /api/v1/expenses?page=0.
- Resultado esperado: HTTP 400 con un mensaje comprensible.
- Resultado obtenido: HTTP 500.
- Severidad: **Media**. Afecta una consulta con un parámetro inválido; no altera datos.
- Prioridad: **Alta**. RN-06 nombra literalmente el caso "página cero" y la corrección es trivial.
- Reproducibilidad: Confirmado en la regresión del 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: VAL-09, MUT-EXPQ-01, MUT-EXPQ-02, Newman: page=0
- Evidencia: `evidence/report/api/BUG-04.json`
- Sugerencia: Validar page ≥ 1 y pageSize ≥ 1 antes de consultar.

## BUG-05 — El motor de políticas acepta reglas con nombre vacío o límite negativo

- Regla: RN-32
- Rol y usuario: Administrator, `admin@spendwise.test`
- Dónde: `POST /api/v1/policies`
- Precondiciones: Sesión de administrador. Las reglas se crean inactivas para no afectar el entorno y se eliminan al terminar.
- Pasos:
  1. Iniciar sesión como admin.
  2. Crear una regla inactiva con "name": "".
  3. Crear otra regla inactiva con "maxAmount": -1.
  4. Crear otra con un nombre de 201 caracteres.
  5. Eliminar las reglas creadas.
- Resultado esperado: HTTP 400 y ninguna regla guardada.
- Resultado obtenido: Nombre vacío y límite negativo: HTTP 201 y las reglas quedan guardadas. Nombre de 201 caracteres: HTTP 500.
- Severidad: **Alta**. Deja configuración sensible en estado inválido; una regla con límite negativo, al activarse, cambia decisiones automáticas.
- Prioridad: **Alta**. RN-32 exige 400 para estos datos y las reglas afectan a todos los gastos posteriores.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: POL-02, POL-04, POL-05
- Evidencia: `evidence/report/api/BUG-05.json`
- Sugerencia: Validar nombre obligatorio (máx. 200), maxAmount ≥ 0 y acción dentro del catálogo.

## BUG-06 — El OpenAPI no documenta respuestas de error ni esquemas de respuesta

- Regla: Anexo G §4, Criterio profesional
- Rol y usuario: No aplica, `Análisis del OpenAPI publicado`
- Dónde: `GET /swagger/v1/swagger.json`
- Precondiciones: Acceso al Swagger del entorno.
- Pasos:
  1. Descargar /swagger/v1/swagger.json.
  2. Revisar la sección responses de las 19 operaciones.
  3. Comparar con los códigos reales: POST /expenses responde 201 y DELETE /expenses/{id} responde 204.
- Resultado esperado: Cada operación documenta sus respuestas reales (201/204, 400, 401, 403, 404) con su esquema.
- Resultado obtenido: Las 19 operaciones documentan solo "200 OK" y ninguna declara esquema de respuesta. La seguridad Bearer sí está definida, aunque de forma global, incluido el login que es anónimo.
- Severidad: **Media**. No afecta al usuario final, pero quien integra no conoce errores ni formas de respuesta y los clientes generados esperan 200 donde llega 201 o 204.
- Prioridad: **Media**. Se corrige con anotaciones en el servicio; conviene antes de abrir la API a integradores.
- Reproducibilidad: Determinista sobre el OpenAPI del 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: CON-03
- Evidencia: `evidence/report/api/BUG-06.json`
- Sugerencia: Declarar los códigos y esquemas reales por operación y excluir el login de la seguridad global.

## BUG-07 — Las categorías no devuelven su ícono

- Regla: Anexo D
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `GET /api/v1/categories`
- Precondiciones: Sesión válida de employee1.
- Pasos:
  1. Iniciar sesión como employee1.
  2. Consultar GET /api/v1/categories.
- Resultado esperado: Las nueve categorías del Anexo D, ordenadas por nombre, con su ícono (car, megaphone, utensils…).
- Resultado obtenido: Las nueve categorías llegan ordenadas, pero ninguna incluye el campo icon.
- Severidad: **Baja**. Es un dato de presentación del catálogo; no afecta reglas, importes ni flujos.
- Prioridad: **Media**. La corrección es inmediata y evita que cada cliente mantenga su propia tabla de íconos.
- Reproducibilidad: Confirmado por CON-06 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: CON-06
- Evidencia: `evidence/report/api/BUG-07.json`
- Sugerencia: Incluir icon en el contrato de categorías.
- Nota: Los identificadores tienen formato GUID válido (p. ej. 33333333-0000-0000-0000-000000000005) aunque no siguen la versión RFC 4122; se deja como observación y no como defecto.

## BUG-08 — Se pueden eliminar gastos ya decididos (AutoApproved, Approved y Rejected)

- Regla: RN-52, RN-51, Anexo F §3
- Rol y usuario: Employee, `employee2@spendwise.test`
- Dónde: `DELETE /api/v1/expenses/{id}`
- Precondiciones: Sesión de employee2 y un gasto propio de USD 10 creado por la prueba.
- Pasos:
  1. Registrar un gasto de USD 10 (queda AutoApproved) y eliminarlo con DELETE /api/v1/expenses/{id}.
  2. Repetir con un gasto aprobado por su gerente y con uno rechazado.
  3. Consultar cada gasto de nuevo.
- Resultado esperado: Error en los tres casos; el gasto y su historial se conservan.
- Resultado obtenido: HTTP 204 en los tres estados finales; los gastos dejan de existir (la consulta posterior responde 404) y su historial tampoco se puede consultar.
- Severidad: **Alta**. Desaparece un gasto ya decidido y con él su rastro; un empleado puede borrar lo que el motor aprobó.
- Prioridad: **Alta**. Viola un estado final y la conservación de la auditoría.
- Reproducibilidad: Confirmado por INT-03 el 16-oct; Reproduce · 17 de oct, 13:31.
- Pruebas: INT-03, R6-API-05a, R6-API-05b
- Evidencia: `evidence/report/api/BUG-08.json`
- Sugerencia: Permitir DELETE solo en PendingApproval y validar el estado en el servidor.

## BUG-09 — Tras iniciar sesión desde una ruta protegida no se vuelve a esa ruta

- Regla: Anexo G §3.10
- Rol y usuario: Employee, `employee2@spendwise.test`
- Dónde: `/expenses`
- Precondiciones: Sin sesión iniciada.
- Pasos:
  1. Abrir /expenses sin sesión: redirige a /login.
  2. Iniciar sesión como employee2.
- Resultado esperado: Volver a /expenses.
- Resultado obtenido: Se abre /dashboard.
- Severidad: **Media**. El usuario llega al tablero en lugar del destino; puede seguir navegando a mano.
- Prioridad: **Media**. Afecta enlaces compartidos y marcadores, no datos.
- Reproducibilidad: Confirmado por E2E-03 el 16-oct; Reproduce · 17 de oct, 00:18.
- Pruebas: E2E-03
- Evidencia: `evidence/report/BUG-09/`
- Sugerencia: Conservar la ruta original (returnUrl) y redirigir a ella tras el login.

## BUG-10 — Administrator ve y puede abrir "New expense" aunque no puede registrar gastos

- Regla: Anexo G §2.2, Anexo G §3.14
- Rol y usuario: Administrator, `admin@spendwise.test`
- Dónde: `/dashboard, /expenses/new`
- Precondiciones: Sesión de administrador.
- Pasos:
  1. Iniciar sesión como admin.
  2. Observar las acciones del tablero.
  3. Abrir /expenses/new directamente.
- Resultado esperado: No se ofrece "New expense" y la ruta directa muestra la pantalla de acceso denegado.
- Resultado obtenido: El tablero muestra "New expense", "Scan receipt" y "Manual entry", y /expenses/new abre el formulario completo.
- Severidad: **Media**. La API bloquea el registro (403), pero la interfaz ofrece una acción que el rol no puede completar.
- Prioridad: **Media**. Genera intentos fallidos y confusión; la seguridad real la mantiene la API.
- Reproducibilidad: Confirmado por E2E-07 y E2E-M09 el 16-oct; Reproduce · 17 de oct, 00:18.
- Pruebas: E2E-07, E2E-M09
- Evidencia: `evidence/report/BUG-10/`
- Sugerencia: Ocultar las acciones de registro para Administrator y proteger la ruta con la pantalla access-denied.

## BUG-11 — Registrar un gasto con una categoría inexistente responde 500

- Regla: RN-05, RN-06
- Rol y usuario: Employee, `employee3@spendwise.test`
- Dónde: `POST /api/v1/expenses`
- Precondiciones: Sesión válida de employee3.
- Pasos:
  1. Iniciar sesión como employee3.
  2. Registrar un gasto válido salvo por categoryId, con un UUID que no existe.
- Resultado esperado: HTTP 400 que identifique la categoría inválida; el gasto no se crea.
- Resultado obtenido: HTTP 500 "An unexpected error occurred."
- Severidad: **Alta**. Una referencia enviada por el cliente provoca un fallo interno en el flujo principal y oculta la causa corregible.
- Prioridad: **Alta**. RN-05 exige 400 y la validación es simple.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: QUERY-08, MUT-EXP-15
- Evidencia: `evidence/report/api/BUG-11.json`
- Sugerencia: Validar que la categoría exista antes de guardar.

## BUG-12 — Reportes y tablero suman los gastos rechazados en los totales

- Regla: RN-61
- Rol y usuario: FinanceController, `finance@spendwise.test`
- Dónde: `GET /api/v1/reports`
- Precondiciones: Existen gastos Rejected en el periodo.
- Pasos:
  1. Iniciar sesión como finance y consultar GET /api/v1/reports.
  2. Sumar la lista expenses excluyendo los Rejected y comparar con totalAmount, totalCount y byCategory.
  3. Iniciar sesión como employee1 y comparar spendThisMonth de GET /api/v1/dashboard/summary con sus gastos no rechazados del mes.
- Resultado esperado: Totales, agregados y gasto del mes calculados solo con gastos no rechazados.
- Resultado obtenido: totalAmount, totalCount y byCategory de Reports incluyen los rechazados, y el gasto del mes del tablero coincide exactamente con la suma que incluye los rechazados.
- Severidad: **Alta**. Finanzas y Administración ven cifras de gasto infladas, que es justo la información que usan para decidir.
- Prioridad: **Alta**. Error de cálculo en el producto financiero principal.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 13:31.
- Pruebas: INT-ANA-01, INT-ANA-02, INT-ANA-03, R6-API-11, R6-UI-02
- Evidencia: `evidence/report/api/BUG-12.json`
- Sugerencia: Filtrar status <> Rejected en el cálculo de totales, agregados y gasto del mes.

## BUG-13 — La exportación CSV no neutraliza valores que empiezan por "="

- Regla: RN-63
- Rol y usuario: Employee, `employee3@spendwise.test`
- Dónde: `/reports → Export CSV`
- Precondiciones: Un gasto de employee3 cuya descripción empieza por "=2+2".
- Pasos:
  1. Registrar un gasto con descripción "=2+2 QA-…".
  2. Abrir Reports.
  3. Exportar CSV.
  4. Abrir el archivo descargado.
- Resultado esperado: El valor sale neutralizado (por ejemplo con apóstrofo inicial).
- Resultado obtenido: El CSV contiene literalmente "=2+2 QA-…".
- Severidad: **Alta**. Permite inyección de fórmulas: un empleado escribe una fórmula que se ejecuta cuando otra persona abre el CSV en una hoja de cálculo.
- Prioridad: **Alta**. Riesgo de seguridad sobre un archivo que Finanzas abre como confiable.
- Reproducibilidad: Confirmado con descarga real por E2E-M12 el 16-oct; Reproduce · 17 de oct, 00:18.
- Pruebas: E2E-M12
- Evidencia: `evidence/report/BUG-13/`
- Sugerencia: Prefijar con apóstrofo los valores que empiezan por =, +, - o @ al generar el CSV.

## BUG-14 — La API acepta campos obligatorios vacíos o ausentes

- Regla: RN-01, RN-06
- Rol y usuario: Employee, `employee2@spendwise.test`
- Dónde: `POST /api/v1/expenses`
- Precondiciones: Sesión válida de employee2.
- Pasos:
  1. Registrar un gasto con descripción de solo espacios.
  2. Registrar otro sin amount.
  3. Registrar otro sin date.
  4. Registrar otro con "amount": "10.00" como texto.
- Resultado esperado: HTTP 400 que nombre el campo; ningún gasto creado.
- Resultado obtenido: HTTP 201 en las cuatro variantes. Sin amount se guarda 0; sin date se guarda 0001-01-01; el texto "10.00" se convierte a número.
- Severidad: **Alta**. Se guardan gastos sin descripción real, con monto 0 o con fecha 0001-01-01, que se autoaprueban y distorsionan reportes y auditoría.
- Prioridad: **Alta**. RN-01 es la regla base del registro.
- Reproducibilidad: 2/2 por variante el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: EXPA-01, EXPA-02, MUT-EXP-02, MUT-EXP-06, MUT-EXP-10, MUT-EXP-11
- Evidencia: `evidence/report/api/BUG-14.json`
- Sugerencia: Marcar description, amount y date como requeridos sin valores por defecto, rechazar blancos y no convertir tipos.

## BUG-15 — Cualquier texto se acepta como "recibo" del gasto

- Regla: RN-23
- Rol y usuario: Employee, `employee2@spendwise.test`
- Dónde: `POST /api/v1/expenses`
- Precondiciones: Sesión válida de employee2.
- Pasos:
  1. Registrar un gasto de USD 30 con "receiptUrl": "https://example.invalid/not-an-uploaded-receipt.pdf", sin cargar archivo.
- Resultado esperado: Rechazo: un gasto con recibo es uno con un recibo cargado y asociado, no un texto cualquiera.
- Resultado obtenido: HTTP 201, AutoApproved; la URL externa queda guardada como recibo.
- Severidad: **Alta**. Un gasto figura "con recibo" sin que exista un comprobante cargado en SpendWise.
- Prioridad: **Alta**. Debilita el control de comprobantes junto con BUG-39.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: EXPA-05, MUT-EXP-16
- Evidencia: `evidence/report/api/BUG-15.json`
- Sugerencia: Aceptar solo identificadores de recibos subidos al servicio y asociarlos al gasto.

## BUG-16 — Un estado inexistente en el filtro de reportes se ignora

- Regla: RN-06
- Rol y usuario: FinanceController, `finance@spendwise.test`
- Dónde: `GET /api/v1/reports?status=MadeUpStatus`
- Precondiciones: Sesión de finance.
- Pasos:
  1. Consultar GET /api/v1/reports?status=MadeUpStatus.
  2. Comparar con el reporte sin filtro.
- Resultado esperado: HTTP 400 indicando que el estado no existe.
- Resultado obtenido: HTTP 200 con el mismo reporte que sin filtro.
- Severidad: **Media**. Un error de escritura en el filtro devuelve cifras completas y plausibles sin advertencia.
- Prioridad: **Media**. Afecta a quien integra o consulta por API; la pantalla usa valores fijos.
- Reproducibilidad: Confirmado por EXPA-08 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: EXPA-08, MUT-REP-03
- Evidencia: `evidence/report/api/BUG-16.json`
- Sugerencia: Validar el estado contra el catálogo del Anexo F.

## BUG-17 — Finance ve controles para crear, editar y borrar reglas

- Regla: Anexo G §2.2, Anexo G §3.14
- Rol y usuario: FinanceController, `finance@spendwise.test`
- Dónde: `/policies`
- Precondiciones: Sesión de finance.
- Pasos:
  1. Iniciar sesión como finance.
  2. Abrir Policy Engine.
- Resultado esperado: Vista de solo lectura.
- Resultado obtenido: Aparecen New rule, Deactivate, Edit y Delete.
- Severidad: **Media**. La API protege la escritura, pero la pantalla ofrece acciones que el rol no puede completar.
- Prioridad: **Media**. Ayuda visual incorrecta sin exposición de datos.
- Reproducibilidad: Confirmado por EXPUI-01 el 16-oct; Reproduce · 17 de oct, 00:18.
- Pruebas: EXPUI-01
- Evidencia: `evidence/report/BUG-17/`
- Sugerencia: Mostrar los controles de escritura solo a Administrator.

## BUG-18 — Un gasto de exactamente USD 50 se aprueba automáticamente

- Regla: Anexo E §2, Anexo E §4
- Rol y usuario: Employee, `employee3@spendwise.test`
- Dónde: `POST /api/v1/expenses, /policies`
- Precondiciones: Sesión de employee3. Regla "Auto-approve under $50" activa con maxAmount 50.
- Pasos:
  1. Registrar USD 49,99 con recibo (control: debe autoaprobarse).
  2. Registrar USD 50 con recibo.
  3. Registrar USD 50,01 con recibo (control).
  4. Abrir Policy Engine y leer la regla.
- Resultado esperado: USD 50 queda PendingApproval porque AutoApprove aplica solo a montos estrictamente menores que maxAmount.
- Resultado obtenido: USD 50 queda AutoApproved; USD 50,01 queda pendiente. El motor compara con "≤ 50" y la interfaz lo comunica igual ("at or below $50", "≤ $50").
- Severidad: **Alta**. Gastos de USD 50 se aprueban sin revisión humana cuando la regla exige que queden pendientes; afecta el umbral principal del producto.
- Prioridad: **Alta**. El Anexo E da el caso literal ("un gasto de exactamente 50 USD queda pendiente") y la regla aplica a todos los gastos.
- Reproducibilidad: El texto se registró el 16-oct; el comportamiento del motor se confirmó el 17-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: THR-01, THR-02, EXPUI-02
- Evidencia: `evidence/report/api/BUG-18.json` y `evidence/report/BUG-18/`
- Sugerencia: Cambiar la comparación del motor a amount < maxAmount y ajustar el texto de la regla y del indicador.

## BUG-19 — La cola de aprobación no muestra quién envió el gasto

- Regla: RN-43
- Rol y usuario: FinanceController, `finance@spendwise.test`
- Dónde: `GET /api/v1/approvals/pending, /approvals`
- Precondiciones: Sesión de finance con gastos pendientes en la cola.
- Pasos:
  1. Consultar GET /api/v1/approvals/pending.
  2. Abrir Approvals en la interfaz.
- Resultado esperado: Nombre o correo del solicitante en la respuesta y en la pantalla.
- Resultado obtenido: La respuesta solo trae datos del gasto (id, número, descripción, proveedor, monto, fecha, categoría, estado, notas, recibo, creación) y la pantalla tampoco muestra al solicitante.
- Severidad: **Alta**. Se aprueba o rechaza dinero sin saber de quién es el gasto; afecta la calidad de la decisión y la separación de funciones.
- Prioridad: **Alta**. RN-43 lo exige y la cola es la pantalla principal de los aprobadores.
- Reproducibilidad: Confirmado por APR-CON-01 y EXPUI-03 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: APR-CON-01, EXPUI-03
- Evidencia: `evidence/report/api/BUG-19.json` y `evidence/report/BUG-19/`
- Sugerencia: Incluir submittedBy (nombre y correo) en el contrato y en la cola.

## BUG-20 — La interfaz ofrece "Delete" en gastos ya decididos

- Regla: RN-52
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `/expenses`
- Precondiciones: Sesión de un empleado con gastos AutoApproved, Approved o Rejected.
- Pasos:
  1. Abrir My Expenses.
  2. Revisar las acciones de un gasto en estado final.
- Resultado esperado: Sin acción Delete en AutoApproved, Approved ni Rejected.
- Resultado obtenido: La acción Delete aparece en gastos en estado final.
- Severidad: **Media**. Induce una operación prohibida; combinado con BUG-08, un gasto AutoApproved sí se borra.
- Prioridad: **Alta**. Se corrige junto con BUG-08.
- Reproducibilidad: Confirmado por EXPUI-04 el 16-oct; Reproduce · 17 de oct, 00:19.
- Pruebas: EXPUI-04
- Evidencia: `evidence/report/BUG-20/`
- Sugerencia: Mostrar Delete solo en gastos propios PendingApproval.

## BUG-21 — El campo Notes no está asociado a su etiqueta

- Regla: RN-72
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `/expenses/new`
- Precondiciones: Sesión de un empleado.
- Pasos:
  1. Abrir New expense.
  2. Buscar el campo por su etiqueta visible "Notes".
- Resultado esperado: La etiqueta Notes nombra el textarea.
- Resultado obtenido: getByLabel("Notes") no encuentra el control; su nombre accesible es el placeholder "Any additional notes...".
- Severidad: **Media**. Un lector de pantalla anuncia el placeholder en lugar de la etiqueta visible.
- Prioridad: **Media**. Barrera de accesibilidad acotada a un campo opcional.
- Reproducibilidad: Confirmado por EXPUI-06 el 16-oct; Reproduce · 17 de oct, 00:19.
- Pruebas: EXPUI-06, MUT-UI-11
- Evidencia: `evidence/report/BUG-21/`
- Sugerencia: Asociar label for/id al textarea.

## BUG-22 — El listado de gastos acepta pageSize=0

- Regla: RN-06
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `GET /api/v1/expenses?pageSize=0`
- Precondiciones: Sesión de employee1 con gastos propios.
- Pasos:
  1. Consultar GET /api/v1/expenses?pageSize=0.
- Resultado esperado: HTTP 400 indicando que el mínimo es 1.
- Resultado obtenido: HTTP 200 con items vacío, totalCount positivo y pageSize 0.
- Severidad: **Media**. Un cliente puede interpretar la lista vacía como ausencia de gastos.
- Prioridad: **Media**. Validación de parámetros sin impacto en datos.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: MUT-EXPQ-04
- Evidencia: `evidence/report/api/BUG-22.json`
- Sugerencia: Validar pageSize ≥ 1 y documentar el máximo.

## BUG-23 — Un estado inexistente en el filtro de gastos se ignora

- Regla: RN-06, RN-60
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `GET /api/v1/expenses?status=Deleted`
- Precondiciones: Sesión de employee1.
- Pasos:
  1. Consultar GET /api/v1/expenses?status=Deleted.
- Resultado esperado: HTTP 400 porque Deleted no es un estado del ciclo de vida.
- Resultado obtenido: HTTP 200 con gastos de varios estados.
- Severidad: **Media**. Quien filtra cree tener un subconjunto y recibe el universo completo.
- Prioridad: **Media**. Afecta integraciones; la pantalla usa estados fijos.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: MUT-EXPQ-06
- Evidencia: `evidence/report/api/BUG-23.json`
- Sugerencia: Validar el estado contra el catálogo del Anexo F.

## BUG-24 — Una categoría inexistente en el filtro de gastos se ignora

- Regla: RN-05, RN-06
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `GET /api/v1/expenses?categoryId=…`
- Precondiciones: Sesión de employee1.
- Pasos:
  1. Consultar el listado sin filtro.
  2. Consultar con categoryId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.
- Resultado esperado: HTTP 400 por categoría inexistente.
- Resultado obtenido: HTTP 200 con el mismo total que sin filtro.
- Severidad: **Media**. Resultados sin filtrar con apariencia válida; contradice el trato que la misma API da a la categoría al registrar.
- Prioridad: **Media**. Afecta integraciones, no datos.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: MUT-EXPQ-07
- Evidencia: `evidence/report/api/BUG-24.json`
- Sugerencia: Validar la categoría del filtro contra el catálogo.

## BUG-25 — Un ID de aprobación mal formado responde 404 sin cuerpo

- Regla: RN-06
- Rol y usuario: Manager, `manager1@spendwise.test`
- Dónde: `PUT /api/v1/approvals/not-a-uuid/approve`
- Precondiciones: Sesión de manager1.
- Pasos:
  1. Enviar PUT /api/v1/approvals/not-a-uuid/approve.
- Resultado esperado: HTTP 400 con un mensaje comprensible.
- Resultado obtenido: HTTP 404 con cuerpo vacío.
- Severidad: **Media**. Un error de entrada no se distingue de un recurso inexistente y no trae mensaje.
- Prioridad: **Media**. Diagnóstico para integradores; sin efecto en datos.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: MUT-APR-01
- Evidencia: `evidence/report/api/BUG-25.json`
- Sugerencia: Validar el formato del identificador y responder 400 con mensaje.

## BUG-26 — Reportes acepta un rango de fechas invertido

- Regla: RN-06, RN-61
- Rol y usuario: FinanceController, `finance@spendwise.test`
- Dónde: `GET /api/v1/reports?dateFrom=2026-10-31&dateTo=2026-10-01`
- Precondiciones: Sesión de finance.
- Pasos:
  1. Consultar reports con dateFrom posterior a dateTo.
- Resultado esperado: HTTP 400 explicando que From debe ser anterior o igual a To.
- Resultado obtenido: HTTP 200 con totales en cero.
- Severidad: **Media**. Un error de entrada se presenta como un periodo sin gastos.
- Prioridad: **Alta**. Lleva a conclusiones financieras equivocadas; la pantalla también lo permite (BUG-33).
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: MUT-REP-01, EXPA-06
- Evidencia: `evidence/report/api/BUG-26.json`
- Sugerencia: Validar dateFrom ≤ dateTo.

## BUG-27 — Reportes acepta una categoría inexistente

- Regla: RN-05, RN-06
- Rol y usuario: FinanceController, `finance@spendwise.test`
- Dónde: `GET /api/v1/reports?categoryId=…`
- Precondiciones: Sesión de finance.
- Pasos:
  1. Consultar reports con categoryId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.
- Resultado esperado: HTTP 400 por categoría inexistente.
- Resultado obtenido: HTTP 200 con el reporte vacío.
- Severidad: **Media**. Un error de integración se ve como ausencia legítima de gastos.
- Prioridad: **Media**. Sin efecto en datos.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: MUT-REP-02, EXPA-07
- Evidencia: `evidence/report/api/BUG-27.json`
- Sugerencia: Validar la categoría contra el catálogo.

## BUG-28 — Un archivo que no es PDF pero se declara PDF provoca error 500

- Regla: RN-21, RN-22
- Rol y usuario: Employee, `employee2@spendwise.test`
- Dónde: `POST /api/v1/receipts/extract`
- Precondiciones: Sesión de employee2. Se usa una sola llamada por el costo del servicio de extracción.
- Pasos:
  1. Crear un archivo disguised.pdf cuyo contenido empieza por la cabecera ejecutable "MZ".
  2. Enviarlo como application/pdf a POST /api/v1/receipts/extract.
- Resultado esperado: HTTP 400 o 415 indicando que el contenido no es un PDF.
- Resultado obtenido: HTTP 500 "An unexpected error occurred."
- Severidad: **Alta**. Contenido controlado por el usuario llega a una ruta no controlada del procesador de recibos.
- Prioridad: **Alta**. RN-21 exige rechazar el contenido que no corresponde al tipo; es una superficie expuesta a archivos.
- Reproducibilidad: 3/3 el 16-oct, sin ejecutar el contenido; Reproduce · 17 de oct, 00:22.
- Pruebas: MUT-REC-02
- Evidencia: `evidence/report/api/BUG-28.json`
- Sugerencia: Verificar la firma real del archivo (magic bytes) antes de procesarlo.

## BUG-29 — Se puede rechazar un gasto sin motivo

- Regla: RN-41, RN-50, Anexo F §3
- Rol y usuario: Manager, `manager1@spendwise.test`
- Dónde: `PUT /api/v1/approvals/{id}/reject`
- Precondiciones: Dos gastos PendingApproval de employee1 (USD 125); sesión de su gerente manager1.
- Pasos:
  1. Rechazar el primero con cuerpo {}.
  2. Rechazar el segundo con {"reason": "   "}.
  3. Consultar el gasto y su historial.
- Resultado esperado: HTTP 400; el gasto sigue PendingApproval y no se agrega historial.
- Resultado obtenido: HTTP 200 en ambos casos; los gastos quedan Rejected y el historial guarda el rechazo con motivo null.
- Severidad: **Alta**. Una decisión irreversible queda sin justificación y el historial registra el rechazo sin motivo.
- Prioridad: **Alta**. RN-41 lo exige de forma explícita.
- Reproducibilidad: 3/3 por variante el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: MUT-APR-02, MUT-APR-03
- Evidencia: `evidence/report/api/BUG-29.json`
- Sugerencia: Exigir reason no vacío tras recortar espacios.

## BUG-31 — El filtro de estado activo no anuncia su selección

- Regla: RN-72, WCAG 2.1 · 4.1.2
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `/expenses`
- Precondiciones: Sesión de un empleado.
- Pasos:
  1. Abrir My Expenses.
  2. Activar el filtro Approved.
  3. Inspeccionar el estado accesible del botón.
- Resultado esperado: aria-pressed="true" o un patrón equivalente (tabs con aria-selected).
- Resultado obtenido: La selección solo se expresa con clases y color.
- Severidad: **Media**. Quien usa lector de pantalla no sabe qué filtro está aplicado.
- Prioridad: **Media**. Barrera de accesibilidad sin efecto en datos.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:20.
- Pruebas: MUT-UI-05
- Evidencia: `evidence/report/BUG-31/`
- Sugerencia: Exponer el estado con aria-pressed o role="tab" y aria-selected.

## BUG-32 — Los filtros de Reports no tienen etiquetas asociadas

- Regla: RN-72
- Rol y usuario: FinanceController, `finance@spendwise.test`
- Dónde: `/reports`
- Precondiciones: Sesión con acceso a Reports.
- Pasos:
  1. Abrir Reports.
  2. Buscar los controles From, To, Category y Status por su etiqueta.
- Resultado esperado: Cada texto visible nombra su control.
- Resultado obtenido: getByLabel("From") devuelve cero elementos; los controles no tienen etiqueta asociada ni aria-label.
- Severidad: **Media**. Navegación ambigua con lector de pantalla; incumple RN-72 de forma directa.
- Prioridad: **Media**. Barrera de accesibilidad sin efecto en datos.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:20.
- Pruebas: MUT-UI-09
- Evidencia: `evidence/report/BUG-32/`
- Sugerencia: Asociar label for/id a cada filtro.

## BUG-33 — La pantalla Reports consulta un rango de fechas invertido sin avisar

- Regla: RN-70
- Rol y usuario: FinanceController, `finance@spendwise.test`
- Dónde: `/reports`
- Precondiciones: Sesión con acceso a Reports.
- Pasos:
  1. Abrir Reports.
  2. Poner From 2026-10-20 y To 2026-10-01.
- Resultado esperado: Validación visible y ninguna consulta incoherente.
- Resultado obtenido: Se envía la consulta con el rango invertido y se muestra el reporte vacío.
- Severidad: **Media**. La persona ve un reporte vacío y concluye que no hubo actividad.
- Prioridad: **Alta**. Se corrige junto con BUG-26 y evita lecturas financieras erróneas.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:20.
- Pruebas: MUT-UI-10
- Evidencia: `evidence/report/BUG-33/`
- Sugerencia: Validar el rango en el formulario y deshabilitar la consulta mientras sea inválido.

## BUG-34 — My Expenses se desborda horizontalmente en pantallas de 320 px

- Regla: WCAG 2.1 · 1.4.10, Criterio profesional
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `/expenses (320×568)`
- Precondiciones: Ventana de 320×568 px.
- Pasos:
  1. Abrir My Expenses con ancho de 320 px.
  2. Medir scrollWidth − clientWidth del documento.
- Resultado esperado: Sin desplazamiento horizontal de la página (la tabla puede desplazarse dentro de su contenedor).
- Resultado obtenido: La página entera se desplaza en horizontal: 102 px el 16-oct y 253 px el 17-oct; el desborde crece con el contenido de la tabla.
- Severidad: **Media**. En móvil la página entera se desplaza de lado y parte de las acciones queda fuera de vista.
- Prioridad: **Media**. Afecta uso móvil, sin efecto en datos.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:20.
- Pruebas: MUT-UI-13
- Evidencia: `evidence/report/BUG-34/`
- Sugerencia: Contener la tabla en un contenedor con overflow-x o usar tarjetas en móvil.

## BUG-35 — Aprobar dos veces el mismo gasto responde 200 y duplica la auditoría

- Regla: RN-40, RN-50, Anexo F §3
- Rol y usuario: Manager, `manager1@spendwise.test`
- Dónde: `PUT /api/v1/approvals/{id}/approve`
- Precondiciones: Un gasto PendingApproval de employee1 (USD 125); sesión de manager1.
- Pasos:
  1. Aprobar el gasto (legítimo).
  2. Repetir exactamente la aprobación.
  3. Consultar el historial.
- Resultado esperado: La segunda aprobación responde 4xx y no agrega historial.
- Resultado obtenido: HTTP 200 y el historial suma un registro Approved → Approved de manager1.
- Severidad: **Alta**. La segunda decisión se acepta y agrega un registro Approved → Approved; la auditoría deja de reflejar solo decisiones reales.
- Prioridad: **Alta**. Anexo F §3 pide rechazar la segunda decisión sin agregar historial.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: R2-FLOW-01, R2-FLOW-01-EVIDENCE
- Evidencia: `evidence/report/api/BUG-35.json`
- Sugerencia: Validar que el gasto esté PendingApproval antes de decidir y hacerlo de forma atómica.

## BUG-36 — Un gasto ya decidido puede cambiar de decisión

- Regla: RN-40, RN-44, Anexo F §3
- Rol y usuario: Manager, `manager1@spendwise.test`
- Dónde: `PUT /api/v1/approvals/{id}/approve`
- Precondiciones: Gastos de employee1 en cada estado final; sesiones de manager1 y finance.
- Pasos:
  1. Rechazar un gasto pendiente con motivo y luego aprobarlo.
  2. Aprobar un gasto pendiente y luego rechazarlo.
  3. Registrar un gasto de USD 10 (AutoApproved) y, como finance, aprobarlo y luego rechazarlo.
  4. Consultar el estado final y el historial de cada gasto.
- Resultado esperado: Toda decisión sobre un gasto Approved, Rejected o AutoApproved responde 4xx y el gasto no cambia.
- Resultado obtenido: HTTP 200 en todas las variantes: Rejected → Approved (la nota vigente sigue siendo "Rejected: …", RN-44), Approved → Rejected y AutoApproved → Approved → Rejected.
- Severidad: **Alta**. Revierte una decisión financiera cerrada; además el gasto aprobado conserva como nota el motivo del rechazo.
- Prioridad: **Alta**. Rompe la inmutabilidad de un estado final.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 13:31.
- Pruebas: R2-FLOW-02, R2-FLOW-02-EVIDENCE, R6-API-03, R6-API-04
- Evidencia: `evidence/report/api/BUG-36.json`
- Sugerencia: Mismo control de estado que BUG-35; limpiar o marcar como historial la nota anterior.

## BUG-37 — La API acepta propiedades que el contrato prohíbe

- Regla: OpenAPI additionalProperties: false, RN-03
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `POST /api/v1/expenses`
- Precondiciones: Sesión de employee1.
- Pasos:
  1. Registrar un gasto válido agregando "currency": "ZZZ".
- Resultado esperado: HTTP 400, porque CreateExpenseRequest declara additionalProperties: false y RN-03 excluye monedas.
- Resultado obtenido: HTTP 201; la propiedad se omite en la respuesta.
- Severidad: **Media**. El servidor no cumple su propio contrato y oculta errores de integración; no se demostró que el valor se guarde.
- Prioridad: **Media**. Riesgo para integradores; sin efecto observado en datos.
- Reproducibilidad: 2/2 el 16-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: R4-DATA-11
- Evidencia: `evidence/report/api/BUG-37.json`
- Sugerencia: Activar el rechazo de propiedades desconocidas en el deserializador.

## BUG-38 — Si el registro de un gasto falla, la interfaz no muestra ningún error

- Regla: RN-70, RN-71
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `/expenses/new`
- Precondiciones: Sesión de un empleado. Se simula una respuesta 500 del servidor interceptando la petición en el navegador.
- Pasos:
  1. Abrir New expense y completar el formulario.
  2. Hacer que POST /api/v1/expenses responda 500.
  3. Enviar.
- Resultado esperado: Se conservan los valores y aparece un mensaje que explica el fallo.
- Resultado obtenido: Los valores se conservan, pero no aparece mensaje, alerta ni indicación de error.
- Severidad: **Media**. Los datos se conservan, pero la persona no sabe si el gasto se guardó y puede repetirlo o abandonarlo.
- Prioridad: **Alta**. RN-71 pide respuesta visible ante un envío fallido.
- Reproducibilidad: 3/3 el 16-oct; Reproduce · 17 de oct, 00:21.
- Pruebas: UI-02
- Evidencia: `evidence/report/BUG-38/`
- Sugerencia: Mostrar un mensaje de error (role="alert") ante cualquier respuesta no exitosa del envío.

## BUG-39 — Se aceptan gastos de USD 25 o más sin recibo

- Regla: RN-20, Anexo E §4
- Rol y usuario: Employee, `employee3@spendwise.test`
- Dónde: `POST /api/v1/expenses`
- Precondiciones: Sesión de employee3. Reglas vigentes del Anexo E activas.
- Pasos:
  1. Registrar USD 24,99 sin recibo (control: debe aceptarse).
  2. Registrar USD 25 sin recibo.
  3. Registrar USD 80 sin recibo.
- Resultado esperado: USD 25 y USD 80 sin recibo no se aceptan y el mensaje explica el requisito.
- Resultado obtenido: USD 25 → 201 AutoApproved; USD 80 → 201 PendingApproval. El control de USD 24,99 se comporta bien.
- Severidad: **Alta**. La regla activa "Receipt required at $25+" no tiene efecto: se registran gastos sin comprobante y los de 25 a 49,99 se aprueban solos.
- Prioridad: **Alta**. Es una de las dos reglas vigentes del motor y el Anexo E da el ejemplo literal (USD 80 sin recibo no se acepta).
- Reproducibilidad: Hallado en la verificación final del 17-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: RCPT-01, RCPT-02, RCPT-03
- Evidencia: `evidence/report/api/BUG-39.json`
- Sugerencia: Evaluar requiresReceipt en el registro y rechazar con 400 cuando falte el recibo.

## BUG-40 — La pestaña Pending de My Expenses siempre aparece vacía

- Regla: RN-60, RN-70, Anexo F §1
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `/expenses → Pending`
- Precondiciones: Sesión de employee1 con al menos un gasto PendingApproval.
- Pasos:
  1. Registrar un gasto de USD 60 con recibo (queda PendingApproval).
  2. Abrir My Expenses.
  3. Pulsar la pestaña Pending.
- Resultado esperado: La pestaña lista los gastos PendingApproval del usuario.
- Resultado obtenido: La interfaz consulta status=Pending (estado reservado que nunca se asigna) y muestra "0 expenses · No expenses found."; la API con status=PendingApproval devuelve los gastos pendientes.
- Severidad: **Media**. El empleado no ve en la pestaña de pendientes los gastos que esperan decisión y recibe un "No expenses found." falso; puede verlos en All.
- Prioridad: **Alta**. RN-60 lo nombra de forma explícita y la corrección es cambiar el valor del filtro.
- Reproducibilidad: Hallado en la corrida completa del 17-oct; Reproduce · 17 de oct, 00:22.
- Pruebas: E2E-M13, MUT-STATE-06
- Evidencia: `evidence/report/api/BUG-40.json` y `evidence/report/BUG-40/`
- Sugerencia: Enviar status=PendingApproval desde la pestaña Pending.

## BUG-41 — La regla Block rechaza los montos por debajo del límite y deja pasar los que lo superan

- Regla: Anexo E §2, Anexo E §3
- Rol y usuario: Administrator y Employee, `admin@spendwise.test, employee3@spendwise.test`
- Dónde: `POST /api/v1/policies, POST /api/v1/expenses`
- Precondiciones: Sesión de admin. La regla se crea activa solo durante la prueba y se elimina al terminar; las dos reglas originales quedan intactas.
- Pasos:
  1. Crear una regla Block activa con maxAmount 100.
  2. Registrar como employee3 gastos de USD 150, 60 y 10 con recibo.
  3. Eliminar la regla.
- Resultado esperado: USD 150 (supera el límite) queda Rejected por Policy Engine; USD 60 y 10 no se bloquean.
- Resultado obtenido: USD 150 queda PendingApproval; USD 60 y USD 10 quedan Rejected por Policy Engine. La comparación está invertida. Una regla Block sin límite sí rechaza todo, como se espera.
- Severidad: **Alta**. La acción Block hace lo contrario de lo definido: rechaza gastos pequeños legítimos y deja pasar a aprobación los que superan el límite que se quería bloquear.
- Prioridad: **Alta**. Block es una de las tres acciones del motor; cualquier regla de este tipo que se active produce decisiones financieras erróneas.
- Reproducibilidad: Hallado en la ronda 6 del 17-oct (3/3 con límites 1000, 100 y 0,02); Reproduce · 17 de oct, 13:38.
- Pruebas: R6-INT-01
- Evidencia: `evidence/report/api/BUG-41.json`
- Sugerencia: Aplicar Block cuando amount > maxAmount y cubrir el borde con pruebas unitarias del motor.

## BUG-42 — Las decisiones automáticas no indican qué regla las produjo

- Regla: RN-31, RN-30
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `GET /api/v1/expenses/{id}/history`
- Precondiciones: Sesión de employee1.
- Pasos:
  1. Registrar un gasto de USD 10 (queda AutoApproved).
  2. Consultar su historial.
  3. Repetir con un gasto rechazado por una regla Block temporal.
- Resultado esperado: El historial o el detalle indica que decidió Policy Engine y el nombre de la regla ("Auto-approve under $50").
- Resultado obtenido: El historial dice "Auto-approved by policy" sin nombrar la regla; en los rechazos por Block el motivo queda vacío (null). El detalle del gasto no tiene ningún campo de regla.
- Severidad: **Media**. No se puede explicar por qué un gasto se aprobó o rechazó solo; la auditoría pierde trazabilidad, sin alterar importes.
- Prioridad: **Media**. RN-31 lo exige; con varias reglas activas sería imposible saber cuál decidió.
- Reproducibilidad: Hallado en la ronda 6 del 17-oct; Reproduce · 17 de oct, 13:31.
- Pruebas: R6-API-02
- Evidencia: `evidence/report/api/BUG-42.json`
- Sugerencia: Guardar el id y el nombre de la regla aplicada en el registro de auditoría.

## BUG-43 — Aprobar no admite el comentario opcional

- Regla: RN-41, RN-50
- Rol y usuario: Manager, `manager1@spendwise.test`
- Dónde: `PUT /api/v1/approvals/{id}/approve`
- Precondiciones: Un gasto PendingApproval de employee1; sesión de manager1.
- Pasos:
  1. Aprobar el gasto enviando {"comment": "R6 aprobado con comentario"}.
  2. Consultar el historial.
- Resultado esperado: El comentario queda registrado en el historial de la aprobación.
- Resultado obtenido: HTTP 200, pero el comentario se descarta: el historial guarda notes null. El OpenAPI no define cuerpo para approve.
- Severidad: **Media**. El aprobador no puede dejar constancia de por qué aprueba; la decisión queda sin contexto en la auditoría.
- Prioridad: **Media**. Funcionalidad definida en RN-41 que no existe; no bloquea el flujo.
- Reproducibilidad: Hallado en la ronda 6 del 17-oct; Reproduce · 17 de oct, 13:31.
- Pruebas: R6-API-10
- Evidencia: `evidence/report/api/BUG-43.json`
- Sugerencia: Aceptar un comentario opcional en approve y guardarlo en la auditoría.

## BUG-44 — El tablero suma gastos con fecha futura en el mes en curso

- Regla: RN-61
- Rol y usuario: Employee, `employee3@spendwise.test`
- Dónde: `GET /api/v1/dashboard/summary`
- Precondiciones: Sesión de employee3; quedan días por delante en el mes.
- Pasos:
  1. Consultar spendThisMonth.
  2. Registrar un gasto de USD 10 con fecha del último día del mes.
  3. Consultar spendThisMonth de nuevo.
- Resultado esperado: El gasto del mes no cambia, porque la fecha es futura.
- Resultado obtenido: El gasto del mes sube exactamente USD 10.
- Severidad: **Media**. El gasto del mes incluye montos que aún no ocurrieron; la cifra principal del tablero queda inflada.
- Prioridad: **Alta**. RN-61 lo menciona de forma explícita y afecta el indicador más visible.
- Reproducibilidad: Hallado en la ronda 6 del 17-oct; Reproduce · 17 de oct, 13:31.
- Pruebas: R6-API-12, R6-UI-04
- Evidencia: `evidence/report/api/BUG-44.json`
- Sugerencia: Limitar el cálculo del mes a fechas menores o iguales a hoy.

## BUG-45 — El error de carga de recibos no menciona todos los tipos aceptados

- Regla: RN-22, RN-21
- Rol y usuario: Employee, `employee2@spendwise.test`
- Dónde: `POST /api/v1/receipts/extract`
- Precondiciones: Sesión de employee2. Se usan pocos archivos pequeños por el costo del servicio de extracción.
- Pasos:
  1. Subir un archivo .txt.
  2. Subir una imagen GIF de 1×1 px.
  3. Subir un archivo vacío.
- Resultado esperado: El error del .txt lista los tipos aceptados (JPG, PNG, GIF, WEBP y PDF) y el archivo vacío se informa como vacío.
- Resultado obtenido: El error dice "Use JPG, PNG, PDF", pero el GIF se acepta (200); la pantalla New expense repite "JPG, PNG, PDF up to 10 MB". El archivo vacío responde "No file was uploaded."
- Severidad: **Baja**. Es un mensaje incorrecto: lleva a pensar que GIF y WEBP no se aceptan; no afecta importes ni estados.
- Prioridad: **Media**. RN-22 exige que los tipos mencionados sean los que realmente se aceptan; la corrección es de texto.
- Reproducibilidad: Hallado en la ronda 6 del 17-oct; Reproduce · 17 de oct, 13:31.
- Pruebas: R6-API-13
- Evidencia: `evidence/report/api/BUG-45.json`
- Sugerencia: Generar el mensaje desde la misma lista de tipos permitidos y distinguir archivo vacío de archivo ausente.

## BUG-47 — El botón "Export CSV" de My Expenses no hace nada

- Regla: RN-63
- Rol y usuario: Employee, `employee1@spendwise.test`
- Dónde: `/expenses → Export CSV`
- Precondiciones: Sesión de employee1.
- Pasos:
  1. Abrir My Expenses.
  2. Pulsar Export CSV y esperar seis segundos.
- Resultado esperado: Se descarga un CSV con los gastos del usuario.
- Resultado obtenido: No hay descarga, ni ventana nueva, ni petición de exportación. El mismo botón en Reports sí descarga.
- Severidad: **Media**. Se ofrece una función que no responde; el usuario puede exportar desde Reports.
- Prioridad: **Media**. RN-63 exige que todo botón de exportar que se ofrece funcione.
- Reproducibilidad: Hallado en la ronda 6 del 17-oct; Reproduce · 17 de oct, 13:46.
- Pruebas: R6-UI-06
- Evidencia: `evidence/report/BUG-47/`
- Sugerencia: Conectar el botón al servicio de exportación o quitarlo de la pantalla.

## BUG-48 — La interfaz muestra indicadores fijos que simulan métricas

- Regla: RN-62
- Rol y usuario: Employee, Manager y FinanceController, `employee1, employee3, manager1, finance`
- Dónde: `/dashboard, /expenses/new`
- Precondiciones: Sesiones de varios roles con datos distintos.
- Pasos:
  1. Abrir el tablero con employee1, employee3, manager1 y finance.
  2. Comparar "Avg. resolution" con la tasa de autoaprobación del mes.
  3. Abrir New expense y leer el texto de la captura asistida.
- Resultado esperado: Cada indicador se calcula con datos reales y cambia con ellos.
- Resultado obtenido: "Avg. resolution: 1.4 days" es idéntico para los cuatro roles (la tasa del mes varía entre 43 % y 72 %) y ninguna API lo entrega. New expense afirma "saves ~90 seconds per entry" y "OCR accuracy: 96%" como texto fijo.
- Severidad: **Media**. Se presentan como datos cifras que no salen del sistema; quien decide con ellas se apoya en información inventada.
- Prioridad: **Media**. RN-62 prohíbe expresamente textos fijos que simulen indicadores, tiempos medios o precisiones.
- Reproducibilidad: Hallado en la ronda 6 del 17-oct; Reproduce · 17 de oct, 13:46.
- Pruebas: R6-UI-01, R6-UI-03
- Evidencia: `evidence/report/BUG-48/`
- Sugerencia: Calcular el tiempo de resolución desde la auditoría y retirar las cifras de marketing o respaldarlas con datos.

## BUG-50 — Si falla la carga, la interfaz muestra listas vacías en lugar de un error

- Regla: RN-70
- Rol y usuario: Employee y FinanceController, `employee1, finance`
- Dónde: `/expenses, /approvals, /reports`
- Precondiciones: Se simula una respuesta 500 del servidor interceptando la petición en el navegador.
- Pasos:
  1. Hacer que GET /api/v1/expenses responda 500 y abrir My Expenses.
  2. Repetir con GET /api/v1/approvals/pending en Approvals.
  3. Repetir con GET /api/v1/reports en Reports.
- Resultado esperado: Cada pantalla muestra un mensaje de error que lo explica.
- Resultado obtenido: My Expenses muestra "0 expenses · No expenses found.", Approvals "All caught up!" y Reports totales en cero; ninguna menciona el error.
- Severidad: **Media**. Un aprobador ve "All caught up!" y cree que no tiene pendientes cuando en realidad la carga falló.
- Prioridad: **Alta**. RN-70 lo prohíbe de forma explícita; el tablero sí lo hace bien, así que la solución ya existe en la app.
- Reproducibilidad: Hallado en la ronda 6 del 17-oct; Reproduce · 17 de oct, 13:48.
- Pruebas: R6-UI-07, R6-UI-08, R6-UI-09
- Evidencia: `evidence/report/BUG-50/`
- Sugerencia: Distinguir error de lista vacía en las tres pantallas, como ya hace el tablero.

## Hallazgos descartados

- **BUG-30 — Login vacío sin error persistente.** La pantalla sí muestra "Email is required." y "Password is required." junto a cada campo, que queda marcado como inválido, y el foco pasa al campo Email. La prueba buscaba el data-testid login-error, que el Anexo G reserva para credenciales inválidas.
- **E2E-06 — Employee accede a Policy Engine por URL directa.** La revisión cuadro a cuadro mostró que la aplicación sí presenta la pantalla de acceso denegado. El fallo original venía de navegar antes de que la sesión terminara de establecerse; se corrigió la sincronización y la prueba pasa.
- **BUG-46 — El login no informa que la cuenta está bloqueada.** Descartado tras verificarlo con un bloqueo real de nomanager: la pantalla sí muestra "Your account is locked. Try again in 15 minutes.". La sospecha venía de simular la respuesta de la API sobre la ruta del servidor web, que tiene otro formato.
- **BUG-49 — No existe detalle del gasto con historial y recibo.** Descartado: al pulsar la fila de My Expenses se abre un panel lateral con los datos, el enlace "View receipt" y el historial de estados. Solo la URL directa /expenses/{id} no existe, y el anexo no la exige.
- **R6-UI-15 — La cookie de sesión no es httpOnly.** Falso positivo de la ronda 6: la prueba incluía sw_session_hint (vale "1" y no es sensible). La cookie de sesión real, sw_session, sí es httpOnly y no aparece en document.cookie.
- **R6-UI-18 — No aparece el estado de sesión expirada.** Falso positivo de la ronda 6: la prueba borraba todas las cookies, que equivale a no haber iniciado sesión. Al quitar o alterar solo sw_session, la app redirige al login con "Your session has expired".
- **R1 — Administrator lee todos los gastos y Finance registra gastos propios.** Son capacidades permitidas por el Anexo G §2.2 (Administrator lee todo en solo lectura; FinanceController tiene además el rol Employee).
- **R4 — categoryId null, parámetros repetidos o desconocidos y caracteres NUL.** El contrato permite categoryId null y no define el manejo de parámetros desconocidos ni restringe caracteres; se dejaron como mejoras (IMP-01, IMP-02) y no como defectos.
