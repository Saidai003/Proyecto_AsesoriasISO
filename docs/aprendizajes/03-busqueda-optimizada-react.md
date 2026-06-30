# Buscador Optimizado en React

### 1. Inicialización del Estado y Cache (`useState` y `useMemo`)
*   `React.useState('')` inicializa la variable de estado `q` con un texto vacío.
*   `React.useMemo` envuelve la lógica para almacenar en caché el resultado del filtrado. Evita que se reprocese la lista en cada renderizado, ejecutándose únicamente cuando cambian las dependencias (`q`, `users` o `workspaces`).

### 2. Protección Contra Nulos en Arrays (`users || []`)
Si `users` es `null` o `undefined`, el operador `||` lo sustituye por un array vacío `[]`. Permite que `.filter()` se ejecute sin romper la app.

### 3. Normalización a Minúsculas (`toLowerCase`)
Se realiza solo a nivel interno dentro del filtro para búsqueda Case Insensitive. No afecta la apariencia visual.

### 4. Cruce de Datos mediante Identificadores (`find`)
```javascript
const ws = workspaces && workspaces.find(w => w.id === u.workspace_id)
```
Relaciona dos colecciones independientes buscando coincidencia por ID.

### 5. Acceso a Propiedades de Configuración (`.label`)
La lista `ROLE_OPTIONS` almacena objetos `{ id: 1, label: 'Administrador' }`. El buscador accede a `.label` porque ahí está el texto legible para filtrar.

### 6. Sintaxis Moderna (Optional Chaining + Nullish Coalescing)
```javascript
const role = (ROLE_OPTIONS.find(r => r.id === u.role_id)?.label ?? '').toLowerCase()
```
Simplifica las protecciones contra null con `?.` y `??`.

### 7. Comprobación de Contenido (`.includes`)
Verifica si un string contiene una subcadena. Al encadenar con `||`, se busca en múltiples campos simultáneamente.
