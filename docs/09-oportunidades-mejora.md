# Oportunidades de mejora

Estas recomendaciones no se contabilizan como defectos. Se
registran porque endurecen el producto, el contrato o su operabilidad aun cuando el anexo no define
un resultado obligatorio suficientemente preciso.

| ID | Área | Mejora | Beneficio | Criterio de aceptación |
|---|---|---|---|---|
| IMP-01 | API / paginación | Definir y documentar un máximo de `pageSize` | Evita respuestas excesivas y hace predecible el contrato | OpenAPI declara mínimo/máximo; API devuelve 400 al excederlo |
| IMP-02 | API / búsqueda | Normalizar o rechazar caracteres de control NUL/LF/CR | Reduce diferencias entre clientes, logs y motores | Entrada se normaliza o responde 400 documentado |
| IMP-03 | API / errores | Usar Problem Details uniforme para todos los 4xx | Facilita integración, soporte y automatización | 4xx incluyen code, message, campo y correlationId |
| IMP-04 | UI / automatización | Extender `data-testid` a filtros, paginación y formularios | Reduce fragilidad sin sustituir accesibilidad | Controles críticos tienen nombre accesible y test ID estable |
| IMP-05 | UI / navegación | Añadir acciones claras en la página 404 | Mejora recuperación ante enlaces obsoletos | 404 ofrece Dashboard/Back sin datos protegidos |
| IMP-06 | UI / formulario | Advertir antes de abandonar cambios sin enviar | Evita pérdida accidental sin implementar borradores | Back/Refresh confirman solo si hay cambios |
| IMP-07 | QA / CI | Publicar mutation score como indicador gradual | Detecta regresiones de validación | CI publica score y sobrevivientes; umbral sube gradualmente |
| IMP-08 | QA / evidencia | Separar artefactos por corrida/agente | Evita colisiones durante paralelismo | Cada job usa `outputDir` único y consolida después |

## Evidencia y origen

- IMP-01/02: `MUT-EXPQ-05/08` dieron 200, pero no son bugs porque el anexo no fija esos límites.
- IMP-03: se observaron errores vacíos, mensajes genéricos y cuerpos estructurados.
- IMP-04: fuera de los test IDs obligatorios, varios controles dependen de estructura visual.
- IMP-05: `MUT-STATE-08` confirmó un 404 seguro; la propuesta mejora recuperación.
- IMP-06: refresh/back respetan “no hay borrador”; la confirmación sería protección de UX.
- IMP-07: score inicial 37,5% sobre 16 mutantes.
- IMP-08: una colisión `ENOENT` apareció entre corridas concurrentes; es mejora de la suite, no de SpendWise.
