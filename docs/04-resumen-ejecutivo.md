# E4 — Resumen ejecutivo

## Recomendación

**No liberar esta versión.** Se puede reconsiderar cuando se corrijan y se vuelvan a probar los 18 defectos de severidad alta.

## Estado de la calidad

SpendWise cumple lo básico: las personas inician sesión, registran gastos, los aprueban y consultan reportes, y cada rol solo accede a lo que le corresponde. Las fallas están en las reglas que protegen el dinero y en la confianza en las cifras. Se confirmaron 47 defectos (18 de severidad alta, 27 media y 2 baja). Todos se volvieron a ejecutar el 17 de octubre y siguen ocurriendo.

## Principales riesgos para el negocio

- **Gastos aprobados o rechazados por las razones equivocadas.** Un gasto de exactamente 50 dólares se aprueba solo cuando debería revisarlo una persona; los gastos de 25 dólares o más se aceptan sin comprobante; y una regla de bloqueo hace lo contrario de lo previsto: rechaza los gastos pequeños y deja pasar los que superan el límite.
- **Decisiones que no son definitivas.** Un gasto ya aprobado, rechazado o aprobado automáticamente puede cambiar de decisión o borrarse; se puede rechazar sin dar motivo y el historial no siempre refleja lo que pasó.
- **Cifras que no se pueden creer.** Los reportes y el tablero suman gastos rechazados y gastos con fecha futura; algunos indicadores son textos fijos que no salen de los datos; y cuando una pantalla no logra cargar, muestra "no hay pendientes" en lugar de un error.
- **Decisiones sin contexto.** Quien aprueba no ve quién envió el gasto, no puede dejar un comentario al aprobar y las decisiones automáticas no indican qué regla las tomó.
- **Seguridad de los archivos exportados.** El archivo CSV puede contener fórmulas que se ejecutan al abrirlo en Excel.

## Qué hace falta para liberar

1. Corregir los 18 defectos de severidad alta.
2. Repetir sus pruebas (ya están automatizadas) y la regresión completa.
3. Para los defectos medios y bajos que queden abiertos, que negocio acepte el riesgo por escrito.

## Alcance

Se evaluaron la aplicación web y la API frente a las reglas de los anexos, con las cuentas de prueba de cada rol. No se hicieron pruebas de rendimiento ni de carga porque están fuera del alcance de la prueba.
