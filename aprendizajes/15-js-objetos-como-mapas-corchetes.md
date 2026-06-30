# Objetos JS como mapas: notación de corchetes con strings

> **Fecha:** 29/06/2026  
> **Contexto:** Diferencia entre arreglos (index numérico) y objetos (clave string) en JS

---

## En C/Java/Python

`algo[i]` siempre requiere un entero. Es acceso posicional a un arreglo.

```c
int arr[5] = {10, 20, 30, 40, 50};
arr[2]; // → 30 (tercer elemento)
```

## En JavaScript

Los **arreglos** sí usan enteros:
```js
const arr = ['a', 'b', 'c']
arr[0] // → 'a'
```

Pero los **objetos** usan strings como clave (como un diccionario/mapa):
```js
const obj = { nombre: 'Juan', edad: 25 }
obj['nombre']  // → 'Juan'
obj.nombre     // → 'Juan' (equivalente)
```

## Por qué existe `obj[variable]`

La notación de punto (`obj.nombre`) requiere que la clave sea literal. La de corchetes permite usar una **variable** como clave:

```js
const campo = 'nombre'
obj[campo]  // → 'Juan'   (equivalente a obj['nombre'])
obj.campo   // → undefined (busca literalmente la clave "campo")
```

## Ejemplo real en el proyecto

```js
const action = { accion: 'Corregir proceso', contenido_comentario: 'Texto', requiere_nueva_nc: 0 }
const editableFields = ['accion', 'contenido_comentario', 'requiere_nueva_nc']

for (const f of editableFields) {
  const oldValue = action[f]  // ← f es un string, accede dinámicamente al campo
  // f = 'accion'        → action['accion']        → 'Corregir proceso'
  // f = 'requiere_nueva_nc' → action['requiere_nueva_nc'] → 0
}
```

## Regla mental

- `algo[número]` → acceso a arreglo (posición)
- `algo['string']` o `algo[variable]` → acceso a objeto (clave)

En JS, los arreglos son técnicamente objetos también, por eso ambas sintaxis usan corchetes. La diferencia es semántica: arreglos tienen índices numéricos ordenados, objetos tienen claves string sin orden garantizado.
