# E4 — Resumen ejecutivo

## Estado de calidad

Evaluación ampliada el 16 de octubre de 2026. La automatización creció de 46 a 119 pruebas (+159%) en 23 archivos. La regresión integral obtuvo 86 aprobadas y 33 fallidas en 4,1 minutos; los fallos corresponden a incumplimientos reproducibles agrupados en 21 defectos confirmados. La campaña exploratoria añadió 15 controles dirigidos y consolidó ocho defectos nuevos. Postman/Newman conserva 15 solicitudes y 25 aserciones. E2E-06 fue corregido como falso positivo de sincronización: la pantalla de acceso denegado sí funciona.

## Riesgos principales

- La API persiste gastos con monto cero, negativo o precisión inválida.
- Entradas fuera de longitud y paginación inválida producen HTTP 500.
- El motor permite crear reglas con datos inválidos.
- Un gasto `AutoApproved`, considerado final, puede eliminarse y perder trazabilidad.
- Existen divergencias de contrato en identificadores, categorías y Swagger.
- La navegación presenta inconsistencias de deep link y permisos visibles por rol.
- Los reportes incluyen gastos rechazados y presentan totales financieros inflados.
- La exportación CSV no neutraliza prefijos de fórmula controlados por el usuario.
- Una categoría inexistente provoca HTTP 500 en lugar de validación 400.
- Campos obligatorios vacíos/ausentes y comprobantes falsos se aceptan y persisten.
- La cola no identifica al solicitante y Finance recibe controles de escritura no autorizados.
- La UI comunica mal el borde de USD 50 y ofrece Delete en estados finales.

## Recomendación final

**NO GO condicionado.** No se recomienda liberar mientras permanezcan abiertos los once defectos de severidad alta relacionados con integridad financiera, validación, políticas, comprobantes, trazabilidad de aprobación, eliminación de estados finales, cálculo de reportes y seguridad CSV. Después de corregirlos debe ejecutarse retest dirigido y regresión completa. Los diez hallazgos medios requieren aceptación explícita del riesgo si no se corrigen antes de producción.

## Cobertura y evidencia

- Componentes: 5/5 aprobadas.
- Contrato: 2/6 aprobadas; 4 fallos por incumplimiento documentado.
- API: cobertura ampliada de autenticación, sesión, consultas, recibos, aprobaciones, dashboard, reportes y RBAC.
- Integración: políticas completas con cleanup, analítica cruzada, visibilidad y ciclo de vida.
- E2E: 31 escenarios sobre autenticación, accesibilidad, cuatro roles, todos los módulos, descarga CSV, rutas prohibidas y exploratorias UI.
- Postman/Newman: 20/25 aserciones aprobadas; 5 defectos reproducidos.

