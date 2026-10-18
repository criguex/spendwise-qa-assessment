# E4 — Resumen ejecutivo

## Estado de la calidad

SpendWise cumple lo básico: las personas inician sesión, registran gastos, los aprueban y consultan reportes, y cada rol solo accede a lo que le corresponde. Los problemas están en las reglas que protegen el dinero y en la confianza en las cifras. Se confirmaron 47 defectos (18 de severidad alta, 27 media y 2 baja), todos reproducidos el 17 de octubre.

## Principales riesgos para el negocio

- **Gastos aprobados o rechazados por las razones equivocadas.** Un gasto de exactamente 50 dólares se aprueba solo cuando debería revisarlo una persona; los gastos de 25 dólares o más se aceptan sin comprobante; y una regla de bloqueo hace lo contrario de lo previsto: rechaza los gastos pequeños y deja pasar los que superan el límite.
- **Decisiones que no son definitivas.** Un gasto ya aprobado, rechazado o aprobado automáticamente puede cambiar de decisión o borrarse, y se puede rechazar sin dar motivo.
- **Cifras que no se pueden creer.** Los reportes y el tablero suman gastos rechazados y gastos con fecha futura; algunos indicadores son textos fijos que no salen de los datos; y cuando una pantalla no logra cargar, muestra "no hay pendientes" en lugar de un error.
- **Decisiones sin contexto.** Quien aprueba no ve quién envió el gasto, no puede dejar un comentario al aprobar y las decisiones automáticas no indican qué regla las tomó.
- **Seguridad de los archivos exportados.** El archivo CSV puede contener fórmulas que se ejecutan al abrirlo en Excel.

## Cómo se soluciona

1. **Ajustar el motor de reglas** para que compare los montos como dicen las políticas, exija el comprobante y registre qué regla tomó cada decisión.
2. **Cerrar las decisiones:** un gasto solo se aprueba, rechaza o borra mientras está pendiente, el rechazo siempre lleva motivo y cada decisión queda registrada una sola vez.
3. **Validar los datos al recibirlos,** para que un dato incorrecto se rechace con un mensaje claro en lugar de guardarse o provocar un error del sistema.
4. **Calcular reportes y tablero solo con gastos válidos del periodo** y proteger el archivo CSV contra fórmulas.
5. **Completar la interfaz:** mostrar quién envió cada gasto, ofrecer solo las acciones que el rol puede usar y avisar cuando algo falla.

Cada punto tiene ya pruebas automatizadas que confirman la solución en cuanto se aplique. El detalle técnico está en la sección 9 del informe de QA.

## Salida a producción

Liberar con condiciones: cuando los puntos 1 a 3 estén resueltos y sus pruebas pasen.

## Alcance

Se evaluaron la aplicación web y la API frente a las reglas de los anexos, con las cuentas de prueba de cada rol. No se hicieron pruebas de rendimiento ni de carga porque están fuera del alcance de la prueba.
