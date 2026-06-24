/**
 * seed_100_cumplimiento.js
 * 
 * Simula un escenario de CUMPLIMIENTO TOTAL (100%) para un requisito ISO.
 * - 2 evidencias aceptadas (gatito.png)
 * - 1 brecha cerrada y aceptada con historial
 * - Estado final del requisito: "Cumple"
 * 
 * Uso: node scripts/seed_100_cumplimiento.js
 */
require('dotenv').config();
const { pool } = require('../src/db');

// --- CONFIGURACIÓN ---
const WORKSPACE_ID = 1;
const REQUISITO_BASE_ID = 1; // 4.1 Comprensión de la organización y de su contexto
const EVALUADOR_ID = 2;      // evaluador@demo.local
const RESPONSABLE_ID = 1;    // responsable@demo.local

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('[seed_100] Limpiando datos previos para requisito_base_id =', REQUISITO_BASE_ID);

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

    // --- 1. Crear EVALUACION_REQUISITO con estado "Cumple" ---
    console.log('[seed_100] Insertando EVALUACION_REQUISITO...');
    const [erResult] = await conn.execute(
      `INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, fecha_ultima_edicion)
       VALUES (?, ?, 'Cumple', NOW())`,
      [REQUISITO_BASE_ID, WORKSPACE_ID]
    );
    const evaluacionId = erResult.insertId;
    console.log('[seed_100] evaluacion_requisito_id =', evaluacionId);

    // --- 2. Insertar 2 evidencias aceptadas ---
    console.log('[seed_100] Insertando 2 evidencias aceptadas...');
    await conn.execute(
      `INSERT INTO EVIDENCIAS (evaluacion_requisito_id, usuario_carga_id, nombre_archivo, url_archivo, tipo_formato, estado_validacion_archivo, comentario_evidencia, fecha_carga)
       VALUES (?, ?, 'gatito.png', 'drive://seed_gatito_001', 'png', 'Aceptado', 'Evidencia de contexto organizacional aprobada', NOW())`,
      [evaluacionId, RESPONSABLE_ID]
    );
    await conn.execute(
      `INSERT INTO EVIDENCIAS (evaluacion_requisito_id, usuario_carga_id, nombre_archivo, url_archivo, tipo_formato, estado_validacion_archivo, comentario_evidencia, fecha_carga)
       VALUES (?, ?, 'gatito.png', 'drive://seed_gatito_002', 'png', 'Aceptado', 'Segundo soporte documental aprobado', NOW())`,
      [evaluacionId, RESPONSABLE_ID]
    );

    // --- 3. Insertar 1 brecha CERRADA y ACEPTADA ---
    console.log('[seed_100] Insertando brecha cerrada...');
    const [ncResult] = await conn.execute(
      `INSERT INTO AUDITORIA_NC (evaluacion_requisito_id, evaluador_id, estado_flujo, estado_validacion, comentario_nc, titulo, descripcion, ultima_edicion_por, fecha_ultima_edicion)
       VALUES (?, ?, 'Cerrada', 'Acepto', 'Brecha resuelta satisfactoriamente', 'Falta análisis de contexto externo', 'No se evidenciaba análisis PESTEL completo', ?, NOW())`,
      [evaluacionId, EVALUADOR_ID, EVALUADOR_ID]
    );
    const ncId = ncResult.insertId;

    // Asignar responsable
    await conn.execute(
      'INSERT INTO AUDITORIA_NC_RESPONSABLES (auditoria_nc_id, usuario_id) VALUES (?, ?)',
      [ncId, RESPONSABLE_ID]
    );

    // --- 4. Registrar historial de cierre ---
    console.log('[seed_100] Insertando historial de cierre...');
    await conn.execute(
      `INSERT INTO AUDITORIA_NC_HIST (nc_id, estado_flujo, estado_validacion, ultima_edicion_por, fecha_snapshot)
       VALUES (?, 'Cerrada', 'Acepto', ?, NOW())`,
      [ncId, EVALUADOR_ID]
    );

    await conn.commit();
    console.log('[seed_100] ✅ Seed de cumplimiento 100% aplicado exitosamente.');
    console.log(`  → Requisito base: ${REQUISITO_BASE_ID}`);
    console.log(`  → Evaluación ID: ${evaluacionId}`);
    console.log(`  → 2 evidencias aceptadas`);
    console.log(`  → 1 brecha cerrada (NC #${ncId})`);
  } catch (err) {
    await conn.rollback();
    console.error('[seed_100] ❌ Error:', err.message);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
