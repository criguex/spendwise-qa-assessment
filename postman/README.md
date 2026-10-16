# Colección Postman/Newman

La colección complementa Playwright y cubre autenticación, contratos de datos, comportamiento, límites y RBAC.

## Preparación segura

Importe la colección y el environment. Complete localmente estas variables secretas:

- `proxyUser`
- `proxyPassword`
- `seedPassword`

No exporte nuevamente el environment después de llenarlo.

## Newman

```bash
newman run postman/SpendWise-QA.postman_collection.json \
  -e postman/SpendWise-QA.postman_environment.json \
  --env-var proxyUser="$SPENDWISE_PROXY_USER" \
  --env-var proxyPassword="$SPENDWISE_PROXY_PASSWORD" \
  --env-var seedPassword="$SPENDWISE_SEED_PASSWORD" \
  --insecure
```

Los tests expresan el resultado esperado. Los defectos confirmados producen fallos y no deben “corregirse” cambiando la expectativa.
