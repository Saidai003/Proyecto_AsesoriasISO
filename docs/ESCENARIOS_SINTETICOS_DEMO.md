# Escenarios sintéticos para demostración

## Objetivo

Preparar dos workspaces aislados para una demostración sin modificar el workspace operacional ni alternar datos durante la defensa.

- **Demo Defensa — 50% Cumplimiento:** evidencias, brechas, acciones y conversaciones en distintos estados.
- **Demo Defensa — 100% Cumplimiento:** requisitos cumplidos, evidencias aceptadas, acciones eficaces y brechas cerradas como historial de mejora.

## Cuentas sintéticas

| Escenario | Rol | Correo | Contraseña |
|---|---|---|---|
| 50% | Evaluador | `evaluador.demo50@demo.local` | `MiClave.ProyectoISO2026` |
| 50% | Responsable SGC | `responsable.demo50@demo.local` | `MiClave.ProyectoISO2026` |
| 100% | Evaluador | `evaluador.demo100@demo.local` | `MiClave.ProyectoISO2026` |
| 100% | Responsable SGC | `responsable.demo100@demo.local` | `MiClave.ProyectoISO2026` |

## Ejecución

Desde `backend-js` y únicamente en el entorno preparado para la demostración. Para revisar el plan sin escribir datos: `npm run seed:demo-scenarios -- --dry-run`.

```powershell
npm run seed:demo-scenarios
```

Con Docker:

```powershell
docker compose exec backend-js node scripts/seed_demo_scenarios.js
```

El comando crea o actualiza exclusivamente los dos workspaces de demo y sus usuarios sintéticos. Luego repuebla solo los datos de esos workspaces; puede ejecutarse más de una vez para restablecer la demo.

## Uso durante la defensa

1. Mostrar el dashboard 50% para explicar brechas, evidencias pendientes/rechazadas y acciones en progreso.
2. Abrir un requisito o brecha representativa; no recorrer todos los módulos.
3. Mostrar el dashboard 100% como contraste: evidencias aceptadas y trazabilidad de cierres.
4. Mantener la demostración bajo 6 minutos; explicar seguridad, refresh, IDOR y notificaciones programadas mediante las slides de respaldo.

## Precaución

No ejecutar este comando contra datos de una operación real sin autorización: aunque se aísla por workspaces de demo, agrega usuarios y registros sintéticos a la base de datos.
