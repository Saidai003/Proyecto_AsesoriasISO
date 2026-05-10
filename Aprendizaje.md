React es una libreria de Javascript para construir interfaces
La gracia que tiene es que es declarativa, en otras palabras, defines como
quieres que se vea tu interfaz, y React se encarga de actualizar el DOM para que
los cambios se vean reflejados si cambia el estado de la aplicacion
(Por ejemplo, tras eventos o cambios de estado de variables de estado)
Tambien, es util porque solo actualiza el componente que cambio,
no toda la pagina

Son importantes las siguientes cosas de React:

Componentes
Los componentes son tanto componentes como funciones. Pueden ser declarados como funciones para asignarles uno o varios useState y useEffect.

los hooks:
useState
Sirve para declarar una variable y una funcion para cambiar el estado de esa variable, y es reactivo ante eventos
useEffect
Es el vigilante de React, si algo cambio en el estado de la interfaz, entonces que asi ocurra. Es reactivo a estados

Sintaxis de react:
En React, cuando se declaran funciones, se puede hacer de dos maneras distintas:

Como componentes completos:

const FuncionGenial = () => { 

};

function FuncionGenial () {

}

Como funciones anonimas:

() => a + 1

La de asignacion tipo flecha es como una asignacion de valor (pero esta vez, una funcion anonima) a una variable constante, convirtiendola practicamente en una funcion hecha y derecha, mientras que la declarativa es la clasica forma de definir funciones.