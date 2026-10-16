# Observación no funcional segura

## Límite del ejercicio

El enunciado excluye pruebas de rendimiento y carga y prohíbe carga o denegación de servicio. Por esa razón no se ejecutaron usuarios concurrentes, ráfagas, estrés, endurance, volumen ni búsquedas de capacidad. Esta decisión protege el entorno y cumple las reglas de la evaluación.

## Observación serial ejecutada

El 16 de octubre de 2026 se realizó una sola llamada por endpoint crítico, de manera secuencial, desde el equipo del candidato. No es una prueba formal, no establece SLA y no permite inferir percentiles ni capacidad.

| Operación | Estado | Tiempo observado |
|---|---:|---:|
| POST `/api/v1/auth/login` | 200 | 118 ms |
| GET `/api/v1/dashboard/summary` | 200 | 83 ms |
| GET `/api/v1/reports` | 200 | 246 ms |
| GET `/api/v1/expenses?page=1&pageSize=20` | 200 | 83 ms |
| GET `/api/v1/approvals/pending` | 200 | 79 ms |

## Interpretación

Las cinco solicitudes respondieron correctamente en esta única observación. Reportes fue la operación más lenta de la muestra (246 ms), pero no existe base estadística ni SLA para clasificarlo como defecto. Una evaluación formal requeriría autorización expresa, objetivos de carga, volumen de datos, percentiles, entorno controlado y monitoreo de servidor.
