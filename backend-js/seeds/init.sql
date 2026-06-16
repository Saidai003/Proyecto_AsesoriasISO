-- Inicializa la base de datos MySQL para el proyecto
CREATE DATABASE IF NOT EXISTS proyecto_iso CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Cambia estos valores en producción
CREATE USER IF NOT EXISTS 'proyecto_user'@'%' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON proyecto_iso.* TO 'proyecto_user'@'%';
FLUSH PRIVILEGES;

USE proyecto_iso;

-- =========================================================
-- 1. TABLAS BASE (No dependen de otras tablas)
-- =========================================================

CREATE TABLE IF NOT EXISTS ISOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255),
    descripcion TEXT,
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

-- =========================================================
-- 2. TABLAS NIVEL 1 (Dependen de las tablas base)
-- =========================================================

CREATE TABLE IF NOT EXISTS CLAUSULAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    iso_id INT,
    numero_clausula INT,
    titulo VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clausulas_iso FOREIGN KEY (iso_id) REFERENCES ISOS(id) ON DELETE SET NULL,
    INDEX idx_clausulas_iso (iso_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS USUARIOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT,
    role_id INT,
    nombre VARCHAR(255),
    email VARCHAR(320) UNIQUE,
    password_hash VARCHAR(255),
    reset_token VARCHAR(255),
    expiration_date DATETIME,
    estado_invitacion ENUM('Pendiente','Aceptada','Expirada') DEFAULT 'Pendiente',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_workspace FOREIGN KEY (workspace_id) REFERENCES ESPACIO_TRABAJO(id) ON DELETE CASCADE,
    CONSTRAINT fk_usuarios_role FOREIGN KEY (role_id) REFERENCES ROLES(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 3. TABLAS NIVEL 2 (Dependen de Nivel 1)
-- =========================================================

CREATE TABLE IF NOT EXISTS REQUISITOS_BASE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clausula_id INT,
    requisito_padre_id INT,
    descripcion_normativa TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_req_clausula FOREIGN KEY (clausula_id) REFERENCES CLAUSULAS(id) ON DELETE CASCADE,
    CONSTRAINT fk_req_padre FOREIGN KEY (requisito_padre_id) REFERENCES REQUISITOS_BASE(id) ON DELETE SET NULL,
    INDEX idx_req_clausula (clausula_id)
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
    estado ENUM('Activa','Cerrada'),
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES USUARIOS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS SESSIONS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sessions_user (user_id),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES USUARIOS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS NOTIFICACIONES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo VARCHAR(100),
    mensaje TEXT,
    link VARCHAR(500) DEFAULT NULL,
    read_flag TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES USUARIOS(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (usuario_id, read_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 4. TABLAS NIVEL 3 (Dependen de Nivel 2)
-- =========================================================

CREATE TABLE IF NOT EXISTS ACTIVIDAD_USUARIO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    sesion_id INT,
    tipo_accion ENUM('LOGIN','UPDATE','CREATE','DELETE','UPLOAD'),
    tabla_afectada VARCHAR(255),
    registro_id INT,
    descripcion TEXT,
    ip_conexion VARCHAR(45),
    fecha_accion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_actividad_usuario FOREIGN KEY (usuario_id) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    CONSTRAINT fk_actividad_sesion FOREIGN KEY (sesion_id) REFERENCES SESIONES_USUARIO(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS PROCESOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requisito_base_id INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por INT,
    CONSTRAINT fk_procesos_requisito FOREIGN KEY (requisito_base_id) REFERENCES REQUISITOS_BASE(id) ON DELETE CASCADE,
    INDEX idx_procesos_req (requisito_base_id),
    INDEX idx_procesos_requisito (requisito_base_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EVALUACION_REQUISITO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requisito_base_id INT,
    workspace_id INT,
    estado_cumplimiento ENUM('Cumple','Parcial','No cumple','NA'),
    ultima_edicion_por INT,
    fecha_ultima_edicion DATETIME,
    CONSTRAINT fk_eval_req_base FOREIGN KEY (requisito_base_id) REFERENCES REQUISITOS_BASE(id) ON DELETE CASCADE,
    CONSTRAINT fk_eval_req_workspace FOREIGN KEY (workspace_id) REFERENCES ESPACIO_TRABAJO(id) ON DELETE CASCADE,
    CONSTRAINT fk_eval_req_ultima_edicion FOREIGN KEY (ultima_edicion_por) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    INDEX idx_eval_req_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 5. TABLAS NIVEL 4 (Dependen de Nivel 3)
-- =========================================================

CREATE TABLE IF NOT EXISTS METODOS_CONTROLES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proceso_id INT NOT NULL,
    descripcion_metodo TEXT NOT NULL,
    procedimiento_control TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    creado_por INT,
    CONSTRAINT fk_metodos_proceso FOREIGN KEY (proceso_id) REFERENCES PROCESOS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EVIDENCIAS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_requisito_id INT,
    usuario_carga_id INT,
    ev_id INT,
    nombre_archivo VARCHAR(500),
    url_archivo VARCHAR(1000),
    drive_file_id VARCHAR(255),
    tipo_formato VARCHAR(100),
    estado_validacion_archivo ENUM('Pendiente','Aceptado','Rechazado') DEFAULT 'Pendiente',
    comentario_evidencia TEXT,
    fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evid_eval FOREIGN KEY (evaluacion_requisito_id) REFERENCES EVALUACION_REQUISITO(id) ON DELETE CASCADE,
    CONSTRAINT fk_evid_usuario FOREIGN KEY (usuario_carga_id) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    CONSTRAINT fk_evid_ev FOREIGN KEY (ev_id) REFERENCES USUARIOS(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EVALUACION_REQUISITO_HIST (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ev_id INT,
    estado_cumplimiento ENUM('Cumple','Parcial','No cumple','NA'),
    ultima_edicion_por INT,
    fecha_snapshot DATETIME,
    accion VARCHAR(255),
    CONSTRAINT fk_erh_ev FOREIGN KEY (ev_id) REFERENCES EVALUACION_REQUISITO(id) ON DELETE CASCADE,
    CONSTRAINT fk_erh_ultima_edicion FOREIGN KEY (ultima_edicion_por) REFERENCES USUARIOS(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AUDITORIA_NC (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_requisito_id INT,
    evaluador_id INT,
    evaluado_id INT,
    estado_flujo VARCHAR(50),
    estado_validacion ENUM('Acepto','Parcial','No Acepto'),
    fecha_verificacion_eficacia DATE,
    comentario_nc TEXT,
    titulo VARCHAR(255),
    descripcion TEXT,
    ultima_edicion_por INT,
    fecha_ultima_edicion DATETIME,
    CONSTRAINT fk_auditoria_evalreq FOREIGN KEY (evaluacion_requisito_id) REFERENCES EVALUACION_REQUISITO(id) ON DELETE CASCADE,
    CONSTRAINT fk_auditoria_evaluador FOREIGN KEY (evaluador_id) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    CONSTRAINT fk_auditoria_evaluado FOREIGN KEY (evaluado_id) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    CONSTRAINT fk_auditoria_ultima_edicion FOREIGN KEY (ultima_edicion_por) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    INDEX idx_nc_eval (evaluacion_requisito_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 6. TABLAS NIVEL 5 (Dependen de AUDITORIA_NC o EVIDENCIAS)
-- =========================================================

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
    fecha_accion DATETIME,
    CONSTRAINT fk_acc_nc FOREIGN KEY (auditoria_nc_id) REFERENCES AUDITORIA_NC(id) ON DELETE SET NULL,
    CONSTRAINT fk_acc_prev FOREIGN KEY (accion_previa_id) REFERENCES ACCIONES_CORRECTIVAS(id) ON DELETE SET NULL,
    CONSTRAINT fk_acc_autor FOREIGN KEY (autor_id) REFERENCES USUARIOS(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AUDITORIA_NC_HIST (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nc_id INT,
    estado_flujo VARCHAR(50),
    estado_validacion ENUM('Acepto','Parcial','No Acepto'),
    fecha_verificacion_eficacia DATE,
    comentario TEXT,
    evaluador_id INT,
    evaluado_id INT,
    ultima_edicion_por INT,
    fecha_snapshot DATETIME,
    CONSTRAINT fk_anc_hist_nc FOREIGN KEY (nc_id) REFERENCES AUDITORIA_NC(id) ON DELETE CASCADE,
    CONSTRAINT fk_anc_hist_evaluador FOREIGN KEY (evaluador_id) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    CONSTRAINT fk_anc_hist_evaluado FOREIGN KEY (evaluado_id) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    CONSTRAINT fk_anc_hist_ultima_edicion FOREIGN KEY (ultima_edicion_por) REFERENCES USUARIOS(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS EVIDENCIAS_LOG (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evidencia_id INT,
    usuario_id INT,
    ev_id INT,
    tipo_accion ENUM('UPLOAD','DELETE','UPDATE','REPLACE','APPROVAL') DEFAULT 'UPLOAD',
    nombre_archivo VARCHAR(500),
    detalle TEXT,
    fecha_accion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evidlog_evid FOREIGN KEY (evidencia_id) REFERENCES EVIDENCIAS(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidlog_usuario FOREIGN KEY (usuario_id) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    CONSTRAINT fk_evidlog_ev FOREIGN KEY (ev_id) REFERENCES USUARIOS(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS SCHEDULED_NOTIFICATIONS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nc_id INT NOT NULL,
    usuario_id INT NOT NULL,
    trigger_at DATETIME NOT NULL,
    sent_flag TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sched_nc FOREIGN KEY (nc_id) REFERENCES AUDITORIA_NC(id) ON DELETE CASCADE,
    CONSTRAINT fk_sched_user FOREIGN KEY (usuario_id) REFERENCES USUARIOS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AUDITORIA_NC_RESPONSABLES (
    auditoria_nc_id INT NOT NULL,
    usuario_id INT NOT NULL,
    PRIMARY KEY (auditoria_nc_id, usuario_id),
    CONSTRAINT fk_nc_resp_nc FOREIGN KEY (auditoria_nc_id) REFERENCES AUDITORIA_NC(id) ON DELETE CASCADE,
    CONSTRAINT fk_nc_resp_usuario FOREIGN KEY (usuario_id) REFERENCES USUARIOS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS AUDITORIA_NC_PROCESOS (
    auditoria_nc_id INT NOT NULL,
    proceso_id INT NOT NULL,
    PRIMARY KEY (auditoria_nc_id, proceso_id),
    CONSTRAINT fk_nc_procesos_nc FOREIGN KEY (auditoria_nc_id) REFERENCES AUDITORIA_NC(id) ON DELETE CASCADE,
    CONSTRAINT fk_nc_procesos_proceso FOREIGN KEY (proceso_id) REFERENCES PROCESOS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS CHAT_MESSAGES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requisito_id INT DEFAULT NULL,
    nc_id INT DEFAULT NULL,
    accion_id INT DEFAULT NULL,
    evidencia_id INT DEFAULT NULL,
    autor_id INT DEFAULT NULL,
    contenido TEXT NOT NULL,
    referencia_type VARCHAR(50) DEFAULT NULL,
    referencia_id INT DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edited_at DATETIME DEFAULT NULL,
    CONSTRAINT fk_chat_autor FOREIGN KEY (autor_id) REFERENCES USUARIOS(id) ON DELETE SET NULL,
    CONSTRAINT fk_chat_nc FOREIGN KEY (nc_id) REFERENCES AUDITORIA_NC(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_evidencia FOREIGN KEY (evidencia_id) REFERENCES EVIDENCIAS(id) ON DELETE CASCADE,
    INDEX idx_chat_nc_created (nc_id, created_at),
    INDEX idx_chat_req_created (requisito_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 7. TABLAS NIVEL 6 (Dependen de Nivel 5)
-- =========================================================

CREATE TABLE IF NOT EXISTS ACCIONES_CORRECTIVAS_HIST (
    id INT AUTO_INCREMENT PRIMARY KEY,
    accion_id INT NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    usuario_id INT,
    comentario TEXT,
    fecha_snapshot DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_acc_hist_acc FOREIGN KEY (accion_id) REFERENCES ACCIONES_CORRECTIVAS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fin del script