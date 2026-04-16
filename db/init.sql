-- Inicializa la base de datos MySQL para el proyecto
CREATE DATABASE IF NOT EXISTS proyecto_iso CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Cambia estos valores en producción
CREATE USER IF NOT EXISTS 'proyecto_user'@'%' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON proyecto_iso.* TO 'proyecto_user'@'%';
FLUSH PRIVILEGES;
