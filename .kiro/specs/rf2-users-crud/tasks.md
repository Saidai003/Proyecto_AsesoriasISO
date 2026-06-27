## Completed Tasks

- [x] 1. Crear tabla USUARIOS en init.sql con FKs a ESPACIO_TRABAJO y ROLES
- [x] 2. Implementar controller userController.js (createUser, listUsers, getUser, updateUser, deleteUser, assignUserToWorkspace, updateUserPassword, listResponsables)
- [x] 3. Definir rutas en routes/users.js con requireAuth + requireRole('Admin')
- [x] 4. Montar router en index.js como /api/users
- [x] 5. Implementar validación de email único (pre-check + catch ER_DUP_ENTRY)
- [x] 6. Implementar validación de existencia de workspace y rol al crear
- [x] 7. Implementar hashing con bcrypt (10 rounds) para passwords
- [x] 8. Implementar endpoint PUT /:id/password (cambio propio con validación de contraseña actual)
- [x] 9. Implementar transición de estado Pendiente → Aceptada al cambiar password
- [x] 10. Crear hook frontend useUsers.js
- [x] 11. Crear página UsersManager.jsx con tabla, edición inline, creación inline
- [x] 12. Implementar búsqueda multi-campo client-side (nombre, email, rol, workspace)
- [x] 13. Implementar ConfirmDialog con requireText="eliminar" para eliminación
- [x] 14. Cambiar FK USUARIOS→ESPACIO_TRABAJO de CASCADE a SET NULL
- [x] 15. Cambiar FK SCHEDULED_NOTIFICATIONS→USUARIOS de CASCADE a SET NULL
- [x] 16. Escribir tests unitarios para el controller (userController.test.js)

## Pending Tasks

- [ ] 17. Implementar confirmación escribiendo "confirmar" (RF2-CA-010/012) — actualmente usa "eliminar", pendiente decisión si se unifica
- [ ] 18. Implementar búsqueda/filtro por roles (RF2-CA-008)
- [ ] 19. Permitir usuario en más de un workspace (RF2-CA-005-FIX1) — requiere tabla pivot
