# Pruebas de escenarios mutantes

## Objetivo

Medir la fortaleza de las validaciones black-box de SpendWise. Cada escenario parte de un gasto
válido y aplica exactamente un operador de mutación. El mutante se considera **muerto** cuando la
API lo rechaza con el `400` esperado; **sobrevive** cuando la entrada inválida es aceptada o provoca
un `5xx`. Un sobreviviente es evidencia para análisis, no automáticamente un defecto nuevo: primero
se consolida con hallazgos existentes para evitar duplicados.

Esto no es mutation testing del código fuente con Stryker: el backend no forma parte del repositorio.
Es mutación determinista de solicitudes y contratos, apropiada para una evaluación black-box.

## Operadores implementados

| Operador | Ejemplos | Riesgo cubierto |
|---|---|---|
| Delete | quitar description, amount o date | obligatoriedad y valores por defecto inseguros |
| Replace | espacios, null, vacío, fecha malformada | normalización y semántica |
| Boundary | 501 caracteres, 0, -0.01, 1.001 | límites y precisión financiera |
| Type | objeto en description, string en amount, número en date | coerción y deserialización |
| Reference | categoryId inexistente | integridad referencial y manejo de errores |
| Trust boundary | receiptUrl externa sin upload | elusión del control de comprobantes |

El catálogo vive en `src/data/expense-mutants.ts`; sus invariantes se prueban como componente y
cada mutante aparece como caso independiente en el reporte Playwright.

## Ejecución

```bash
npm run test:mutation
```

La ejecución es serial para mantener trazabilidad y evitar carga. No genera combinaciones aleatorias,
no intenta DoS y no muta simultáneamente varios campos. El mutation score se calcula así:

```text
mutation score = mutantes muertos / mutantes ejecutados × 100
```

Los mutantes que sobreviven porque el producto crea un recurso pueden dejar datos identificables por
su prefijo `MUT-EXP-`. Es una limitación explícita del entorno: intentar borrarlos ocultaría o agravaría
el defecto que permite eliminar estados finales.

## Resultado ejecutado — 16 de octubre de 2026

- Mutantes de API ejecutados: **16**.
- Muertos correctamente: **6** (`01`, `03`, `04`, `12`, `13`, `14`).
- Sobrevivientes: **10** (`02`, `05` a `11`, `15`, `16`).
- Mutation score: **37,5%**.
- Pruebas de integridad del catálogo: **2/2 aprobadas**.
- Fallos de infraestructura: **0**.

Los controles sí matan descripción ausente/nula/tipo objeto y fechas vacía, malformada o numérica.
Sobreviven espacios en descripción, longitud excesiva, amount ausente/cero/negativo/precisión inválida,
amount como string numérico, fecha ausente, categoría inexistente y comprobante externo falsificado.
Los resultados consolidan BUG-02, BUG-03, BUG-11, BUG-14 y BUG-15. La coerción de string numérico se
incorpora al alcance de BUG-14 como validación débil de tipos, evitando duplicar un mismo defecto raíz.
