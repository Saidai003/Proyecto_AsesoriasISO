# Modelo C4

El modelo C4 de Simon Brown es un framework de diagramas de arquitectura de software con 4 niveles de zoom:

1. **Context (Nivel 1)**: Personas + el sistema como caja negra + sistemas externos
2. **Container (Nivel 2)**: Dentro del sistema, los contenedores (frontend, backend, DB)
3. **Component (Nivel 3)**: Dentro de un contenedor, los componentes internos
4. **Code (Nivel 4)**: Dentro de un componente, el código (clases/funciones) — rara vez se diagrama

Para aprender más: [https://c4model.com/](https://c4model.com/)

## En este proyecto

Los diagramas C4 están en `C4/`:
- `C4-Nivel1-Contexto.mmd` — 3 actores + sistema + Google Drive
- `C4-Nivel2-Contenedor.mmd` — Frontend + Backend + MySQL + Drive
- `C4-Nivel3-Componentes-Backend.mmd` — Controllers, middleware, services, workers
- `C4-Nivel3-Componentes-Frontend.mmd` — Pages, hooks, AuthContext, fetchWithAuth
