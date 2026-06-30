---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Google Drive — ¿Por qué no S3?

## Decisión

| Criterio | AWS S3 | Google Drive |
|----------|--------|--------------|
| Costo | Pago por uso | Gratuito (15 GB) |
| Complejidad setup | IAM, policies, SDK | OAuth2 + 1 token |
| Experiencia previa | Baja | Media |
| Organización | Buckets + prefixes | Carpetas por workspace |
| Viabilidad MVP | Requiere cuenta AWS pagada | Cuenta Google existente |

**Decisión:** Google Drive como solución intermedia simple para el MVP. S3 queda como opción para producción a escala.

---

# Google Drive — Flujo Técnico

```
1. Frontend envía base64 (data:mime;base64,...)
2. Backend parsea mime + content
3. driveService.ensureFolder(rootId, workspaceName)
   → Crea o encuentra carpeta del workspace
4. driveService.uploadBuffer({ buffer, mimeType, name, parents })
5. Drive retorna: { id, webViewLink, webContentLink }
6. DB: drive_file_id = id, url_archivo = "drive://{id}"
```

## Estructura en Drive
```
GOOGLE_DRIVE_FOLDER_ID (raíz)
├── Development/
│   ├── Empresa A/
│   │   └── evidencia1.pdf
│   └── Empresa B/
│       └── evidencia2.jpg
└── Production/
    └── ...
```

---

# ¿Qué pasa si Google Drive no está disponible?

- El token OAuth2 se almacena en `.credentials/drive_token.json`
- Si el token expira, se refresca automáticamente
- Si Drive está caído: el upload falla con error claro, no corrompe datos en DB
- Evidencias en DB tienen `drive_file_id`: si Drive se migra, solo se actualiza `url_archivo`
- Tests unitarios mockean Drive (`driveService.unit.test.js`)
