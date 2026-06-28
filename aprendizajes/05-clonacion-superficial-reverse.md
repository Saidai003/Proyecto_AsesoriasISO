# Clonación superficial antes de `reverse()`

En `accionesController.js`, al eliminar una acción correctiva y sus descendientes:

```javascript
const ordered = [...toDelete].reverse()
```

### ¿Por qué `[...toDelete]`?

`reverse()` **muta** el arreglo original in-place. Los arreglos en JavaScript se pasan **por referencia** (ambas variables apuntan al mismo objeto en heap). Sin la copia, `toDelete` quedaría invertido y la respuesta `{ deletedIds: toDelete }` devolvería el orden incorrecto.

### Heap
En Node.js, el heap es la región de RAM donde se almacenan objetos y estructuras dinámicas. Los arreglos viven aquí y las variables solo guardan una referencia (puntero) a esa ubicación.

### Mitigación
Clonación superficial obligatoria con spread (`[...toDelete]`) antes de `.reverse()`.
