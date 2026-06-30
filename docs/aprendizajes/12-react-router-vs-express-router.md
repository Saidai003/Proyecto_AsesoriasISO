# React Router vs Express Router

> **Fecha:** 29/06/2026  
> **Contexto:** Entender cómo se conectan frontend y backend en la plataforma

---

## Concepto clave

Son dos sistemas de ruteo independientes que operan en lados distintos:

- **React Router** (frontend): decide qué componente mostrar en el browser según la URL.
- **Express Router** (backend): decide qué función ejecutar en el servidor según el HTTP request que llega.

Se conectan únicamente por HTTP (fetch).

---

## React Router — ruteo de vistas

Decide qué se ve en pantalla. No recarga la página, solo cambia el componente renderizado.

### Ejemplo real: usuario clickea "Ver" en brecha #42

```
Usuario clickea "Ver" en la tabla de brechas (RequirementContent.jsx)
        ↓
navigate('/nc/42')           ← cambia la URL en el browser (sin recargar página)
        ↓
React Router matchea:   <Route path="/nc/:id" element={<NCView/>} />   (App.jsx)
        ↓
Renderiza NCView        ← useParams() extrae { id: "42" }
        ↓
NCView se monta → su useEffect lanza fetchWithAuth('/api/nc/42')
```

### Definición de la ruta (App.jsx)

```jsx
<Route path="/nc/:id" element={<Protected><NCView/></Protected>} />
```

### Navegación desde RequirementContent.jsx

```jsx
<button onClick={() => { navigate(`/nc/${nc.id}`) }}>Ver</button>
```

`nc.id` viene de la lista de brechas cargada previamente del backend con:
```jsx
const ncr = await fetchWithAuth(`/api/nc/evaluacion/${evId}`)
const list = await ncr.json()
setNcList(list || [])
```

### useParams() en NCView.jsx

```jsx
const { id } = useParams()  // extrae "42" de la URL /nc/42
```

---

## Express Router — ruteo de operaciones

Decide qué función del servidor ejecuta. Recibe HTTP requests y devuelve JSON.

### Ejemplo real: NCView hace PATCH para editar brecha #42

```
Llega HTTP:  PATCH /api/nc/42  con body JSON y JWT en header Authorization
        ↓
index.js matchea prefijo:   app.use('/api/nc', ncRouter)   (src/index.js)
        ↓
ncRouter matchea el resto:  router.patch('/:id', requireAuth, updateNC)   (routes/nc.js)
        ↓
requireAuth            ← middleware que valida JWT, inyecta req.user, llama next()
        ↓
updateNC(req, res)     ← req.params.id = "42", req.body = payload del frontend
        ↓
Valida ownership (IDOR) → UPDATE DB → INSERT historial → notifica → res.json(ncActualizada)
```

### Montaje de routers en index.js (src/index.js)

`index.js` es el punto de entrada del backend. Monta cada router en su prefijo:

```js
app.use('/api/nc', ncRouter);           // todo /api/nc/* va al ncRouter
app.use('/api/acciones', accionesRouter); // todo /api/acciones/* va al accionesRouter
app.use('/api/users', usersRouter);     // etc.
```

Sin esto, Express no sabría a qué router enviar cada request.

### Definición de la ruta dentro del router (routes/nc.js)

```js
router.patch('/:id', requireAuth, updateNC);
```

El router solo ve la parte después del prefijo. Cuando llega `PATCH /api/nc/42`, index.js consume `/api/nc` y el router recibe `/:id` = `42`.

### El controller (ncController.js)

```js
async function updateNC(req, res) {
  const id = Number(req.params.id)          // ← el "42" de la URL
  const payload = req.body || {}            // ← lo que envió el frontend
  // valida, actualiza DB, responde JSON
}
```

---

## Resumen visual del flujo completo

```
[Browser]                              [Servidor]
    │                                      │
    │  1. navigate('/nc/42')               │
    │  → React Router renderiza NCView     │
    │                                      │
    │  2. fetchWithAuth('PATCH /api/nc/42')─────→  3. index.js matchea prefijo '/api/nc'
    │                                      │       → ncRouter matchea '/:id'
    │                                      │       → requireAuth (JWT ok)
    │                                      │       → updateNC (lógica de negocio)
    │                                      │
    │  4. res.json(ncActualizada)  ←───────────── responde JSON
    │  → setNc(updated)                    │
    │  → React re-renderiza con datos nuevos│
```

---

## Regla práctica

Una vez que entiendes este flujo, lo que cambia entre funcionalidades es solo la lógica de negocio dentro del controller (qué valida, qué tablas toca, qué notificaciones crea). La fontanería (React Router → fetch → Express Router → middleware → controller → respuesta) es siempre la misma.
