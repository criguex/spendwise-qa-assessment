# E4 — Resumen ejecutivo

## Estado de calidad

Evaluación ampliada el 16 de octubre de 2026. La automatización creció de 46 a 104 pruebas (+124%) en 20 archivos. La regresión integral de 103 pruebas obtuvo 81 aprobadas y 22 fallidas; el caso adicional de seguridad CSV se ejecutó de forma aislada y confirmó un fallo más. Los resultados son trazables a 13 defectos confirmados. Postman/Newman conserva 15 solicitudes y 25 aserciones. E2E-06 fue corregido como falso positivo de sincronización: la pantalla de acceso denegado sí funciona.

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

## Recomendación final

**NO GO condicionado.** No se recomienda liberar mientras permanezcan abiertos los ocho defectos de severidad alta relacionados con integridad financiera, validación, políticas, eliminación de estados finales, cálculo de reportes y seguridad CSV. Después de corregirlos debe ejecutarse retest dirigido y regresión completa. Los cinco hallazgos medios requieren aceptación explícita del riesgo si no se corrigen antes de producción.

## Cobertura y evidencia

- Componentes: 5/5 aprobadas.
- Contrato: 2/6 aprobadas; 4 fallos por incumplimiento documentado.
- API: cobertura ampliada de autenticación, sesión, consultas, recibos, aprobaciones, dashboard, reportes y RBAC.
- Integración: políticas completas con cleanup, analítica cruzada, visibilidad y ciclo de vida.
- E2E: 25 escenarios sobre autenticación, accesibilidad, cuatro roles, todos los módulos, descarga CSV y rutas prohibidas.
- Postman/Newman: 20/25 aserciones aprobadas; 5 defectos reproducidos.

