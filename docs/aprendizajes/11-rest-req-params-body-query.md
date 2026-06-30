# Estándar REST y el objeto `req` en Express

## 📌 El Estándar REST

- **URL**: Identifica al recurso (ej. `/usuarios/45`). No lleva verbos.
- **Verbo HTTP**: Define la acción (ej. GET para leer, PUT o PATCH para modificar).
- **Body**: Contiene los datos estructurados que se van a guardar o cambiar.

## ⚙️ En el Servidor (Express.js)

El objeto `req` (request) divide la URL y los datos en tres partes:

- **`req.params`**: Extrae las variables dinámicas incrustadas en la ruta (ej. el `45` de `/usuarios/:id`).
- **`req.query`**: Extrae los filtros opcionales que van después del signo `?` (ej. `?activo=true`).
- **`req.body`**: Extrae los datos del cuerpo de la petición (ej. `{ nombre: "Juan" }`).

## Ejemplo práctico

```
PATCH /api/evaluaciones/123
Body: { "estado_cumplimiento": "NA" }
```

En el controller:
```javascript
const id = req.params.id;                         // 123 (de la URL)
const { estado_cumplimiento } = req.body || {};   // "NA" (del body)
```

- El ID identifica QUÉ recurso modificar → viene de la URL
- El estado indica CON QUÉ VALOR modificarlo → viene del body
- Si hubiera filtros como `?workspace=1` → estarían en `req.query.workspace`

## Destructuring de objetos

```javascript
const { estado_cumplimiento } = req.body || {};
```

Esto es equivalente a:
```javascript
const estado_cumplimiento = req.body ? req.body.estado_cumplimiento : undefined;
```

Los `{}` en el lado izquierdo son destructuring (extraer propiedades de un objeto).
El `|| {}` a la derecha es protección: si `req.body` es null, usa un objeto vacío para no causar TypeError.
