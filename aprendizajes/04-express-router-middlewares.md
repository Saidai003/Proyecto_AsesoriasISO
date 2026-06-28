# Estructura y Flexibilidad de un Router en Express.js

## Conclusiones Clave

*   **Flexibilidad Absoluta:** Un router acepta cantidad indefinida de middlewares separados por comas.
*   **Middlewares (Los Guardianes):** Reciben `req`, `res`, `next`. Llaman a `next()` para dar paso o responden directamente si falla una validación.
*   **Handlers (El Destino Final):** Reciben `req` y `res`. Dan la respuesta definitiva al cliente.

## Fragmentos de Código

### 1. Flujo Básico (solo ruta + handler)
```javascript
router.get('/ping', (req, res) => {
    res.send('pong'); 
});
```

### 2. Múltiples Middlewares
```javascript
router.post('/dashboard', 
    verificarToken,    // Middleware 1 (llama a next)
    comprobarPremium,  // Middleware 2 (llama a next)
    (req, res) => {    // Handler Final
        res.json({ status: "Acceso concedido" }); 
    }
);
```

### 3. Anatomía de un Middleware vs un Handler
```javascript
// MEDIADOR: Valida y cede el paso con next()
const esAdulto = (req, res, next) => {
    if (req.body.edad >= 18) next();
    else res.status(403).send('Acceso denegado');
};

// HANDLER: Ejecuta la acción y cierra el ciclo
const verContenido = (req, res) => {
    res.json({ video: "Película Premium" });
};

router.get('/cine', esAdulto, verContenido);
```
