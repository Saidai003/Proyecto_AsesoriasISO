/**
 * seed_50_cumplimiento.js
 * 
 * Simula un escenario REALISTA de gestión ISO con ~50% de cumplimiento global.
 * Usa randomización con seed fijo (reproducible) para generar variabilidad:
 * - Cantidad variable de evidencias (1-4) con estados mixtos
 * - Cantidad variable de brechas (0-3) con estados mixtos
 * - Acciones correctivas en distintos estados
 * - Mensajes de chat con conversaciones variadas
 * 
 * El resultado es un escenario "desordenado" y realista donde cada requisito
 * tiene una situación diferente.
 * 
 * Uso: node scripts/seed_50_cumplimiento.js
 */
require('dotenv').config();
const { pool } = require('../src/db');

// --- CONFIGURACIÓN ---
const WORKSPACE_ID = 1;
const EVALUADOR_ID = 2;      // evaluador@demo.local
const RESPONSABLE_ID = 1;    // responsable@demo.local
const SEED = 42;             // Seed fijo para reproducibilidad

// --- PRNG simple (Mulberry32) para resultados reproducibles ---
function mulberry32(seed) {
  let s = seed;
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);

// Helpers
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function chance(probability) { return rand() < probability; }

// --- DATOS VARIADOS ---
const NOMBRES_ARCHIVO = [
  'procedimiento_v2.pdf', 'manual_calidad.docx', 'registro_auditoria.xlsx',
  'acta_reunion.pdf', 'informe_seguimiento.pdf', 'matriz_riesgos.xlsx',
  'plan_accion.docx', 'evidencia_capacitacion.pdf', 'minuta_revision.docx',
  'formato_control.xlsx', 'politica_calidad.pdf', 'diagrama_proceso.png',
  'checklist_verificacion.pdf', 'reporte_indicadores.xlsx', 'carta_compromiso.pdf',
  'fotografias_implementacion.zip', 'video_capacitacion.mp4', 'presentacion_sgc.pptx',
];

const FORMATOS = ['pdf', 'docx', 'xlsx', 'png', 'pptx', 'zip'];

const COMENTARIOS_ACEPTADO = [
  'Documento aprobado - cumple con los requisitos normativos',
  'Registro verificado y conforme al procedimiento',
  'Evidencia completa y actualizada',
  'Validado por el equipo evaluador sin observaciones',
  'Conforme al estándar ISO 9001:2015',
  'Aprobado - demuestra implementación efectiva',
];

const COMENTARIOS_RECHAZADO = [
  'Documento no corresponde al requisito evaluado',
  'Registro desactualizado - versión obsoleta del 2019',
  'Evidencia insuficiente, falta información clave',
  'Formato incorrecto según procedimiento de control documental',
  'No demuestra implementación, solo intención',
  'Documento genérico, no específico para este proceso',
  'Falta firma de aprobación del responsable',
];

const COMENTARIOS_PENDIENTE = [
  'Pendiente de revisión por el evaluador',
  'Documento cargado recientemente - en cola de validación',
  'Requiere verificación cruzada con otro departamento',
  'En espera de confirmación del responsable del proceso',
  'Pendiente revisión técnica especializada',
];

const BRECHAS_ABIERTAS = [
  { titulo: 'Proceso sin documentar', desc: 'No existe procedimiento documentado para este proceso' },
  { titulo: 'Evidencias insuficientes', desc: 'Las evidencias no demuestran implementación efectiva' },
  { titulo: 'Indicadores sin medición', desc: 'No se han definido ni medido indicadores de desempeño' },
  { titulo: 'Falta de seguimiento', desc: 'No hay evidencia de revisiones periódicas' },
  { titulo: 'Comunicación deficiente', desc: 'No se evidencia difusión de requisitos al personal' },
  { titulo: 'Recursos no asignados', desc: 'No se evidencia asignación formal de recursos' },
  { titulo: 'Competencias sin evaluar', desc: 'No hay registros de evaluación de competencias del personal' },
  { titulo: 'Riesgos no identificados', desc: 'Falta análisis de riesgos y oportunidades del proceso' },
  { titulo: 'Retroalimentación ignorada', desc: 'No se procesa la retroalimentación de partes interesadas' },
  { titulo: 'Acciones previas sin cerrar', desc: 'Existen acciones correctivas previas sin cierre formal' },
];

const BRECHAS_CERRADAS = [
  { titulo: 'Documentación actualizada', desc: 'Se requería actualizar procedimientos documentados' },
  { titulo: 'Registros completados', desc: 'Faltaban registros de monitoreo periódico' },
  { titulo: 'Capacitación ejecutada', desc: 'Personal sin formación documentada en el proceso' },
  { titulo: 'Control de versiones implementado', desc: 'Documentos sin control de cambios' },
  { titulo: 'Comunicación mejorada', desc: 'Deficiencia en difusión de la política de calidad' },
  { titulo: 'Trazabilidad establecida', desc: 'No se podía rastrear el origen de los registros' },
];

const COMENTARIOS_NC_CIERRE = [
  'Brecha resuelta satisfactoriamente tras implementación de acciones',
  'Correcciones verificadas en auditoría de seguimiento',
  'Evidencia de cierre revisada y aprobada',
  'Acción correctiva eficaz - no se repite la no conformidad',
];

const COMENTARIOS_NC_ABIERTA = [
  'Se requiere presentar evidencia de implementación',
  'Pendiente de revisión en próxima auditoría de seguimiento',
  'Responsable notificado - plazo de 30 días para respuesta',
  'Escalado a dirección por incumplimiento reiterado',
  'En espera de recursos para implementar la corrección',
];

const ACCIONES_EFICAZ = [
  'Se implementó el procedimiento y se verificó su uso durante 3 meses',
  'Capacitación ejecutada al 100% del personal involucrado',
  'Nuevo formato implementado y registros generados correctamente',
  'Indicadores definidos con primer ciclo de medición completado',
  'Sistema de control documental actualizado y en operación',
];

const ACCIONES_PENDIENTE = [
  'Plan de acción en elaboración por el equipo responsable',
  'Esperando aprobación de presupuesto para implementación',
  'En proceso de definición de alcance y responsables',
  'Pendiente asignación de recursos humanos adicionales',
];

const ACCIONES_EN_PROGRESO = [
  'Implementación al 60% - falta documentar resultados',
  'Capacitación iniciada, pendiente segundo grupo',
  'Formato piloto en uso, evaluando efectividad',
  'Indicadores definidos, pendiente primera medición',
];

const MENSAJES_VARIADOS = [
  { autor: 'EVALUADOR', contenido: 'He revisado la documentación. Necesito aclaración sobre el alcance del procedimiento.' },
  { autor: 'RESPONSABLE', contenido: 'Te envío el documento actualizado con las correcciones solicitadas.' },
  { autor: 'EVALUADOR', contenido: 'La evidencia no es suficiente. Se requiere el registro original firmado.' },
  { autor: 'RESPONSABLE', contenido: 'Estamos trabajando en completar la documentación faltante.' },
  { autor: 'EVALUADOR', contenido: 'Brecha cerrada. Buen trabajo del equipo.' },
  { autor: 'RESPONSABLE', contenido: 'Gracias. ¿Hay algún otro punto pendiente en este requisito?' },
  { autor: 'EVALUADOR', contenido: 'Se genera hallazgo. Favor presentar plan de acción en 15 días.' },
  { autor: 'RESPONSABLE', contenido: 'Recibido. Coordinaré con el equipo para elaborar el plan.' },
  { autor: 'EVALUADOR', contenido: 'La acción correctiva propuesta es adecuada. Proceder con implementación.' },
  { autor: 'RESPONSABLE', contenido: '¿Podemos agendar una reunión para revisar los avances?' },
  { autor: 'EVALUADOR', contenido: 'Verificación de eficacia programada para el próximo mes.' },
  { autor: 'RESPONSABLE', contenido: 'Ya están cargados los registros del último trimestre.' },
  { autor: 'EVALUADOR', contenido: 'Revisé los registros. Uno de ellos está incompleto (falta fecha).' },
  { autor: 'RESPONSABLE', contenido: 'Corregido y recargado. Disculpa la omisión.' },
];

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener todos los requisitos base
    const [requisitos] = await conn.execute('SELECT id, descripcion_normativa FROM REQUISITOS_BASE ORDER BY id');
    console.log(`[seed_50] Encontrados ${requisitos.length} requisitos base.`);

    // Limpiar datos previos del workspace
    console.log('[seed_50] Limpiando datos previos del workspace', WORKSPACE_ID, '...');
    const [existingEvals] = await conn.execute(
      'SELECT id FROM EVALUACION_REQUISITO WHERE workspace_id = ?', [WORKSPACE_ID]
    );

    for (const ev of existingEvals) {
      await conn.execute('DELETE FROM CHAT_MESSAGES WHERE requisito_id = ?', [ev.id]);

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

      const [evids] = await conn.execute('SELECT id FROM EVIDENCIAS WHERE evaluacion_requisito_id = ?', [ev.id]);
      for (const evid of evids) {
        await conn.execute('DELETE FROM EVIDENCIAS_LOG WHERE evidencia_id = ?', [evid.id]);
        await conn.execute('DELETE FROM CHAT_MESSAGES WHERE evidencia_id = ?', [evid.id]);
      }
      await conn.execute('DELETE FROM EVIDENCIAS WHERE evaluacion_requisito_id = ?', [ev.id]);
    }

    await conn.execute('DELETE FROM EVALUACION_REQUISITO_HIST WHERE ev_id IN (SELECT id FROM EVALUACION_REQUISITO WHERE workspace_id = ?)', [WORKSPACE_ID]);
    await conn.execute('DELETE FROM EVALUACION_REQUISITO WHERE workspace_id = ?', [WORKSPACE_ID]);

    console.log('[seed_50] Datos previos eliminados. Generando escenario aleatorio (~50% cumplimiento)...');

    let countCumple = 0;
    let countNoCumple = 0;
    let countParcial = 0;
    let totalEvidencias = 0;
    let totalBrechas = 0;
    let totalAcciones = 0;
    let totalMensajes = 0;

    for (let i = 0; i < requisitos.length; i++) {
      const req = requisitos[i];
      const daysAgo = randInt(5, 90); // Fecha de última edición aleatoria

      // Decidir estado del requisito con probabilidad:
      // ~45% Cumple, ~35% No cumple, ~20% Parcial (pero Parcial no existe como enum válido, se mapea)
      // El enum acepta: Cumple, Parcial, No cumple, NA
      const roll = rand();
      let estado;
      if (roll < 0.45) estado = 'Cumple';
      else if (roll < 0.80) estado = 'No cumple';
      else estado = 'Parcial';

      // 1. Crear EVALUACION_REQUISITO
      const [erResult] = await conn.execute(
        `INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, ultima_edicion_por, fecha_ultima_edicion)
         VALUES (?, ?, ?, ?, NOW() - INTERVAL ? DAY)`,
        [req.id, WORKSPACE_ID, estado, EVALUADOR_ID, daysAgo]
      );
      const evaluacionId = erResult.insertId;

      if (estado === 'Cumple') countCumple++;
      else if (estado === 'No cumple') countNoCumple++;
      else countParcial++;

      // 2. Evidencias - cantidad variable (1-4)
      const numEvidencias = randInt(1, 4);
      for (let e = 0; e < numEvidencias; e++) {
        let estadoEvidencia;
        if (estado === 'Cumple') {
          // Mayormente aceptadas, alguna pendiente posible
          estadoEvidencia = chance(0.85) ? 'Aceptado' : 'Pendiente';
        } else if (estado === 'No cumple') {
          // Mix de rechazadas y pendientes, rara vez aceptada
          const evRoll = rand();
          if (evRoll < 0.45) estadoEvidencia = 'Rechazado';
          else if (evRoll < 0.85) estadoEvidencia = 'Pendiente';
          else estadoEvidencia = 'Aceptado';
        } else {
          // Parcial: mix de todo
          const evRoll = rand();
          if (evRoll < 0.4) estadoEvidencia = 'Aceptado';
          else if (evRoll < 0.7) estadoEvidencia = 'Pendiente';
          else estadoEvidencia = 'Rechazado';
        }

        let comentario;
        if (estadoEvidencia === 'Aceptado') comentario = pick(COMENTARIOS_ACEPTADO);
        else if (estadoEvidencia === 'Rechazado') comentario = pick(COMENTARIOS_RECHAZADO);
        else comentario = pick(COMENTARIOS_PENDIENTE);

        const archivo = pick(NOMBRES_ARCHIVO);
        const formato = archivo.split('.').pop();

        await conn.execute(
          `INSERT INTO EVIDENCIAS (evaluacion_requisito_id, usuario_carga_id, nombre_archivo, url_archivo, tipo_formato, estado_validacion_archivo, comentario_evidencia, fecha_carga)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)`,
          [evaluacionId, RESPONSABLE_ID, archivo, `drive://seed_50_${req.id}_${e}`, formato, estadoEvidencia, comentario, daysAgo + randInt(0, 15)]
        );
        totalEvidencias++;
      }

      // 3. Brechas - cantidad variable según estado
      let numBrechas;
      if (estado === 'Cumple') numBrechas = chance(0.7) ? 1 : randInt(0, 2); // mayoría tiene 1 cerrada
      else if (estado === 'No cumple') numBrechas = randInt(1, 3); // al menos 1 abierta
      else numBrechas = randInt(1, 2); // parcial: mix

      for (let b = 0; b < numBrechas; b++) {
        let estadoFlujo, estadoValidacion, comentarioNc;

        if (estado === 'Cumple') {
          // Brechas cerradas
          estadoFlujo = 'Cerrada';
          estadoValidacion = 'Acepto';
          comentarioNc = pick(COMENTARIOS_NC_CIERRE);
        } else if (estado === 'No cumple') {
          // Mayoría abiertas, alguna podría estar parcial
          if (chance(0.8)) {
            estadoFlujo = 'Abierta';
            estadoValidacion = chance(0.6) ? 'No Acepto' : 'Parcial';
            comentarioNc = pick(COMENTARIOS_NC_ABIERTA);
          } else {
            estadoFlujo = 'Cerrada';
            estadoValidacion = 'Acepto';
            comentarioNc = pick(COMENTARIOS_NC_CIERRE);
          }
        } else {
          // Parcial: mix
          if (chance(0.5)) {
            estadoFlujo = 'Abierta';
            estadoValidacion = 'Parcial';
            comentarioNc = pick(COMENTARIOS_NC_ABIERTA);
          } else {
            estadoFlujo = 'Cerrada';
            estadoValidacion = 'Acepto';
            comentarioNc = pick(COMENTARIOS_NC_CIERRE);
          }
        }

        const brechaData = estadoFlujo === 'Cerrada' ? pick(BRECHAS_CERRADAS) : pick(BRECHAS_ABIERTAS);

        const [ncResult] = await conn.execute(
          `INSERT INTO AUDITORIA_NC (evaluacion_requisito_id, evaluador_id, estado_flujo, estado_validacion, comentario_nc, titulo, descripcion, ultima_edicion_por, fecha_ultima_edicion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)`,
          [evaluacionId, EVALUADOR_ID, estadoFlujo, estadoValidacion, comentarioNc, brechaData.titulo, brechaData.desc, EVALUADOR_ID, daysAgo - randInt(0, 5)]
        );
        const ncId = ncResult.insertId;
        totalBrechas++;

        // Asignar responsable
        await conn.execute(
          'INSERT INTO AUDITORIA_NC_RESPONSABLES (auditoria_nc_id, usuario_id) VALUES (?, ?)',
          [ncId, RESPONSABLE_ID]
        );

        // Historial de la brecha
        await conn.execute(
          `INSERT INTO AUDITORIA_NC_HIST (nc_id, estado_flujo, estado_validacion, ultima_edicion_por, fecha_snapshot)
           VALUES (?, 'Abierta', 'No Acepto', ?, NOW() - INTERVAL ? DAY)`,
          [ncId, EVALUADOR_ID, daysAgo + randInt(5, 20)]
        );

        if (estadoFlujo === 'Cerrada') {
          // Paso intermedio parcial
          if (chance(0.6)) {
            await conn.execute(
              `INSERT INTO AUDITORIA_NC_HIST (nc_id, estado_flujo, estado_validacion, ultima_edicion_por, fecha_snapshot)
               VALUES (?, 'Abierta', 'Parcial', ?, NOW() - INTERVAL ? DAY)`,
              [ncId, EVALUADOR_ID, daysAgo + randInt(2, 8)]
            );
          }
          await conn.execute(
            `INSERT INTO AUDITORIA_NC_HIST (nc_id, estado_flujo, estado_validacion, ultima_edicion_por, fecha_snapshot)
             VALUES (?, 'Cerrada', 'Acepto', ?, NOW() - INTERVAL ? DAY)`,
            [ncId, EVALUADOR_ID, daysAgo]
          );
        }

        // 4. Acciones correctivas (1-2 por brecha)
        const numAcciones = randInt(1, 2);
        for (let a = 0; a < numAcciones; a++) {
          let estadoAccion, textoAccion;

          if (estadoFlujo === 'Cerrada') {
            // Brecha cerrada: acciones mayormente eficaces
            if (chance(0.8)) {
              estadoAccion = 'Eficaz';
              textoAccion = pick(ACCIONES_EFICAZ);
            } else {
              estadoAccion = 'En_Progreso';
              textoAccion = pick(ACCIONES_EN_PROGRESO);
            }
          } else {
            // Brecha abierta: acciones en distintos estados
            const accRoll = rand();
            if (accRoll < 0.4) {
              estadoAccion = 'Pendiente';
              textoAccion = pick(ACCIONES_PENDIENTE);
            } else if (accRoll < 0.75) {
              estadoAccion = 'En_Progreso';
              textoAccion = pick(ACCIONES_EN_PROGRESO);
            } else {
              estadoAccion = 'Eficaz';
              textoAccion = pick(ACCIONES_EFICAZ);
            }
          }

          await conn.execute(
            `INSERT INTO ACCIONES_CORRECTIVAS (auditoria_nc_id, autor_id, tipo_autor, nc, accion, estado_accion, fecha_accion)
             VALUES (?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)`,
            [ncId, RESPONSABLE_ID, pick(['Responsable SGC', 'Evaluador']), brechaData.desc, textoAccion, estadoAccion, daysAgo - randInt(0, 10)]
          );
          totalAcciones++;
        }

        // 5. Mensajes de chat por brecha (2-5 mensajes aleatorios)
        const numMensajes = randInt(2, 5);
        const mensajesUsados = new Set();
        for (let m = 0; m < numMensajes; m++) {
          let msgIdx;
          do { msgIdx = Math.floor(rand() * MENSAJES_VARIADOS.length); }
          while (mensajesUsados.has(msgIdx) && mensajesUsados.size < MENSAJES_VARIADOS.length);
          mensajesUsados.add(msgIdx);

          const msg = MENSAJES_VARIADOS[msgIdx];
          const autorId = msg.autor === 'EVALUADOR' ? EVALUADOR_ID : RESPONSABLE_ID;

          await conn.execute(
            `INSERT INTO CHAT_MESSAGES (requisito_id, nc_id, autor_id, contenido, created_at)
             VALUES (?, ?, ?, ?, NOW() - INTERVAL ? HOUR)`,
            [evaluacionId, ncId, autorId, msg.contenido, daysAgo * 24 - m * randInt(1, 48)]
          );
          totalMensajes++;
        }
      }
    }

    await conn.commit();

    const total = countCumple + countNoCumple + countParcial;
    const pctCumple = ((countCumple / total) * 100).toFixed(1);
    const pctNoCumple = ((countNoCumple / total) * 100).toFixed(1);
    const pctParcial = ((countParcial / total) * 100).toFixed(1);

    console.log('[seed_50] ✅ Seed de cumplimiento parcial aplicado exitosamente.');
    console.log(`  → ${total} requisitos evaluados:`);
    console.log(`     • ${countCumple} "Cumple" (${pctCumple}%)`);
    console.log(`     • ${countNoCumple} "No cumple" (${pctNoCumple}%)`);
    console.log(`     • ${countParcial} "Parcial" (${pctParcial}%)`);
    console.log(`  → ${totalEvidencias} evidencias (estados variados)`);
    console.log(`  → ${totalBrechas} brechas (abiertas y cerradas)`);
    console.log(`  → ${totalAcciones} acciones correctivas`);
    console.log(`  → ${totalMensajes} mensajes de chat`);
    console.log(`  → Seed PRNG: ${SEED} (reproducible)`);
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
