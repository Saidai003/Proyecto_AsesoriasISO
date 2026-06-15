-- Seed: workspaces and users (test accounts)
/*!40101 SET NAMES utf8mb4 */;

-- Create a default workspace (idempotente)
INSERT INTO ESPACIO_TRABAJO (nombre_cliente)
SELECT 'Demo Workspace'
WHERE NOT EXISTS (SELECT 1 FROM ESPACIO_TRABAJO WHERE nombre_cliente = 'Demo Workspace');
SELECT id INTO @WORKSPACE_DEMO_ID FROM ESPACIO_TRABAJO WHERE nombre_cliente = 'Demo Workspace' LIMIT 1;

-- Ensure roles exist
INSERT INTO ROLES (nombre) VALUES ('Admin') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);
INSERT INTO ROLES (nombre) VALUES ('Evaluador') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);
INSERT INTO ROLES (nombre) VALUES ('Responsable SGC') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);
SELECT id INTO @ROLE_ADMIN_ID FROM ROLES WHERE nombre='Admin' LIMIT 1;
SELECT id INTO @ROLE_EVAL_ID FROM ROLES WHERE nombre='Evaluador' LIMIT 1;
SELECT id INTO @ROLE_RESP_ID FROM ROLES WHERE nombre='Responsable SGC' LIMIT 1;

-- Password hash for 'Password123!' (generated with bcrypt)
-- Regenerated inside container with: node -e "console.log(require('bcryptjs').hashSync('Password123!',10))"
SET @HASH = '$2a$10$0fCyG0RW44LBr89cL9sVvOFghxcGVoUKu6PvAVpoSqaefr44M87m.';

-- Insert users (no duplicate by email)
INSERT INTO USUARIOS (workspace_id, role_id, nombre, email, password_hash, estado_invitacion)
SELECT @WORKSPACE_DEMO_ID, @ROLE_RESP_ID, 'Responsable Demo', 'responsable@demo.local', @HASH, 'Aceptada'
WHERE NOT EXISTS (SELECT 1 FROM USUARIOS WHERE email='responsable@demo.local');

INSERT INTO USUARIOS (workspace_id, role_id, nombre, email, password_hash, estado_invitacion)
SELECT @WORKSPACE_DEMO_ID, @ROLE_EVAL_ID, 'Evaluador Demo', 'evaluador@demo.local', @HASH, 'Aceptada'
WHERE NOT EXISTS (SELECT 1 FROM USUARIOS WHERE email='evaluador@demo.local');

INSERT INTO USUARIOS (workspace_id, role_id, nombre, email, password_hash, estado_invitacion)
SELECT @WORKSPACE_DEMO_ID, @ROLE_ADMIN_ID, 'Admin Demo', 'admin@demo.local', @HASH, 'Aceptada'
WHERE NOT EXISTS (SELECT 1 FROM USUARIOS WHERE email='admin@demo.local');

-- end

-- Import note: run the mysql client with the proper charset if importing from the host
-- Example:
-- mysql --default-character-set=utf8mb4 -u root -p proyecto_iso < seeds/seed_users_workspaces.sql
