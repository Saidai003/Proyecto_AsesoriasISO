# Guía de demo de defensa y pruebas E2E prioritarias

## Propósito

El plan completo en `PlanDePrueba.md` conserva las nueve fases de validación. Esta guía separa lo que conviene **demostrar en vivo** de lo que conviene **probar fuera de la presentación**.

No se debe intentar ejecutar el E2E completo durante la defensa: requiere cambios de sesión, carga de archivos, notificaciones y fechas de verificación, por lo que puede superar ampliamente los 10 minutos.

## A. Demo en vivo: 4 a 6 minutos

### Preparación previa

- Dejar creados un workspace de demostración, un Evaluador y un Responsable SGC.
- Dejar abierta una sesión del Responsable y otra del Evaluador en ventanas o perfiles distintos.
- Preparar un requisito con una evidencia, una brecha y una acción correctiva ya creadas.
- Verificar conexión a base de datos y, si se demostrará, Google Drive.

### Recorrido recomendado

1. **Contexto y roles — 30 s.** Mostrar el requisito ISO y explicar que el Responsable aporta evidencia, el Evaluador la revisa y el Admin solo observa/gestiona el contexto administrativo.
2. **Evidencia — 60 s.** Como Responsable, mostrar una evidencia cargada y su historial. Como Evaluador, cambiar una evidencia de `Pendiente` a `Aceptado` o `Rechazado`; mostrar que solo el Evaluador ve el selector.
3. **Brecha y trazabilidad — 60 s.** Abrir una brecha existente, mostrar estado de flujo, historial y el chat cronológico contextual. Explicar que el estado registra qué, quién y cuándo; el chat concentra la discusión.
4. **Acción correctiva — 60 s.** Mostrar el Kanban, una acción en progreso y el historial de cambios. Explicar que el Responsable ejecuta acciones y el Evaluador verifica/cierra la brecha.
5. **Resultado y seguridad — 60 s.** Mostrar dashboard/notificación o el estado final. Cerrar explicando `requireAuth`, control de rol y aislamiento por workspace, sin intentar atacar la aplicación en vivo.

### Qué narrar en vez de ejecutar

- Creación de workspaces y usuarios.
- Logout por inactividad, refresh token y renovación de sesión.
- Pruebas IDOR, intento de escalación de privilegios y rutas sin token.
- Programación de notificaciones futuras y limpieza destructiva.

## B. E2E prioritario: 20 a 30 minutos

Ejecutar fuera de la defensa y registrar resultado, fecha y observaciones.

1. **Preparación administrativa.** Crear workspace de prueba y usuarios Evaluador/Responsable; comprobar que cada uno queda asignado al workspace correcto.
2. **Autenticación.** Login, acceso a una ruta protegida, refresh de sesión y logout.
3. **Carga de evidencia.** Responsable carga un archivo, lo descarga, lo reemplaza o edita si es el propietario, y consulta el historial.
4. **Validación de evidencia.** Evaluador cambia `Pendiente → Rechazado` o `Aceptado`; confirmar que Responsable y Admin no pueden cambiar ese estado.
5. **Brecha.** Evaluador crea y asigna una brecha; confirmar notificación y acceso del Responsable asignado.
6. **Corrección.** Responsable registra una acción correctiva, la mueve en el Kanban y conversa en el chat de la brecha.
7. **Verificación y cierre.** Evaluador valida la evidencia corregida, programa verificación con fecha futura y cierra o reabre la brecha según el resultado.
8. **Resultados.** Revisar historial de brecha, historial de evidencia, notificaciones y dashboards por rol.
9. **Seguridad mínima.** Probar ruta sin token, intento de acceso a un recurso de otro workspace e intento de operación con un rol no autorizado.

## C. Alcance opcional del E2E completo

Solo si queda tiempo: activación de cuenta, navegación con retroceso, notificaciones programadas, eliminación de datos de prueba y timeout de inactividad. Estas pruebas permanecen detalladas en `PlanDePrueba.md`.