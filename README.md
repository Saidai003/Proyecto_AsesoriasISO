# Proyecto_AsesoriasISO

Repositorio inicial creado por asistente.

Estructura creada:

- `frontend/` — app React (Vite)
- `backend-js/` — API ejemplo con Express
- `backend-py/` — API ejemplo con FastAPI
- `db/init.sql` — script de inicialización MySQL
- `docker-compose.yml` — orquesta MySQL y backends de ejemplo

Para arrancar localmente con Docker:

```bash
docker compose up --build
```

Frontend: entrar en `frontend/` y ejecutar `npm install` y `npm run dev`.
Backend JS: entrar en `backend-js/` y ejecutar `npm install` y `npm run dev`.
Backend PY: crear virtualenv, instalar `pip install -r requirements.txt` y ejecutar `uvicorn app.main:app --reload`.
