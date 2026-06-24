/**
 * seed_50_cumplimiento.js
 * 
 * Simula un escenario de NO CUMPLIMIENTO para un requisito ISO.
 * - 1 evidencia rechazada + 1 evidencia pendiente (gatito.png)
 * - 1 brecha abierta con validación parcial
 * - Estado final del requisito: "No Cumple"
 * 
 * Uso: node scripts/seed_50_cumplimiento.js
 */
require('dotenv').config();
const { pool } = require('../src/db');

// --- CONFIGURACIÓN ---
const WORKSPACE_ID = 1;
const REQUISITO_BASE_ID = 2; // 4.2 Comprensión de necesidades y expectativas de partes interesadas
const EVALUADOR_ID = 2;      // evaluador@demo.local
const RESPONSABLE_ID = 1;    // responsable@demo.local

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('[seed_50] Limpiando datos previos para requisito_base_id =', REQUISITO_BASE_ID);

    // Obtener evaluacion_requisito_id si existe
    const [existingEr] = await conn.execute(
      'SELECT id FROM EVALUACION_REQUISITO WHERE requisito_base_id = ? AND workspace_id = ?',
      [REQUISITO_BASE_ID, WORKSPACE_ID]
    );

    if (existingEr.length > 0) {
      const erId = existingEr[0].id;

      // Limpiar historial de NCs asociadas
      const [existingNcs] = await conn.execute(
        'SELECT id FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?', [erId]
      );
      for (const nc of existingNcs) {
        await conn.execute('DELETE FROM AUDITORIA_NC_HIST WHERE nc_id = ?', [nc.id]);
        await conn.execute('DELETE FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id = ?', [nc.id]);
        await conn.execute('DELETE FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [nc.id]);
      }

      // Limpiar NCs
      await conn.execute('DELETE FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?', [erId]);

      // Limpiar evidencias
      await conn.execute('DELETE FROM EVIDENCIAS WHERE evaluacion_requisito_id = ?', [erId]);

      // Limpiar evaluacion_requisito
      await conn.execute('DELETE FROM EVALUACION_REQUISITO WHERE id = ?', [erId]);
    }

    // --- 1. Crear EVALUACION_REQUISITO con estado "No cumple" ---
    console.log('[seed_50] Insertando EVALUACION_REQUISITO...');
    const [erResult] = await conn.execute(
      `INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, fecha_ultima_edicion)
       VALUES (?, ?, 'No cumple', NOW())`,
      [REQUISITO_BASE_ID, WORKSPACE_ID]
    );
    const evaluacionId = erResult.insertId;
    console.log('[seed_50] evaluacion_requisito_id =', evaluacionId);

    // --- 2. Insertar 1 evidencia rechazada + 1 pendiente ---
    console.log('[seed_50] Insertando evidencias (1 rechazada, 1 pendiente)...');
    await conn.execute(
      `INSERT INTO EVIDENCIAS (evaluacion_requisito_id, usuario_carga_id, nombre_archivo, url_archivo, tipo_formato, estado_validacion_archivo, comentario_evidencia, fecha_carga)
       VALUES (?, ?, 'gatito.png', 'drive://seed_gatito_003', 'png', 'Rechazado', 'Documento no corresponde a partes interesadas identificadas', NOW())`,
      [evaluacionId, RESPONSABLE_ID]
    );
    await conn.execute(
      `INSERT INTO EVIDENCIAS (evaluacion_requisito_id, usuario_carga_id, nombre_archivo, url_archivo, tipo_formato, estado_validacion_archivo, comentario_evidencia, fecha_carga)
       VALUES (?, ?, 'gatito.png', 'drive://seed_gatito_004', 'png', 'Pendiente', 'Matriz de partes interesadas - pendiente de revisión', NOW())`,
      [evaluacionId, RESPONSABLE_ID]
    );

    // --- 3. Insertar 1 brecha ABIERTA con validación PARCIAL ---
    console.log('[seed_50] Insertando brecha abierta...');
    const [ncResult] = await conn.execute(
      `INSERT INTO AUDITORIA_NC (evaluacion_requisito_id, evaluador_id, estado_flujo, estado_validacion, comentario_nc, titulo, descripcion, ultima_edicion_por, fecha_ultima_edicion)
       VALUES (?, ?, 'Abierta', 'Parcial', 'Se requiere completar la identificación de partes interesadas', 'Partes interesadas incompletas', 'No se identifican todas las partes interesadas relevantes ni sus requisitos', ?, NOW())`,
      [evaluacionId, EVALUADOR_ID, EVALUADOR_ID]
    );
    const ncId = ncResult.insertId;

    // Asignar responsable
    await conn.execute(
      'INSERT INTO AUDITORIA_NC_RESPONSABLES (auditoria_nc_id, usuario_id) VALUES (?, ?)',
      [ncId, RESPONSABLE_ID]
    );

    await conn.commit();
    console.log('[seed_50] ✅ Seed de cumplimiento parcial/no cumple aplicado exitosamente.');
    console.log(`  → Requisito base: ${REQUISITO_BASE_ID}`);
    console.log(`  → Evaluación ID: ${evaluacionId}`);
    console.log(`  → 1 evidencia rechazada + 1 pendiente`);
    console.log(`  → 1 brecha abierta (NC #${ncId})`);
  } catch (err) {
    await conn.rollback();
    console.error('[seed_50] ❌ Error:', err.message);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
