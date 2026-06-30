---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Objetivo General

Diseñar e implementar un **MVP de plataforma web** para Asesorías ISO RCR SpA que permita:

- Ejecutar GAP Análisis de ISO 9001:2015
- Gestionar evidencias por requisito
- Controlar el flujo de No Conformidades
- Operar con roles, espacios de trabajo y trazabilidad

---

# Objetivos Específicos

1. Definir arquitectura funcional (roles, permisos, multi-tenancy)
2. Implementar autenticación, autorización y CRUD de usuarios/workspaces
3. Cargar estructura ISO 9001:2015 mediante seeding
4. Desarrollar motor GAP + NC + Acciones Correctivas + indicadores
5. Implementar gestión de evidencias (carga, revisión, historial)
6. Validar mediante pruebas unitarias, integración, multi-tenancy y UAT
