# Hooks y Custom Hooks

## Flujo Completo de una Acción (Ej: Listar usuarios)

1.  **`UsersManager.jsx` (Componente):** Se monta y le pide los datos al hook personalizado (`useUsers.js`).
2.  **`useUsers.js` (Hook):** Envía un mensaje (HTTP GET) a la URL definida en `users.js` (routes).
3.  **`users.js` (Rutas):** Verifica que seas Admin y le pasa el turno a `userController.js`.
4.  **`userController.js` (Controlador):** Saca los datos de la base de datos y los devuelve.
5.  **Actualización:** El camino se recorre de vuelta hasta que `UsersManager.jsx` se actualiza y muestra la lista.

## Ejemplo de hook

```javascript
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
```

También podríamos escribirla como una función normal y envolverla en useCallback:

```javascript
const loadUsers = useCallback(function(){
  // ...
},[])
```

### ¿Por qué useCallback?
Tiene que estar envuelta en useCallback para evitar bucles infinitos cuando se usa en las dependencias de useEffect; también tiene que ver con la legibilidad y la consistencia.

### ¿Por qué necesitamos el useState de users y loading?
Podríamos simplemente devolver la promesa de loadUsers y dejar que el llamador maneje el estado, pero tenerlo aquí hace que sea más conveniente de usar en los componentes. Simplemente podemos llamar a loadUsers y el hook gestionará el estado por nosotros.

### Información sobre dependencias de createUser
[loadUsers] es una dependencia de createUser porque después de crear un usuario, queremos recargar la lista de usuarios para reflejar al nuevo usuario.

### ¿Qué es una dependencia?
Una dependencia es cualquier variable o función que se utilice dentro del callback y esté definida fuera de él. Sirve como una forma de decirle a React que el callback depende de esa variable o función.

### ¿Y qué es un callback?
Un callback es una función que se pasa como argumento a otra función y se ejecuta después de que se cumple algún evento o condición.

### Resumen del patrón de hooks:
* **users y loading**: Variables de estado que contienen la lista y el estado de carga.
* **loadUsers**: Función que obtiene datos de la API y actualiza el estado.
* **Funciones de acción**: createUser, updateUser, etc. realizan llamadas a la API y luego llaman a loadUsers para refrescar.
* **useCallback**: Memoriza funciones para evitar recreaciones innecesarias.
* **Retorno del hook**: Objeto con el estado y las funciones disponibles para el componente.

---

## useMemo — cachear cálculos costosos

> Referencia oficial: https://react.dev/reference/react/useMemo

`useMemo` guarda el resultado de un cálculo y solo lo re-ejecuta cuando sus dependencias cambian:

```js
const resultado = useMemo(() => {
  // cálculo costoso
  return valorCalculado
}, [dependencia1, dependencia2])
```

Si `dependencia1` y `dependencia2` no cambiaron desde el último render, React devuelve el valor cacheado sin re-ejecutar la función. Útil para evitar recalcular filtros, agrupaciones, o transformaciones de datos en cada render.
