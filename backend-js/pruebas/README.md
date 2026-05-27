Pruebas para backend

Estructura:
- `pruebas/unitarias` : pruebas unitarias que mockean la base de datos y dependencias.
- `pruebas/integracion` : pruebas de integración que llaman al servidor real (SE EJECUTAN solo si se establece la variable de entorno `RUN_INTEGRATION=true`).

Ejecutar pruebas unitarias (desde `backend-js`):

```powershell
npm test
```

Ejecutar solo unitarias:

```powershell
npx jest pruebas/unitarias --runInBand
```

Ejecutar integraciones (requiere base de datos disponible y variable de entorno):

Windows PowerShell:

```powershell
$env:RUN_INTEGRATION = 'true'
npx jest pruebas/integracion --runInBand
```

O en cmd.exe:

```cmd
set RUN_INTEGRATION=true&& npx jest pruebas/integracion --runInBand
```

Notas:
- Las pruebas unitarias usan mocks para `src/db` y `src/auth`.
- Las pruebas de integración están marcadas para no ejecutarse por defecto; defina `RUN_INTEGRATION=true` y asegúrese de que la base de datos MySQL configurada en `.env` esté accesible.
