## Versionado nativo de archivos en Google Drive.

Actualmente, la plataforma permite actualizar evidencias manteniendo la funcionalidad de gestión documental. Sin embargo, no se aprovecha completamente el sistema de revisiones/versiones que ofrece Google Drive para los archivos binarios mediante su API. Como trabajo futuro, se propone investigar e implementar un mecanismo que permita conservar y consultar el historial de versiones de un mismo archivo utilizando las capacidades nativas de Google Drive, evitando la creación de archivos independientes cuando corresponda.

Se investigó el uso de files.update() y del parámetro keepRevisionForever de la API de Google Drive. No obstante, debido a la complejidad del comportamiento observado entre la API y la interfaz web de Google Drive, y considerando el alcance temporal del proyecto, se decidió mantener una implementación funcional y dejar la integración completa del versionado nativo como una mejora futura.
