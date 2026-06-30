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

## PROPS!

Muy faciles de entender, solo debes mirar este codigo:

```javascript
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
```

El prop es **nombre**, que se le asigna un valor o funcion, sea anonima o no.
