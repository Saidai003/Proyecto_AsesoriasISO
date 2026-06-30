# DT-004: Console.logs de debug en producción

**Severidad:** Baja  
**Tipo:** Limpieza  
**Archivo(s):** `backend-js/src/controllers/accionesController.js`

## Problema

Hay `console.log` explícitos que imprimen queries SQL completas y parámetros:

```js
console.log('getActionHistory sql:', sql)
console.log('getActionHistory params length:', allParams.length, 'params:', allParams)
```

En producción esto llena los logs innecesariamente y podría exponer información sensible (parámetros de queries).

## Solución propuesta

Eliminar los `console.log` de debug, o condicionarlos:

```js
if(process.env.NODE_ENV !== 'production') {
  console.log('getActionHistory sql:', sql)
}
```

## Estado

Pendiente
