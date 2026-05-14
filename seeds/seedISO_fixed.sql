-- ==================================================
-- COMBINED SEED: init + seed para ISO 9001:2015
-- UbicaciÃ³n: seeds/seedISO.sql
-- Este archivo crea la BD y tablas, luego inserta datos seed.
-- ==================================================

-- 1) Crear base de datos, usuario y tablas (copiado de db/init.sql)
CREATE DATABASE IF NOT EXISTS proyecto_iso CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'proyecto_user'@'%' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON proyecto_iso.* TO 'proyecto_user'@'%';
FLUSH PRIVILEGES;

USE proyecto_iso;

-- Tablas
CREATE TABLE IF NOT EXISTS ISOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255),
    descripcion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS CLAUSULAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    iso_id INT,
    numero_clausula INT,
    titulo VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS REQUISITOS_BASE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clausula_id INT,
    requisito_padre_id INT,
    descripcion_normativa TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ROLES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ESPACIO_TRABAJO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cliente VARCHAR(255),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS USUARIOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT,
    role_id INT,
    nombre VARCHAR(255),
    email VARCHAR(320),
    password_hash VARCHAR(255),
    reset_token VARCHAR(255),
    expiration_date DATETIME,
    estado_invitacion ENUM('Pendiente','Aceptada','Expirada') DEFAULT 'Pendiente',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS SESIONES_USUARIO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    ip_conexion VARCHAR(45),
    user_agent TEXT,
    fecha_inicio DATETIME,
    fecha_cierre DATETIME,
    duracion_minutos INT,
    tipo_cierre ENUM('Logout','Expirada','Forzada'),
    estado ENUM('Activa','Cerrada')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ACTIVIDAD_USUARIO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    sesion_id INT,
    tipo_accion ENUM('LOGIN','UPDATE','CREATE','DELETE','UPLOAD'),
    tabla_afectada VARCHAR(255),
    registro_id INT,
    descripcion TEXT,
    ip_conexion VARCHAR(45),
    fecha_accion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EVALUACION_REQUISITO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requisito_base_id INT,
    workspace_id INT,
    estado_cumplimiento ENUM('Cumple','Parcial','No cumple','NA'),
    ultima_edicion_por INT,
    fecha_ultima_edicion DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ACCIONES_CORRECTIVAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auditoria_nc_id INT,
    accion_previa_id INT,
    autor_id INT,
    tipo_autor ENUM('Evaluador','Responsable SGC','Sistema'),
    nc TEXT,
    accion TEXT,
    contenido_comentario TEXT,
    estado_accion ENUM('Pendiente','En_Progreso','Eficaz','No_Eficaz'),
    acciones_futuras_propuestas TEXT,
    requiere_nueva_nc TINYINT(1) DEFAULT 0,
    fecha_accion DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EVIDENCIAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_requisito_id INT,
    usuario_carga_id INT,
    ev_id INT,
    nombre_archivo VARCHAR(500),
    url_archivo VARCHAR(1000),
    tipo_formato VARCHAR(100),
    estado_validacion_archivo ENUM('Pendiente','Aceptado','Rechazado') DEFAULT 'Pendiente',
    comentario_evidencia TEXT,
    fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EVALUACION_REQUISITO_HIST (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ev_id INT,
    estado_cumplimiento ENUM('Cumple','Parcial','No cumple','NA'),
    ultima_edicion_por INT,
    fecha_snapshot DATETIME,
    accion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AUDITORIA_NC_HIST (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nc_id INT,
    estado_flujo ENUM('Abierta','AnÃ¡lisis','EjecuciÃ³n','VerificaciÃ³n','Cerrada'),
    estado_validacion ENUM('Acepto','Parcial','No Acepto'),
    fecha_verificacion_eficacia DATE,
    evaluador_id INT,
    evaluado_id INT,
    ultima_edicion_por INT,
    fecha_snapshot DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EVIDENCIAS_LOG (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evidencia_id INT,
    usuario_id INT,
    ev_id INT,
    tipo_accion ENUM('UPLOAD','DELETE'),
    nombre_archivo VARCHAR(500),
    fecha_accion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AUDITORIA_NC (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_requisito_id INT,
    evaluador_id INT,
    evaluado_id INT,
    estado_flujo ENUM('Abierta','AnÃ¡lisis','EjecuciÃ³n','VerificaciÃ³n','Cerrada'),
    estado_validacion ENUM('Acepto','Parcial','No Acepto'),
    fecha_verificacion_eficacia DATE,
    comentario_nc TEXT,
    ultima_edicion_por INT,
    fecha_ultima_edicion DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Agregar claves forÃ¡neas (se puede ejecutar despuÃ©s si ya existen datos)
ALTER TABLE CLAUSULAS
    ADD CONSTRAINT fk_clausulas_iso FOREIGN KEY (iso_id) REFERENCES ISOS(id) ON DELETE SET NULL;

ALTER TABLE REQUISITOS_BASE
    ADD CONSTRAINT fk_req_clausula FOREIGN KEY (clausula_id) REFERENCES CLAUSULAS(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_req_padre FOREIGN KEY (requisito_padre_id) REFERENCES REQUISITOS_BASE(id) ON DELETE SET NULL;

ALTER TABLE USUARIOS
    ADD CONSTRAINT fk_usuarios_workspace FOREIGN KEY (workspace_id) REFERENCES ESPACIO_TRABAJO(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_usuarios_role FOREIGN KEY (role_id) REFERENCES ROLES(id) ON DELETE SET NULL;

-- Ãndices Ãºtiles
CREATE INDEX IF NOT EXISTS idx_clausulas_iso ON CLAUSULAS(iso_id);
CREATE INDEX IF NOT EXISTS idx_req_clausula ON REQUISITOS_BASE(clausula_id);
CREATE INDEX IF NOT EXISTS idx_eval_req_workspace ON EVALUACION_REQUISITO(workspace_id);

-- ==================================================
-- 2) Datos seed para ISO 9001 (ajustado para evitar errores con SET)
-- ==================================================

-- Insertar la Norma
INSERT INTO ISOS (nombre, descripcion)
VALUES ('ISO 9001:2015', 'Sistemas de gestión de la calidad — Requisitos');
SELECT LAST_INSERT_ID() INTO @ISO_ID;

-- ClÃ¡usula 4
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 4, 'Contexto de la organización');
SELECT LAST_INSERT_ID() INTO @CLAUSULA4_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA4_ID, NULL, '4.1 Comprensión de la organización y de su contexto'),
(@CLAUSULA4_ID, NULL, '4.2 Comprensión de las necesidades y expectativas de las partes interesadas'),
(@CLAUSULA4_ID, NULL, '4.3 Determinación del alcance del sistema de gestión de la calidad'),
(@CLAUSULA4_ID, NULL, '4.4 Sistema de gestión de la calidad y sus procesos');

-- ClÃ¡usula 5
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 5, 'Liderazgo');
SELECT LAST_INSERT_ID() INTO @CLAUSULA5_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA5_ID, NULL, '5.1 Liderazgo y compromiso');
SELECT LAST_INSERT_ID() INTO @REQ51_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA5_ID, @REQ51_ID, '5.1.1 Generalidades'),
(@CLAUSULA5_ID, @REQ51_ID, '5.1.2 Enfoque al cliente');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA5_ID, NULL, '5.2 PolÃ­tica');
SELECT LAST_INSERT_ID() INTO @REQ52_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA5_ID, @REQ52_ID, '5.2.1 Establecimiento de la polÃ­tica de la calidad'),
(@CLAUSULA5_ID, @REQ52_ID, '5.2.2 ComunicaciÃ³n de la polÃ­tica de la calidad');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA5_ID, NULL, '5.3 Roles, responsabilidades y autoridades en la organizaciÃ³n');

-- ClÃ¡usula 6
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 6, 'PlanificaciÃ³n');
SELECT LAST_INSERT_ID() INTO @CLAUSULA6_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA6_ID, NULL, '6.1 Acciones para abordar riesgos y oportunidades'),
(@CLAUSULA6_ID, NULL, '6.2 Objetivos de la calidad y planificaciÃ³n para lograrlos'),
(@CLAUSULA6_ID, NULL, '6.3 PlanificaciÃ³n de los cambios');

-- ClÃ¡usula 7
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 7, 'Apoyo');
SELECT LAST_INSERT_ID() INTO @CLAUSULA7_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA7_ID, NULL, '7.1 Recursos');
SELECT LAST_INSERT_ID() INTO @REQ71_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA7_ID, @REQ71_ID, '7.1.1 Generalidades'),
(@CLAUSULA7_ID, @REQ71_ID, '7.1.2 Personas'),
(@CLAUSULA7_ID, @REQ71_ID, '7.1.3 Infraestructura'),
(@CLAUSULA7_ID, @REQ71_ID, '7.1.4 Ambiente para la operaciÃ³n de los procesos');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA7_ID, @REQ71_ID, '7.1.5 Recursos de seguimiento y mediciÃ³n');
SELECT LAST_INSERT_ID() INTO @REQ715_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA7_ID, @REQ715_ID, '7.1.5.1 Generalidades'),
(@CLAUSULA7_ID, @REQ715_ID, '7.1.5.2 Trazabilidad de las mediciones');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA7_ID, @REQ71_ID, '7.1.6 Conocimientos de la organizaciÃ³n');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA7_ID, NULL, '7.2 Competencia'),
(@CLAUSULA7_ID, NULL, '7.3 Toma de conciencia'),
(@CLAUSULA7_ID, NULL, '7.4 ComunicaciÃ³n');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA7_ID, NULL, '7.5 InformaciÃ³n documentada');
SELECT LAST_INSERT_ID() INTO @REQ75_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA7_ID, @REQ75_ID, '7.5.1 Generalidades'),
(@CLAUSULA7_ID, @REQ75_ID, '7.5.2 CreaciÃ³n y actualizaciÃ³n'),
(@CLAUSULA7_ID, @REQ75_ID, '7.5.3 Control de la informaciÃ³n documentada');

-- ClÃ¡usula 8
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 8, 'OperaciÃ³n');
SELECT LAST_INSERT_ID() INTO @CLAUSULA8_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.1 PlanificaciÃ³n y control operacional');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.2 Requisitos para los productos y servicios');
SELECT LAST_INSERT_ID() INTO @REQ82_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, @REQ82_ID, '8.2.1 ComunicaciÃ³n con el cliente'),
(@CLAUSULA8_ID, @REQ82_ID, '8.2.2 DeterminaciÃ³n de los requisitos para los productos y servicios'),
(@CLAUSULA8_ID, @REQ82_ID, '8.2.3 RevisiÃ³n de los requisitos para los productos y servicios'),
(@CLAUSULA8_ID, @REQ82_ID, '8.2.4 Cambios en los requisitos para los productos y servicios');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.3 DiseÃ±o y desarrollo de los productos y servicios');
SELECT LAST_INSERT_ID() INTO @REQ83_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, @REQ83_ID, '8.3.1 Generalidades'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.2 PlanificaciÃ³n del diseÃ±o y desarrollo'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.3 Entradas para el diseÃ±o y desarrollo'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.4 Controles del diseÃ±o y desarrollo'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.5 Salidas del diseÃ±o y desarrollo'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.6 Cambios del diseÃ±o y desarrollo');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.4 Control de los procesos, productos y servicios suministrados externamente');
SELECT LAST_INSERT_ID() INTO @REQ84_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, @REQ84_ID, '8.4.1 Generalidades'),
(@CLAUSULA8_ID, @REQ84_ID, '8.4.2 Tipo y alcance del control'),
(@CLAUSULA8_ID, @REQ84_ID, '8.4.3 InformaciÃ³n para los proveedores externos');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.5 ProducciÃ³n y provisiÃ³n del servicio');
SELECT LAST_INSERT_ID() INTO @REQ85_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, @REQ85_ID, '8.5.1 Control de la producciÃ³n y de la provisiÃ³n del servicio'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.2 IdentificaciÃ³n y trazabilidad'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.3 Propiedad perteneciente a los clientes o proveedores externos'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.4 PreservaciÃ³n'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.5 Actividades posteriores a la entrega'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.6 Control de los cambios');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, NULL, '8.6 LiberaciÃ³n de los productos y servicios'),
(@CLAUSULA8_ID, NULL, '8.7 Control de las salidas no conformes');

-- ClÃ¡usula 9
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 9, 'EvaluaciÃ³n del desempeÃ±o');
SELECT LAST_INSERT_ID() INTO @CLAUSULA9_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA9_ID, NULL, '9.1 Seguimiento, mediciÃ³n, anÃ¡lisis y evaluaciÃ³n');
SELECT LAST_INSERT_ID() INTO @REQ91_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA9_ID, @REQ91_ID, '9.1.1 Generalidades'),
(@CLAUSULA9_ID, @REQ91_ID, '9.1.2 SatisfacciÃ³n del cliente'),
(@CLAUSULA9_ID, @REQ91_ID, '9.1.3 AnÃ¡lisis y evaluaciÃ³n');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA9_ID, NULL, '9.2 AuditorÃ­a interna');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA9_ID, NULL, '9.3 RevisiÃ³n por la direcciÃ³n');
SELECT LAST_INSERT_ID() INTO @REQ93_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA9_ID, @REQ93_ID, '9.3.1 Generalidades'),
(@CLAUSULA9_ID, @REQ93_ID, '9.3.2 Entradas de la revisiÃ³n por la direcciÃ³n'),
(@CLAUSULA9_ID, @REQ93_ID, '9.3.3 Salidas de la revisiÃ³n por la direcciÃ³n');

-- ClÃ¡usula 10
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 10, 'Mejora');
SELECT LAST_INSERT_ID() INTO @CLAUSULA10_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA10_ID, NULL, '10.1 Generalidades');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA10_ID, NULL, '10.2 No conformidad y acciÃ³n correctiva');
SELECT LAST_INSERT_ID() INTO @REQ102_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA10_ID, @REQ102_ID, '10.2.1 ReacciÃ³n y evaluaciÃ³n de no conformidades'),
(@CLAUSULA10_ID, @REQ102_ID, '10.2.2 ConservaciÃ³n de informaciÃ³n documentada de acciones correctivas');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA10_ID, NULL, '10.3 Mejora continua');

-- FIN del seed combinado

