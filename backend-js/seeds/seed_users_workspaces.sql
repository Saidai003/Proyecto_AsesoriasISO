-- Seed: workspaces and users (test accounts)
-- charset
SET NAMES 'utf8mb4';

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

-- bcrypt 10 rounds (password not stored in plaintext for security)
SET @HASH = '$2a$10$0q0ES4zGzzamnE2mOHfRruymaah4fXQ59gsU.NbIMAfUQbl1IEIjK';

-- Insert or update demo users with stable credentials (all in one operation)
INSERT INTO USUARIOS (workspace_id, role_id, nombre, email, password_hash, estado_invitacion)
VALUES 
  (@WORKSPACE_DEMO_ID, @ROLE_RESP_ID, 'Responsable Demo', 'responsable@demo.local', @HASH, 'Aceptada'),
  (@WORKSPACE_DEMO_ID, @ROLE_EVAL_ID, 'Evaluador Demo', 'evaluador@demo.local', @HASH, 'Aceptada'),
  (@WORKSPACE_DEMO_ID, @ROLE_ADMIN_ID, 'Admin Demo', 'admin@demo.local', @HASH, 'Aceptada')
ON DUPLICATE KEY UPDATE
  workspace_id = VALUES(workspace_id),
  role_id = VALUES(role_id),
  nombre = VALUES(nombre),
  password_hash = VALUES(password_hash),
  estado_invitacion = VALUES(estado_invitacion);

-- Import note: run the mysql client with the proper charset if importing from the host
-- Example:
-- mysql --default-character-set=utf8mb4 -u root -p proyecto_iso < seeds/seed_users_workspaces.sql
