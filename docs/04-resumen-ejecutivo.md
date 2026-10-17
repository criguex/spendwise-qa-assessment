# E4 — Resumen ejecutivo

## Recomendación

**No liberar esta versión.** Se puede reconsiderar cuando se corrijan y se vuelvan a probar los 17 defectos de severidad alta.

## Estado de la calidad

SpendWise cumple lo básico: las personas inician sesión, registran gastos, los aprueban y consultan reportes, y cada rol solo accede a lo que le corresponde. Las fallas están en las reglas que protegen el dinero y la confianza en las cifras. Se confirmaron 39 defectos (17 de severidad alta, 21 media y 1 baja). Todos se volvieron a ejecutar el 17 de octubre y siguen ocurriendo.

## Principales riesgos para el negocio

- **Gastos aprobados sin el control previsto.** Un gasto de exactamente 50 dólares se aprueba solo cuando debería revisarlo una persona; los gastos de 25 dólares o más se aceptan sin comprobante, y cualquier texto se toma como comprobante.
- **Decisiones que se pueden deshacer o tomar sin justificación.** Un gasto rechazado puede aprobarse después, se puede rechazar sin dar motivo, aprobar dos veces deja un registro falso en la auditoría y un gasto ya aprobado se puede borrar.
- **Información que no se puede creer.** Los totales de los reportes incluyen gastos rechazados, y la pestaña de pendientes del empleado siempre aparece vacía aunque tenga gastos esperando aprobación.
- **Datos que no deberían existir.** Se aceptan gastos en cero, negativos o sin datos obligatorios, y algunos datos mal escritos provocan errores del sistema en lugar de un mensaje claro.
- **Seguridad de los archivos exportados.** El archivo CSV puede contener fórmulas que se ejecutan al abrirlo en Excel.

## Qué hace falta para liberar

1. Corregir los 17 defectos de severidad alta.
2. Repetir sus pruebas (ya están automatizadas) y la regresión completa.
3. Para los defectos medios y bajos que queden abiertos, que negocio acepte el riesgo por escrito.

## Alcance

Se evaluaron la aplicación web y la API frente a las reglas de los anexos, con las cuentas de prueba de cada rol. No se hicieron pruebas de rendimiento ni de carga porque están fuera del alcance de la prueba.
