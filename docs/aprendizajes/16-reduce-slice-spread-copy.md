# reduce, slice sin argumentos, y copia con spread

> **Fecha:** 30/06/2026  
> **Contexto:** Entender patrones de transformación de arreglos usados en ActionKanbanBoard.jsx

---

## reduce — acumular un arreglo en un solo valor

> Referencia oficial: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce

`reduce` recorre un arreglo y va construyendo algo (un número, un objeto, otro arreglo) pasándolo de iteración en iteración:

```js
arreglo.reduce((acumulador, elementoActual) => {
  // hacer algo con acumulador y elementoActual
  return nuevoAcumulador
}, valorInicial)
```

Ejemplo numérico:
```js
[1, 2, 3].reduce((acc, n) => acc + n, 0)
// Paso 1: acc=0, n=1 → 1
// Paso 2: acc=1, n=2 → 3
// Paso 3: acc=3, n=3 → 6
// Resultado: 6
```

Ejemplo real del proyecto — agrupar acciones por estado para el Kanban:
```js
KANBAN_STATES.reduce((acc, state) => {
  acc[state] = threads.filter(t => t.estado_accion === state)
  return acc
}, {})
// Resultado: { Pendiente: [...], En_Progreso: [...], Eficaz: [...], No_Eficaz: [...] }
```

El acumulador empieza como `{}` (objeto vacío) y en cada iteración se le agrega una clave con las acciones filtradas para ese estado.

---

## slice() sin argumentos — copia superficial

`.slice()` sin argumentos **no corta nada**. Retorna una copia completa del arreglo:

```js
const original = [1, 2, 3]
const copia = original.slice()
// copia === [1, 2, 3]  pero es un arreglo nuevo, no el mismo
```

**¿Para qué?** Porque `.sort()` muta el arreglo original. En React, mutar estado directamente causa bugs. Entonces:

```js
// ❌ Malo: muta el arreglo original
threads.filter(...).sort(...)

// ✅ Seguro: copia primero, ordena la copia
threads.filter(...).slice().sort(...)
```

---

## [...arreglo] — copia con spread (equivalente a slice)

El spread `...` dentro de corchetes `[]` crea una copia superficial del arreglo:

```js
const original = [1, 2, 3]
const copia = [...original]
// Mismo resultado que original.slice()
```

Ambas formas son equivalentes:
```js
const copiaA = threads.slice()    // forma clásica
const copiaB = [...threads]       // forma moderna (spread)
```

**Importante:** el spread de arreglo va dentro de `[]`, no suelto:
```js
const copia = [...threads]   // ✅ correcto
const copia = ...threads     // ❌ error de sintaxis
```

---

## sort con función comparadora

En JS no existe `ASC`/`DESC` como en SQL. Se usa una función que retorna un número:

```js
arreglo.sort((a, b) => Number(a.id) - Number(b.id))
```

- Resultado negativo → `a` va primero (ascendente)
- Resultado positivo → `b` va primero (descendente)

Para invertir el orden (descendente):
```js
arreglo.sort((a, b) => Number(b.id) - Number(a.id))
```

---

## Resumen de equivalencias

| Lo que hace | Forma A | Forma B |
|---|---|---|
| Copiar arreglo | `arr.slice()` | `[...arr]` |
| Ordenar ascendente | `.sort((a,b) => a.id - b.id)` | SQL: `ORDER BY id ASC` |
| Acumular en objeto | `.reduce((acc, x) => {...}, {})` | Un loop con `for` que construye un objeto |
