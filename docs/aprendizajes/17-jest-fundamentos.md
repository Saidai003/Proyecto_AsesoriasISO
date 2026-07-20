Aquí tienes absolutamente todo el documento dentro de una única caja de código continua, utilizando un contenedor exterior especial de cuatro comillas invertidas para evitar que los bloques de JavaScript internos rompan la estructura al copiarlo:

```markdown
# Guía de Aprendizaje: Pruebas Unitarias con Jest

## ¿Qué es Jest?
Jest es un framework de pruebas unitarias para JavaScript creado por Meta/Facebook. Se utiliza para escribir pruebas automatizadas y garantizar que el código funcione correctamente. Ofrece funcionalidades como mocks, spies y assertions en un solo paquete (*Zero-Config*) para facilitar las pruebas de componentes y funciones aisladas.

---

## 1. Mocks, Spies y Assertions: Los Tres Pilares

Para validar el comportamiento del código sin depender de bases de datos reales o servidores externos, Jest utiliza tres conceptos clave:

* **Assertions (Afirmaciones):** Son las líneas de código que validan si el resultado obtenido coincide con el valor esperado. Es el "juez" de la prueba (`expect`).
* **Spies (Espías):** Son funciones que observan el comportamiento de un método real existente, registrando cuándo, cuántas veces y con qué argumentos se llama, sin alterar necesariamente su lógica original.
* **Mocks (Simulaciones):** Son objetos o funciones falsas que reemplazan por completo la lógica real para aislar el código y controlar sus respuestas de forma predecible.

---

## 2. Ciclo de Vida de las Pruebas

Los métodos de ciclo de vida preparan y limpian el entorno de pruebas para garantizar el **aislamiento total** entre escenarios:

* **`beforeEach(() => { ... })`**: Se ejecuta automáticamente **antes** de cada bloque `test()`. Se utiliza para preparar un terreno limpio (ej: `jest.resetAllMocks()`, borrando el historial de llamadas anteriores para que un test no contamine al siguiente).
* **`afterEach(() => { ... })`**: Se ejecuta automáticamente **después** de cada bloque `test()`. Se utiliza para limpiar el entorno (ej: borrar archivos temporales creados en el disco o restablecer fechas del sistema).

> **Nota:** Si hay 5 pruebas en un archivo, el código dentro de `beforeEach` y `afterEach` se ejecutará exactamente 5 veces.

---

## 3. Métodos Útiles y Matchers

### Funciones de Simulación (`jest.fn()`)
Sirven para crear funciones mock capaces de espiar llamadas y controlar valores de retorno.

| Método | Para qué sirve | Tipo de flujo |
| :--- | :--- | :--- |
| `jest.fn()` | Crea una función mock para espiar llamadas y valores de retorno. | Base |
| `mockResolvedValue(x)` | Simula una promesa exitosa que devuelve `x`. | Asíncrono (`async/await`) |
| `mockResolvedValueOnce(x)`| Simula una promesa exitosa **solo para la siguiente llamada**. | Asíncrono (`async/await`) |
| `mockRejectedValue(e)` | Simula un error o promesa rechazada. | Asíncrono (`async/await`) |
| `mockReturnValue(x)` | Devuelve un valor inmediato `x`. | Síncrono |
| `mockClear() / mockReset()`| Limpia el historial de llamadas entre pruebas. | Mantenimiento |

### Afirmaciones y Matchers con `expect()`
`expect(...)` envuelve el resultado que generó el código (o a un espía/mock) para evaluarlo contra un criterio estricto. Si la realidad difiere de lo declarado, la prueba falla e indica la línea exacta del error.

| Matcher de `expect()` | Para qué sirve |
| :--- | :--- |
| `.toBe(val)` | Evalúa igualdad estricta (tipos primitivos: números, booleanos, strings). |
| `.toEqual(obj)` | Evalúa igualdad de valor en estructuras complejas (objetos o arreglos). |
| `.toHaveBeenCalled()` | Verifica que una función espía/mock fue invocada al menos una vez. |
| `.toHaveBeenCalledWith(...)` | Verifica que la función fue invocada **exactamente con esos argumentos**. |
| `.toHaveBeenCalledTimes(n)` | Verifica cuántas veces exactas se ejecutó la función. |

---

## 4. Ejemplos Prácticos Básicos

### 1. Assertions (Afirmaciones directas)
Utilizan `expect()` combinado con un *matcher* para verificar resultados matemáticos o de lógica simple.

```javascript
const duplicar = (num) => num * 2;

test('Debería multiplicar el número por dos', () => {
  // El assertion valida que 4 * 2 sea estrictamente 8
  expect(duplicar(4)).toBe(8);
});
```

### 2. Spies (Espías)
Ideales para verificar si una función existente dentro de un objeto fue ejecutada por el código.

```javascript
const servicioEmail = {
  enviar: (usuario) => `Correo enviado a ${usuario}`
};

test('Debería registrar la llamada al envío de correo', () => {
  // Creamos el espía sobre el método real
  const spy = jest.spyOn(servicioEmail, 'enviar');
  
  servicioEmail.enviar('Carlos');

  // Verificamos que se ejecutó y con qué argumento
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith('Carlos');

  // Siempre restauramos el comportamiento original del método
  spy.mockRestore();
});
```

### 3. Mocks (Simulaciones)
Reemplazan funciones complejas o externas (como consultas a bases de datos o APIs) por respuestas estáticas e inmediatas.

```javascript
// Simulamos una función de consulta que normalmente iría a internet o BD
const obtenerPrecioProducto = jest.fn();

test('Debería procesar el pago con el precio simulado', () => {
  // Forzamos a que devuelva un valor síncrono controlado
  obtenerPrecioProducto.mockReturnValue(150);

  const totalConImpuesto = obtenerPrecioProducto() + 30;

  expect(totalConImpuesto).toBe(180);
  expect(obtenerPrecioProducto).toHaveBeenCalledTimes(1);
});
```

---

## 5. Casos de Uso Arquitectónicos en Node.js / Backend

La forma de utilizar `expect()` cambia según el tipo de código que se está evaluando:

### Caso A: Evaluación de Controladores de Express (`mockRes` y Espías)
En Express, los controladores no devuelven datos con la instrucción `return`; su trabajo es recibir una petición (`req`) y responderle al cliente invocando métodos del objeto respuesta (`res.status(200)`, `res.json(...)`).

* **¿Qué es `mockRes()`?** Es una función auxiliar que fabrica una réplica vacía del objeto respuesta de Express, equipando sus métodos con "espías" de Jest (`jest.fn()`). Permite ejecutar el controlador en memoria sin encender un servidor real.
* **¿Cómo se evalúa?** Como el controlador no retorna un valor, Jest **espía las llamadas que el código hizo hacia los métodos de respuesta**.

```javascript
// 1. Fabricamos una respuesta espía
const res = mockRes(); 
const req = { body: { nombre: 'Juan' } };

// 2. Ejecutamos el controlador
await crearUsuarioController(req, res);

// 3. Evaluamos ESPIANDO qué órdenes se le dieron al objeto "res"
expect(res.status).toHaveBeenCalledWith(201);
expect(res.json).toHaveBeenCalledWith({ mensaje: 'Usuario creado exitosamente' });
```

### Caso B: Evaluación de Funciones Puras o Librerías (Retorno Directo)
Las funciones auxiliares o middlewares de negocio (ej: `verifyWorkspaceAccess`) son **funciones puras de JavaScript**. No dependen de Express ni envían respuestas HTTP; toman parámetros y **devuelven directamente un valor** (`true`, `false`, un objeto o un número) mediante la instrucción `return`.

* **¿Cómo se evalúa?** No se utilizan espías de respuesta HTTP. Se ejecuta la función y se evalúa directamente el valor que retorna con `expect(...)`.
* **Validaciones tempranas (*Guard Clauses*):** Si la función recibe datos inválidos (como `null` o `0`), corta el flujo devolviendo `false` antes de tocar la base de datos, eliminando la necesidad de simular SQL.

```javascript
// La función evalúa parámetros inválidos y hace un "return false" inmediato
test('retorna false cuando falta el resourceId', async () => {
  // Evaluamos el RETORNO DIRECTO de la función, no un espía
  expect(await verifyWorkspaceAccess(null, 'nc', 1)).toBe(false);
  expect(await verifyWorkspaceAccess(0, 'nc', 1)).toBe(false);
});
```

---

## 6. Resumen Mental Rápido
* **¿Pruebo un Controlador Express?** $\rightarrow$ Uso `mockRes()` y evalúo con `expect(res.status).toHaveBeenCalledWith(...)`.
* **¿Pruebo una Función / Servicio?** $\rightarrow$ Ejecuto la función y evalúo su retorno con `expect(resultado).toBe(...)`.
* **¿Necesito limpiar el entorno entre pruebas?** $\rightarrow$ Utilizo `beforeEach(() => { jest.resetAllMocks(); })`.

```