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

