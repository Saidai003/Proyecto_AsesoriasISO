# Introducción a React

React es una librería de JavaScript para construir interfaces de usuario. Su principal ventaja es que es **declarativa**: tú defines cómo quieres que se vea tu interfaz, y React se encarga de actualizar el DOM para que los cambios se vean reflejados si cambia el estado de la aplicación (por ejemplo, tras eventos o cambios en variables de estado).

Además, es eficiente porque **solo actualiza el componente que cambió**, no toda la página.

## Conceptos Clave de React

### 1. Componentes
Los componentes son las piezas fundamentales de la interfaz. Pueden ser declarados como funciones para asignarles hooks como `useState` y `useEffect`.

### 2. Hooks
Son funciones especiales que permiten "enganchar" el estado y el ciclo de vida de React a los componentes funcionales.

*   **`useState`**: Sirve para declarar una variable de estado y una función para cambiarla. Es reactivo ante eventos.
*   **`useEffect`**: Es el "vigilante" de React. Si algo cambia en el estado, permite ejecutar efectos secundarios. Es reactivo a los estados.

## Sintaxis de React

En React, las funciones (componentes) se pueden declarar de dos maneras distintas:

*   **Como componentes completos (Arrow Function):**
    ```javascript
    const FuncionGenial = () => { };
    ```
*   **Como funciones tradicionales:**
    ```javascript
    function FuncionGenial () { }
    ```
*   **Funciones anónimas:**
    ```javascript
    () => a + 1
    ```

La asignación tipo flecha (`const ... = () => {}`) funciona como una asignación de una función anónima a una variable constante, convirtiéndola prácticamente en una función hecha y derecha, mientras que la declarativa (`function ...`) es la clásica forma de definir funciones.

## Flujo Completo de una Acción (Ej: Listar usuarios)

1.  **`UsersManager.jsx` (Componente):** Se monta y le pide los datos al hook personalizado (`useUsers.js`).
2.  **`useUsers.js` (Hook):** Envía un mensaje (HTTP GET) a la URL definida en `users.js` (routes).
3.  **`users.js` (Rutas):** Verifica que seas Admin y le pasa el turno a `userController.js`.
4.  **`userController.js` (Controlador):** Saca los datos de la base de datos y los devuelve.
5.  **Actualización:** El camino se recorre de vuelta hasta que `UsersManager.jsx` se actualiza y muestra la lista.

**Ejemplo de hook**
const loadUsers = useCallback(async ()=>{
    setLoading(true)
    try{
        const res = await fetchWithAuth('/api/users')
        if(!res.ok) throw res
        const data = await res.json()
        setUsers(data)
    }catch(err){
        console.error('loadUsers error', err)
    }finally{
        setLoading(false)
    }
},[])

Arriba, tenemos una función de callback con sintaxis de función de flecha (de entre muchas más), pero también podríamos escribirla como una función normal y envolverla en useCallback de esta manera:

const loadUsers = useCallback(function(){
  // ...
},[])

### ¿Podríamos usar function useUsers(){ ... } en su lugar?
Sí, pero tiene que estar envuelta en useCallback para evitar bucles infinitos cuando se usa en las dependencias de useEffect; también tiene que ver con la legibilidad y la consistencia.

### ¿Por qué necesitamos el useState de users y loading en absoluto?
Podríamos simplemente devolver la promesa de loadUsers y dejar que el llamador maneje el estado, pero tenerlo aquí hace que sea más conveniente de usar en los componentes. Simplemente podemos llamar a loadUsers y el hook gestionará el estado por nosotros.

### El propósito real de users y loading
¿Cuál es el propósito si llamamos a loadUsers en useEffect y no usamos el estado de users y loading devuelto? Debido a que loadUsers es asíncrono y devuelve una promesa, no podemos devolver directamente el estado de users y loading desde él. En su lugar, gestionamos el estado de users y loading dentro del hook, y los componentes pueden usar ese estado para renderizar la interfaz de usuario en consecuencia.

### Información sobre el hook createUser
[loadUsers] es una dependencia de createUser porque después de crear un usuario, queremos recargar la lista de usuarios para reflejar al nuevo usuario. Si loadUsers cambia (lo cual no sucederá, porque está envuelto en useCallback con un array de dependencias vacío), queremos que createUser tenga la versión actualizada de loadUsers. En la práctica, dado que loadUsers no tiene ninguna dependencia y no cambiará, esto es principalmente por consistencia y para satisfacer las reglas de los hooks de React.

### ¿Qué es una dependencia?
Además, una dependencia es cualquier variable o función que se utilice dentro del callback y esté definida fuera de él. Sirve como una forma de decirle a React que el callback depende de esa variable o función, y si esa variable o función cambia, el callback debe volver a crearse para reflejar esos cambios.

### ¿Y qué es un callback?
Un callback es una función que se pasa como argumento a otra función y se ejecuta después de que se cumple algún evento o condición, que en este caso, es la finalización de la llamada a la API createUser.

### En resumen:
* **users y loading**: Son variables de estado que contienen la lista de usuarios y el estado de carga, respectivamente.
* **loadUsers**: Es una función que obtiene los usuarios de la API y actualiza el estado de users y loading.
* **Funciones de acción**: createUser, updateUser, deleteUser y assignWorkspace son funciones que realizan sus respectivas llamadas a la API y luego llaman a loadUsers para refrescar la lista de usuarios.
* **useCallback**: Se utiliza para memorizar estas funciones de modo que no se vuelvan a crear en cada renderizado, lo que puede ayudar con el rendimiento y evitar renderizados innecesarios en los componentes que usan este hook.
* **Retorno del hook**: El hook useUsers devuelve un objeto con el estado de users y loading y las funciones para crear, actualizar, eliminar y asignar espacios de trabajo.
* **Dependencias**: Se utilizan para decirle a React cuándo volver a crear las funciones, lo cual es importante para asegurar que tengan acceso al estado más reciente y a otras funciones de las que dependen.

## PROPS!

Muy faciles de entender, solo debes mirar este codigo:

// El Hijo (Recibe las props)
function TarjetaUsuario(props) {
  return <h1>Hola, {props.nombre}</h1>;
}

// El Padre (Envía las props)
function App() {
  return (
    <div>
      <TarjetaUsuario nombre="Juan" />
      <TarjetaUsuario nombre="María" />
    </div>
  );
}

El prop es **nombre**, que se le asigna un valor o funcion, sea anonima o no.

# Notas de Aprendizaje: Buscador Optimizado en React

### 1. Inicialización del Estado y Cache (`useState` y `useMemo`)
*   **Duda:** ¿Qué hace el bloque inicial del componente?
*   **Explicación:** 
    *   `React.useState('')` inicializa la variable de estado `q` con un texto vacío para almacenar lo que el usuario escribe.
    *   `React.useMemo` envuelve la lógica para almacenar en caché el resultado del filtrado. Esto evita que el código vuelva a procesar la lista de usuarios en cada renderizado de la pantalla, ejecutándose únicamente cuando cambian las variables de sus dependencias (`q`, `users` o `workspaces`).

### 2. Protección Contra Nulos en Arrays (`users || []`)
*   **Duda:** ¿Qué hace exactamente la sintaxis `(users || []).filter(...)`?
*   **Explicación:** Es un mecanismo de seguridad anti-caídas (*anti-crash*). Si la variable `users` aún no se ha cargado de la base de datos (y es `null` o `undefined`), el operador `||` (OR) la sustituye inmediatamente por un array vacío `[]`. Esto permite que el método `.filter()` se ejecute de forma segura sin romper la aplicación con el error `Cannot read properties of null`.

### 3. Normalización a Minúsculas (`toLowerCase`)
*   **Duda:** ¿Es innecesario transformar los textos con `toLowerCase` si quiero verlos en mayúsculas?
*   **Explicación:** No es innecesario. Esta transformación se realiza solo a nivel interno dentro de la lógica del filtro para que la búsqueda ignore las mayúsculas (sea *Case Insensitive*). No afecta la apariencia visual de la pantalla. Si deseas mostrar los datos en mayúsculas al usuario, debes transformarlos directamente en la interfaz (JSX) mediante `.toUpperCase()` o utilizando la propiedad CSS `text-transform: uppercase;`.

### 4. Cruce de Datos mediante Identificadores (`find`)
*   **Duda:** ¿Qué hace la línea `const ws = workspaces && workspaces.find(...)`?
*   **Explicación:** Relaciona y cruza de manera dinámica dos colecciones de datos independientes. Busca dentro del array `workspaces` aquel objeto cuyo `id` coincida con el `workspace_id` del usuario evaluado. La instrucción inicial `workspaces &&` asegura que el array exista antes de realizar la búsqueda para prevenir errores en la aplicación.

### 5. Acceso a Propiedades de Configuración (`.label`)
*   **Duda:** ¿Por qué se accede específicamente a la propiedad `.label` en los roles?
*   **Explicación:** Porque la lista `ROLE_OPTIONS` almacena objetos estructurados (comunes en componentes de selección como React Select) compuestos por pares de clave-valor (ej. `{ id: 1, label: 'Administrador' }`). El buscador requiere acceder a la propiedad `.label` porque allí reside el texto descriptivo y legible por el usuario sobre el cual se ejecutará el filtro.

### 6. Simplificación de Sintaxis Antigua (Modernización de Código)
*   **Duda:** ¿Por qué el código original pasa tantas veces de vacío a indefinido de forma redundante?
*   **Explicación:** El código original utilizaba estructuras antiguas como `|| {}` y `|| ''` para blindar la lectura de propiedades de objetos que podían no existir. En JavaScript moderno, esto se simplifica drásticamente utilizando los operadores **Optional Chaining (`?.`)** y **Nullish Coalescing (`??`)**.
*   **Código Refactorizado:**
    ```javascript
    const role = (ROLE_OPTIONS.find(r => r.id === u.role_id)?.label ?? '').toLowerCase()
    ```

### 7. Comprobación de Contenido (`.includes`)
*   **Duda:** ¿Qué hace el método `.includes(s)` al final del filtro?
*   **Explicación:** Es un método nativo de JavaScript que inspecciona un string para verificar si contiene de forma exacta la subcadena de texto contenida en la variable `s` (el término buscado). Devuelve un valor booleano (`true` o `false`). Al encadenar varias evaluaciones con el operador `||`, el buscador se transforma en un omnibuscador capaz de validar si el término coincide concurrentemente con el nombre, correo, espacio de trabajo o rol del usuario.
