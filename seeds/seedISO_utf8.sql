-- Data-only seed for ISO 9001 (inserts only, avoids schema/constraints)
SET NAMES utf8mb4;

INSERT INTO ISOS (nombre, descripcion)
VALUES ('ISO 9001:2015', 'Sistemas de gestión de la calidad — Requisitos');
SELECT LAST_INSERT_ID() INTO @ISO_ID;

INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 4, 'Contexto de la organización');
SELECT LAST_INSERT_ID() INTO @CLAUSULA4_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA4_ID, NULL, '4.1 Comprensión de la organización y de su contexto'),
(@CLAUSULA4_ID, NULL, '4.2 Comprensión de las necesidades y expectativas de las partes interesadas'),
(@CLAUSULA4_ID, NULL, '4.3 Determinación del alcance del sistema de gestión de la calidad'),
(@CLAUSULA4_ID, NULL, '4.4 Sistema de gestión de la calidad y sus procesos');

-- Cláusula 5
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
VALUES (@CLAUSULA5_ID, NULL, '5.2 Política');
SELECT LAST_INSERT_ID() INTO @REQ52_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA5_ID, @REQ52_ID, '5.2.1 Establecimiento de la política de la calidad'),
(@CLAUSULA5_ID, @REQ52_ID, '5.2.2 Comunicación de la política de la calidad');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA5_ID, NULL, '5.3 Roles, responsabilidades y autoridades en la organización');

-- Cláusula 6
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 6, 'Planificación');
SELECT LAST_INSERT_ID() INTO @CLAUSULA6_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA6_ID, NULL, '6.1 Acciones para abordar riesgos y oportunidades'),
(@CLAUSULA6_ID, NULL, '6.2 Objetivos de la calidad y planificación para lograrlos'),
(@CLAUSULA6_ID, NULL, '6.3 Planificación de los cambios');

-- Cláusula 7
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
(@CLAUSULA7_ID, @REQ71_ID, '7.1.4 Ambiente para la operación de los procesos');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA7_ID, @REQ71_ID, '7.1.5 Recursos de seguimiento y medición');
SELECT LAST_INSERT_ID() INTO @REQ715_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA7_ID, @REQ715_ID, '7.1.5.1 Generalidades'),
(@CLAUSULA7_ID, @REQ715_ID, '7.1.5.2 Trazabilidad de las mediciones');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA7_ID, @REQ71_ID, '7.1.6 Conocimientos de la organización');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA7_ID, NULL, '7.2 Competencia'),
(@CLAUSULA7_ID, NULL, '7.3 Toma de conciencia'),
(@CLAUSULA7_ID, NULL, '7.4 Comunicación');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA7_ID, NULL, '7.5 Información documentada');
SELECT LAST_INSERT_ID() INTO @REQ75_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA7_ID, @REQ75_ID, '7.5.1 Generalidades'),
(@CLAUSULA7_ID, @REQ75_ID, '7.5.2 Creación y actualización'),
(@CLAUSULA7_ID, @REQ75_ID, '7.5.3 Control de la información documentada');

-- Cláusula 8
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 8, 'Operación');
SELECT LAST_INSERT_ID() INTO @CLAUSULA8_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.1 Planificación y control operacional');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.2 Requisitos para los productos y servicios');
SELECT LAST_INSERT_ID() INTO @REQ82_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, @REQ82_ID, '8.2.1 Comunicación con el cliente'),
(@CLAUSULA8_ID, @REQ82_ID, '8.2.2 Determinación de los requisitos para los productos y servicios'),
(@CLAUSULA8_ID, @REQ82_ID, '8.2.3 Revisión de los requisitos para los productos y servicios'),
(@CLAUSULA8_ID, @REQ82_ID, '8.2.4 Cambios en los requisitos para los productos y servicios');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.3 Diseño y desarrollo de los productos y servicios');
SELECT LAST_INSERT_ID() INTO @REQ83_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, @REQ83_ID, '8.3.1 Generalidades'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.2 Planificación del diseño y desarrollo'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.3 Entradas para el diseño y desarrollo'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.4 Controles del diseño y desarrollo'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.5 Salidas del diseño y desarrollo'),
(@CLAUSULA8_ID, @REQ83_ID, '8.3.6 Cambios del diseño y desarrollo');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.4 Control de los procesos, productos y servicios suministrados externamente');
SELECT LAST_INSERT_ID() INTO @REQ84_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, @REQ84_ID, '8.4.1 Generalidades'),
(@CLAUSULA8_ID, @REQ84_ID, '8.4.2 Tipo y alcance del control'),
(@CLAUSULA8_ID, @REQ84_ID, '8.4.3 Información para los proveedores externos');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA8_ID, NULL, '8.5 Producción y provisión del servicio');
SELECT LAST_INSERT_ID() INTO @REQ85_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, @REQ85_ID, '8.5.1 Control de la producción y de la provisión del servicio'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.2 Identificación y trazabilidad'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.3 Propiedad perteneciente a los clientes o proveedores externos'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.4 Preservación'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.5 Actividades posteriores a la entrega'),
(@CLAUSULA8_ID, @REQ85_ID, '8.5.6 Control de los cambios');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA8_ID, NULL, '8.6 Liberación de los productos y servicios'),
(@CLAUSULA8_ID, NULL, '8.7 Control de las salidas no conformes');

-- Cláusula 9
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 9, 'Evaluación del desempeño');
SELECT LAST_INSERT_ID() INTO @CLAUSULA9_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA9_ID, NULL, '9.1 Seguimiento, medición, análisis y evaluación');
SELECT LAST_INSERT_ID() INTO @REQ91_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA9_ID, @REQ91_ID, '9.1.1 Generalidades'),
(@CLAUSULA9_ID, @REQ91_ID, '9.1.2 Satisfacción del cliente'),
(@CLAUSULA9_ID, @REQ91_ID, '9.1.3 Análisis y evaluación');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA9_ID, NULL, '9.2 Auditoría interna');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA9_ID, NULL, '9.3 Revisión por la dirección');
SELECT LAST_INSERT_ID() INTO @REQ93_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA9_ID, @REQ93_ID, '9.3.1 Generalidades'),
(@CLAUSULA9_ID, @REQ93_ID, '9.3.2 Entradas de la revisión por la dirección'),
(@CLAUSULA9_ID, @REQ93_ID, '9.3.3 Salidas de la revisión por la dirección');

-- Cláusula 10
INSERT INTO CLAUSULAS (iso_id, numero_clausula, titulo)
VALUES (@ISO_ID, 10, 'Mejora');
SELECT LAST_INSERT_ID() INTO @CLAUSULA10_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA10_ID, NULL, '10.1 Generalidades');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA10_ID, NULL, '10.2 No conformidad y acción correctiva');
SELECT LAST_INSERT_ID() INTO @REQ102_ID;

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES 
(@CLAUSULA10_ID, @REQ102_ID, '10.2.1 Reacción y evaluación de no conformidades'),
(@CLAUSULA10_ID, @REQ102_ID, '10.2.2 Conservación de información documentada de acciones correctivas');

INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA10_ID, NULL, '10.3 Mejora continua');

-- FIN del data-only seed
