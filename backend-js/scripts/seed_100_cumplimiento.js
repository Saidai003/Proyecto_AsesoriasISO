/**
 * seed_100_cumplimiento.js
 * 
 * Simula un escenario de CUMPLIMIENTO TOTAL (100%) para TODOS los requisitos ISO.
 * Para cada requisito base en el workspace:
 * - Crea EVALUACION_REQUISITO con estado "Cumple"
 * - 2 evidencias aceptadas
 * - 1 brecha cerrada y aceptada con historial
 * - 1 acción correctiva eficaz
 * - Mensajes de chat simulando interacción evaluador/responsable
 * 
 * Uso: node scripts/seed_100_cumplimiento.js
 */
require('dotenv').config();
const { pool } = require('../src/db');

// --- CONFIGURACIÓN ---
const WORKSPACE_ID = 1;
const EVALUADOR_ID = 2;      // evaluador@demo.local
const RESPONSABLE_ID = 1;    // responsable@demo.local

// Comentarios variados para evidencias aceptadas
const COMENTARIOS_EVIDENCIAS = [
  'Documento aprobado - cumple con los requisitos normativos',
  'Registro verificado y conforme al procedimiento establecido',
  'Evidencia documental completa y actualizada',
  'Soporte validado por el equipo evaluador',
  'Documentación conforme al estándar ISO 9001:2015',
  'Registro de gestión aprobado satisfactoriamente',
  'Evidencia de implementación efectiva del proceso',
  'Documento revisado y aceptado sin observaciones',
];

// Títulos y descripciones para brechas cerradas
const BRECHAS_CERRADAS = [
  { titulo: 'Documentación incompleta', desc: 'Se detectó falta de registros actualizados', comentario: 'Brecha resuelta - documentación actualizada y verificada' },
  { titulo: 'Proceso sin evidencia de seguimiento', desc: 'No se evidenciaba monitoreo periódico del proceso', comentario: 'Se implementó seguimiento trimestral con registros' },
  { titulo: 'Falta de registros de capacitación', desc: 'Personal sin evidencia de formación en el proceso', comentario: 'Registros de capacitación completados y archivados' },
  { titulo: 'Control de documentos desactualizado', desc: 'Versiones obsoletas en circulación', comentario: 'Sistema de control documental actualizado' },
  { titulo: 'Indicadores no definidos', desc: 'Falta de métricas de desempeño del proceso', comentario: 'Indicadores definidos y con primer ciclo de medición completado' },
  { titulo: 'Comunicación interna insuficiente', desc: 'No se evidencia difusión de la política', comentario: 'Plan de comunicación implementado con registros de difusión' },
];

// Mensajes de chat para simular interacción
const MENSAJES_CHAT = [
  { autor: 'EVALUADOR', contenido: 'He revisado la documentación presentada. Todo conforme.' },
  { autor: 'RESPONSABLE', contenido: 'Gracias por la revisión. Quedo atento a cualquier observación adicional.' },
  { autor: 'EVALUADOR', contenido: 'Brecha cerrada satisfactoriamente. Buen trabajo del equipo.' },
];

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener todos los requisitos base
    const [requisitos] = await conn.execute('SELECT id, descripcion_normativa FROM REQUISITOS_BASE ORDER BY id');
    console.log(`[seed_100] Encontrados ${requisitos.length} requisitos base.`);

    // Limpiar datos previos del workspace
    console.log('[seed_100] Limpiando datos previos del workspace', WORKSPACE_ID, '...');
    const [existingEvals] = await conn.execute(
      'SELECT id FROM EVALUACION_REQUISITO WHERE workspace_id = ?', [WORKSPACE_ID]
    );

    for (const ev of existingEvals) {
      // Limpiar chat messages asociados al requisito
      await conn.execute('DELETE FROM CHAT_MESSAGES WHERE requisito_id = ?', [ev.id]);

      // Limpiar NCs y dependencias
      const [ncs] = await conn.execute('SELECT id FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?', [ev.id]);
      for (const nc of ncs) {
        await conn.execute('DELETE FROM ACCIONES_CORRECTIVAS_HIST WHERE accion_id IN (SELECT id FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id = ?)', [nc.id]);
        await conn.execute('DELETE FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id = ?', [nc.id]);
        await conn.execute('DELETE FROM AUDITORIA_NC_HIST WHERE nc_id = ?', [nc.id]);
        await conn.execute('DELETE FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [nc.id]);
        await conn.execute('DELETE FROM SCHEDULED_NOTIFICATIONS WHERE nc_id = ?', [nc.id]);
        await conn.execute('DELETE FROM CHAT_MESSAGES WHERE nc_id = ?', [nc.id]);
      }
      await conn.execute('DELETE FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?', [ev.id]);

      // Limpiar evidencias y logs
      const [evids] = await conn.execute('SELECT id FROM EVIDENCIAS WHERE evaluacion_requisito_id = ?', [ev.id]);
      for (const evid of evids) {
        await conn.execute('DELETE FROM EVIDENCIAS_LOG WHERE evidencia_id = ?', [evid.id]);
        await conn.execute('DELETE FROM CHAT_MESSAGES WHERE evidencia_id = ?', [evid.id]);
      }
      await conn.execute('DELETE FROM EVIDENCIAS WHERE evaluacion_requisito_id = ?', [ev.id]);
    }

    // Limpiar historial y evaluaciones
    await conn.execute('DELETE FROM EVALUACION_REQUISITO_HIST WHERE ev_id IN (SELECT id FROM EVALUACION_REQUISITO WHERE workspace_id = ?)', [WORKSPACE_ID]);
    await conn.execute('DELETE FROM EVALUACION_REQUISITO WHERE workspace_id = ?', [WORKSPACE_ID]);

    console.log('[seed_100] Datos previos eliminados. Insertando escenario 100% cumplimiento...');

    let totalEvidencias = 0;
    let totalBrechas = 0;
    let totalAcciones = 0;
    let totalMensajes = 0;

    for (let i = 0; i < requisitos.length; i++) {
      const req = requisitos[i];

      // 1. Crear EVALUACION_REQUISITO con "Cumple"
      const [erResult] = await conn.execute(
        `INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, ultima_edicion_por, fecha_ultima_edicion)
         VALUES (?, ?, 'Cumple', ?, NOW() - INTERVAL ? DAY)`,
        [req.id, WORKSPACE_ID, EVALUADOR_ID, requisitos.length - i]
      );
      const evaluacionId = erResult.insertId;

      // 2. Insertar 2 evidencias aceptadas
      const comentario1 = COMENTARIOS_EVIDENCIAS[i % COMENTARIOS_EVIDENCIAS.length];
      const comentario2 = COMENTARIOS_EVIDENCIAS[(i + 3) % COMENTARIOS_EVIDENCIAS.length];

      await conn.execute(
        `INSERT INTO EVIDENCIAS (evaluacion_requisito_id, usuario_carga_id, nombre_archivo, url_archivo, tipo_formato, estado_validacion_archivo, comentario_evidencia, fecha_carga)
         VALUES (?, ?, ?, ?, 'pdf', 'Aceptado', ?, NOW() - INTERVAL ? DAY)`,
        [evaluacionId, RESPONSABLE_ID, `evidencia_${req.id}_01.pdf`, `drive://seed_ev_${req.id}_01`, comentario1, requisitos.length - i + 5]
      );
      await conn.execute(
        `INSERT INTO EVIDENCIAS (evaluacion_requisito_id, usuario_carga_id, nombre_archivo, url_archivo, tipo_formato, estado_validacion_archivo, comentario_evidencia, fecha_carga)
         VALUES (?, ?, ?, ?, 'docx', 'Aceptado', ?, NOW() - INTERVAL ? DAY)`,
        [evaluacionId, RESPONSABLE_ID, `registro_${req.id}_02.docx`, `drive://seed_ev_${req.id}_02`, comentario2, requisitos.length - i + 2]
      );
      totalEvidencias += 2;

      // 3. Insertar 1 brecha cerrada con historial
      const brecha = BRECHAS_CERRADAS[i % BRECHAS_CERRADAS.length];
      const [ncResult] = await conn.execute(
        `INSERT INTO AUDITORIA_NC (evaluacion_requisito_id, evaluador_id, estado_flujo, estado_validacion, comentario_nc, titulo, descripcion, ultima_edicion_por, fecha_ultima_edicion)
         VALUES (?, ?, 'Cerrada', 'Acepto', ?, ?, ?, ?, NOW() - INTERVAL ? DAY)`,
        [evaluacionId, EVALUADOR_ID, brecha.comentario, brecha.titulo, brecha.desc, EVALUADOR_ID, requisitos.length - i]
      );
      const ncId = ncResult.insertId;
      totalBrechas++;

      // Asignar responsable a la brecha
      await conn.execute(
        'INSERT INTO AUDITORIA_NC_RESPONSABLES (auditoria_nc_id, usuario_id) VALUES (?, ?)',
        [ncId, RESPONSABLE_ID]
      );

      // Historial de la brecha (abierta -> cerrada)
      await conn.execute(
        `INSERT INTO AUDITORIA_NC_HIST (nc_id, estado_flujo, estado_validacion, ultima_edicion_por, fecha_snapshot)
         VALUES (?, 'Abierta', 'Parcial', ?, NOW() - INTERVAL ? DAY)`,
        [ncId, EVALUADOR_ID, requisitos.length - i + 10]
      );
      await conn.execute(
        `INSERT INTO AUDITORIA_NC_HIST (nc_id, estado_flujo, estado_validacion, ultima_edicion_por, fecha_snapshot)
         VALUES (?, 'Cerrada', 'Acepto', ?, NOW() - INTERVAL ? DAY)`,
        [ncId, EVALUADOR_ID, requisitos.length - i]
      );

      // 4. Acción correctiva eficaz
      await conn.execute(
        `INSERT INTO ACCIONES_CORRECTIVAS (auditoria_nc_id, autor_id, tipo_autor, nc, accion, estado_accion, fecha_accion)
         VALUES (?, ?, 'Responsable SGC', ?, 'Se implementaron las correcciones necesarias y se verificó su eficacia', 'Eficaz', NOW() - INTERVAL ? DAY)`,
        [ncId, RESPONSABLE_ID, brecha.desc, requisitos.length - i + 1]
      );
      totalAcciones++;

      // 5. Mensajes de chat en el requisito
      for (const msg of MENSAJES_CHAT) {
        const autorId = msg.autor === 'EVALUADOR' ? EVALUADOR_ID : RESPONSABLE_ID;
        await conn.execute(
          `INSERT INTO CHAT_MESSAGES (requisito_id, nc_id, autor_id, contenido, created_at)
           VALUES (?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
          [evaluacionId, ncId, autorId, msg.contenido, (requisitos.length - i) * 24 + MENSAJES_CHAT.indexOf(msg)]
        );
        totalMensajes++;
      }
    }

    await conn.commit();
    console.log('[seed_100] ✅ Seed de cumplimiento 100% aplicado exitosamente.');
    console.log(`  → ${requisitos.length} requisitos evaluados como "Cumple"`);
    console.log(`  → ${totalEvidencias} evidencias aceptadas`);
    console.log(`  → ${totalBrechas} brechas cerradas con historial`);
    console.log(`  → ${totalAcciones} acciones correctivas eficaces`);
    console.log(`  → ${totalMensajes} mensajes de chat`);
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
