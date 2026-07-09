const { pool } = require('../db');
const { getAuthUser } = require('../lib/authUser');

// ------------------------------------------------------------------
// FUNCIONES AUXILIARES
// ------------------------------------------------------------------

// Función para construir filtros
// prefix is the table alias for fecha_ultima_edicion (e.g., 'nc' or 'er')
function buildFilters(req, prefix) {
  let sql = '';
  const params = [];
  
  if (req.query.startDate && req.query.endDate) {
    sql += ` AND ${prefix}.fecha_ultima_edicion BETWEEN ? AND ?`;
    params.push(req.query.startDate, req.query.endDate);
  } else {
    sql += ` AND ${prefix}.fecha_ultima_edicion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`;
  }

  if (req.query.clause) {
    sql += ` AND c.numero_clausula = ?`;
    params.push(Number(req.query.clause));
  }
  
  return { sql, params };
}

// Calcula métricas/KPIs y datos de cumplimiento agregados por cláusula y por requisito.
// Reutilizable por evaluator y responsable (ambos comparten el mismo workspace).
async function buildComplianceDashboard(workspaceId) {
  // --- 1. Evaluaciones por requisito (estado de cumplimiento) ---
  // Use a subquery to deduplicate: keep only one row per requisito_base_id
  // (the one with the highest id, i.e. most recent) to handle duplicate inserts.
  let evaluacionesResult;
  try {
    evaluacionesResult = await pool.execute(`
      SELECT
        er.id as evaluacion_id,
        er.estado_cumplimiento as estado,
        r.id as requisito_id,
        r.requisito_padre_id,
        CONCAT(c.numero_clausula, '.', r.id) as codigo,
        r.descripcion_normativa as descripcion,
        c.numero_clausula as clausula
      FROM EVALUACION_REQUISITO er
      JOIN REQUISITOS_BASE r ON er.requisito_base_id = r.id
      JOIN CLAUSULAS c ON r.clausula_id = c.id
      WHERE er.workspace_id = ?
    `, [workspaceId]);
  } catch (e) {
    evaluacionesResult = [[ ]];
  }

  const evaluaciones = Array.isArray(evaluacionesResult?.[0]) ? evaluacionesResult[0] : [];

  // Métricas generales basadas en EVALUACION_REQUISITO
  // ISO 9001:2015 Req 4.3: requisitos "NA" (No Aplica) se excluyen del cálculo de cumplimiento
  const evaluacionesAplicables = evaluaciones.filter(e => e.estado !== 'NA');
  const totalReqs = evaluacionesAplicables.length;
  const cumple = evaluacionesAplicables.filter(e => e.estado === 'Cumple').length;
  const parcial = evaluacionesAplicables.filter(e => e.estado === 'Parcial').length;
  const noCumple = evaluacionesAplicables.filter(e => e.estado === 'No cumple').length;
  const totalNA = evaluaciones.filter(e => e.estado === 'NA').length;
  
  const porcentajeCumplimiento = totalReqs > 0
    ? Math.round(((cumple + parcial * 0.5) / totalReqs) * 100)
    : 0;

  // --- 2. Agregado por cláusula (4..9) para el radar global ---
  const clausulasInteres = [4, 5, 6, 7, 8, 9];
  const porClausula = clausulasInteres.map(num => {
    const reqs = evaluaciones.filter(e => Number(e.clausula) === num);
    // ISO 9001 Req 4.3: excluir NA del cálculo por cláusula
    const reqsAplicables = reqs.filter(e => e.estado !== 'NA');
    // For the radar chart: only first-level requisitos (no subrequisitos)
    const reqsRadar = reqsAplicables.filter(e => !e.requisito_padre_id);
    const total = reqsAplicables.length;
    const c = reqsAplicables.filter(e => e.estado === 'Cumple').length;
    const p = reqsAplicables.filter(e => e.estado === 'Parcial').length;
    const pct = total > 0 ? Math.round(((c + p * 0.5) / total) * 100) : 0;
    return { clausula: num, total, cumple: c, parcial: p, porcentaje: pct, requisitos: reqs, requisitosRadar: reqsRadar };
  });

  // --- 3. KPIs de procesos (NC) ---
  async function obtenerMetricasResolucion(workspaceId, clausulaNumero = null) {
    const clauseFilter = clausulaNumero ? 'AND c.numero_clausula = ?' : '';
    const params = [workspaceId, ...(clausulaNumero ? [clausulaNumero] : [])];

    let resolucionResult;
    try {
      resolucionResult = await pool.execute(`
        SELECT ROUND(AVG(GREATEST(0, DATEDIFF(nc.fecha_cierre, ach.fecha_accion))), 0) AS promedio_dias
        FROM AUDITORIA_NC nc
        JOIN EVALUACION_REQUISITO er ON nc.evaluacion_requisito_id = er.id
        LEFT JOIN REQUISITOS_BASE r ON er.requisito_base_id = r.id
        LEFT JOIN CLAUSULAS c ON r.clausula_id = c.id
        LEFT JOIN (
          SELECT auditoria_nc_id, MIN(fecha_accion) AS fecha_accion
          FROM ACCIONES_CORRECTIVAS
          GROUP BY auditoria_nc_id
        ) ach ON ach.auditoria_nc_id = nc.id
        WHERE er.workspace_id = ?
          AND nc.estado_flujo = 'Cerrada'
          AND nc.fecha_cierre IS NOT NULL
          AND ach.fecha_accion IS NOT NULL
          ${clauseFilter}
      `, params);
    } catch (_) {
      resolucionResult = [[{ promedio_dias: null }]];
    }

    const resolucionRows = Array.isArray(resolucionResult?.[0]) && resolucionResult[0].length
      ? resolucionResult[0]
      : [{ promedio_dias: null }];

    const promedioDias = resolucionRows[0]?.promedio_dias != null && !Number.isNaN(Number(resolucionRows[0].promedio_dias))
      ? Math.max(0, Math.round(Number(resolucionRows[0].promedio_dias)))
      : 0;

    let eficienciaResult;
    try {
      eficienciaResult = await pool.execute(`
        SELECT
          COUNT(*) AS total_aceptadas,
          SUM(CASE WHEN nc.estado_flujo = 'Cerrada' THEN 1 ELSE 0 END) AS resueltas
        FROM AUDITORIA_NC nc
        JOIN EVALUACION_REQUISITO er ON nc.evaluacion_requisito_id = er.id
        LEFT JOIN REQUISITOS_BASE r ON er.requisito_base_id = r.id
        LEFT JOIN CLAUSULAS c ON r.clausula_id = c.id
        WHERE er.workspace_id = ?
          AND nc.estado_validacion = 'Acepto'
          ${clauseFilter}
      `, params);
    } catch (_) {
      eficienciaResult = [[{ total_aceptadas: 0, resueltas: 0 }]];
    }

    const eficienciaRows = Array.isArray(eficienciaResult?.[0]) && eficienciaResult[0].length
      ? eficienciaResult[0]
      : [{ total_aceptadas: 0, resueltas: 0 }];

    const totalAceptadas = Number(eficienciaRows[0]?.total_aceptadas || 0);
    const resueltas = Number(eficienciaRows[0]?.resueltas || 0);
    const eficiencia = totalAceptadas > 0
      ? ((resueltas / totalAceptadas) * 100).toFixed(1)
      : '0.0';

    return {
      promedio_resolucion: `${promedioDias} días`,
      eficiencia_proceso: `${eficiencia}%`,
      csat: '0 / 5.0'
    };
  }

  const pendResult = await pool.execute(`
    SELECT COUNT(*) as pendientes
    FROM AUDITORIA_NC nc
    JOIN EVALUACION_REQUISITO er ON nc.evaluacion_requisito_id = er.id
    WHERE er.workspace_id = ? AND (nc.estado_flujo IS NULL OR nc.estado_flujo <> 'Cerrada')
  `, [workspaceId]);
  const pendRows = Array.isArray(pendResult?.[0]) && pendResult[0].length ? pendResult[0] : [{ pendientes: 0 }];

  const tareasPendientes = Number(pendRows[0]?.pendientes || 0);
  const proximaAuditoria = '—';
  const csat = '0 / 5.0';

  const resolucionGlobal = await obtenerMetricasResolucion(workspaceId);
  const kpisGlobales = {
    ...resolucionGlobal,
    csat
  };
  const kpisClausulas = {};
  await Promise.all(clausulasInteres.map(async (n) => {
    kpisClausulas[n] = await obtenerMetricasResolucion(workspaceId, n);
  }));

  return {
    metricas: {
      cumplimiento_general: {
        porcentaje: porcentajeCumplimiento,
        cumple,
        total: totalReqs,
        excluidos_na: totalNA
      },
      brechas: {
        cantidad: noCumple,
        descripcion: 'requisitos por atender'
      },
      proxima_auditoria: proximaAuditoria,
      tareas_pendientes: tareasPendientes
    },
    kpis_globales: kpisGlobales,
    grafico_global: {
      labels: porClausula.map(c => `Cláusula ${c.clausula}`),
      actual: porClausula.map(c => c.porcentaje),
      meta: porClausula.map(() => 100)
    },
    clausulas: porClausula.map(c => ({
      numero: c.clausula,
      porcentaje: c.porcentaje,
      requisitos: c.requisitos.map(r => ({
        codigo: r.codigo,
        descripcion: r.descripcion,
        estado: r.estado,
        porcentaje: r.estado === 'Cumple' ? 100 : r.estado === 'Parcial' ? 50 : 0
      })),
      requisitosRadar: c.requisitosRadar.map(r => ({
        codigo: r.codigo,
        descripcion: r.descripcion,
        estado: r.estado,
        porcentaje: r.estado === 'Cumple' ? 100 : r.estado === 'Parcial' ? 50 : 0
      }))
    })),
    kpis_por_clausula: kpisClausulas
  };
}

// ------------------------------------------------------------------
// CONTROLADORES DASHBOARD
// ------------------------------------------------------------------

// Dashboard para administradores
async function getAdminDashboard(req, res) {
  try {
    const authUser = await getAuthUser(req, res);
    if (!authUser) return;
    
    // Opcional: Validar que sea admin, si no lo es, lanzar 403.
    // if (authUser.rol_nombre !== 'admin') return res.status(403).json({ error: 'forbidden' })

    const filters = buildFilters(req, 'nc');

    const [totalRows] = await pool.execute(`
      SELECT COUNT(DISTINCT nc.id) as total_nc 
      FROM AUDITORIA_NC nc
      LEFT JOIN EVALUACION_REQUISITO er ON nc.evaluacion_requisito_id = er.id
      LEFT JOIN REQUISITOS_BASE r ON er.requisito_base_id = r.id
      LEFT JOIN CLAUSULAS c ON r.clausula_id = c.id
      WHERE 1=1 ${filters.sql}
    `, filters.params);

    const [wsRows] = await pool.execute('SELECT COUNT(id) as total_empresas FROM ESPACIO_TRABAJO');

    const [empresasRows] = await pool.execute(`
      SELECT 
        et.id,
        et.nombre_cliente as empresa,
        COUNT(DISTINCT nc.id) as total_nc,
        SUM(CASE WHEN nc.estado_flujo = 'Cerrada' THEN 1 ELSE 0 END) as nc_cerradas
      FROM ESPACIO_TRABAJO et
      LEFT JOIN EVALUACION_REQUISITO er ON er.workspace_id = et.id
      LEFT JOIN AUDITORIA_NC nc ON nc.evaluacion_requisito_id = er.id
      GROUP BY et.id
    `);

    let globalTotal = 0;
    let globalCerradas = 0;

    const tablaEmpresas = empresasRows.map(emp => {
      globalTotal += emp.total_nc;
      globalCerradas += emp.nc_cerradas;
      const p = emp.total_nc > 0 ? Math.round((emp.nc_cerradas / emp.total_nc) * 100) : 0;
      let estado = 'Fase Documental';
      
      // Este criterio podria ser cambiado en el futuro para reflejar mejor
      // el estado de la empresa según el porcentaje de NC cerradas.
      if (p > 80) estado = 'Fase de Auditoría';
      else if (p > 30) estado = 'Plan de Acción';
      
      return {
        empresa: emp.empresa,
        estado: estado,
        avance: `${p}%`
      };
    });

    const avanceGlobal = globalTotal > 0 ? ((globalCerradas / globalTotal) * 100).toFixed(1) : 0;

    res.json({
      metricas: {
        total_nc: totalRows[0].total_nc,
        empresas_activas: wsRows[0].total_empresas,
        avance_global: `${avanceGlobal}%`
      },
      empresas: tablaEmpresas
    });
  } catch (e) { 
    console.error('getAdminDashboard error', e); 
    res.status(500).json({ error: 'internal' }); 
  }
}

// Dashboard para evaluadores
async function getEvaluatorDashboard(req, res) {
  try {
    const authUser = await getAuthUser(req, res);
    if (!authUser) return;

    const filters = buildFilters(req, 'nc');
    const wsParams = [authUser.workspace_id, ...filters.params];

    const [porVerificar] = await pool.execute(`
      SELECT 
        CONCAT('NC-', YEAR(nc.fecha_ultima_edicion), '-', LPAD(nc.id, 3, '0')) as id_visual,
        CONCAT('Cláusula ', c.numero_clausula) as clausula,
        r.descripcion_normativa as descripcion,
        IFNULL(u.nombre, 'Sin asignar') as responsable,
        nc.estado_flujo as estado
      FROM AUDITORIA_NC nc
      JOIN EVALUACION_REQUISITO er ON nc.evaluacion_requisito_id = er.id
      JOIN REQUISITOS_BASE r ON er.requisito_base_id = r.id
      JOIN CLAUSULAS c ON r.clausula_id = c.id
      LEFT JOIN AUDITORIA_NC_RESPONSABLES ncr ON ncr.auditoria_nc_id = nc.id
      LEFT JOIN USUARIOS u ON ncr.usuario_id = u.id
      WHERE er.workspace_id = ? AND nc.estado_flujo = 'Verificación' ${filters.sql}
    `, wsParams);

    const [pendientesEvidencia] = await pool.execute(`
      SELECT ev.id, ev.nombre_archivo, ev.fecha_carga
      FROM EVIDENCIAS ev
      JOIN EVALUACION_REQUISITO er ON ev.evaluacion_requisito_id = er.id
      WHERE er.workspace_id = ? AND ev.estado_validacion_archivo = 'Pendiente'
    `, [authUser.workspace_id]);

    const compliance = await buildComplianceDashboard(authUser.workspace_id);

    res.json({
      kpis: compliance.kpis_globales,
      metricas: compliance.metricas,
      kpis_globales: compliance.kpis_globales,
      grafico_global: compliance.grafico_global,
      clausulas: compliance.clausulas,
      kpis_por_clausula: compliance.kpis_por_clausula,
      por_verificar: porVerificar,
      pendientes_revision: pendientesEvidencia
    });
  } catch (e) { 
    console.error('getEvaluatorDashboard error', e); 
    res.status(500).json({ error: 'internal' }); 
  }
}

// Dashboard para responsables SGC
async function getResponsibleDashboard(req, res) {
  try {
    const authUser = await getAuthUser(req, res);
    if (!authUser) return;

    const compliance = await buildComplianceDashboard(authUser.workspace_id);

    res.json({
      metricas: compliance.metricas,
      kpis_globales: compliance.kpis_globales,
      grafico_global: compliance.grafico_global,
      clausulas: compliance.clausulas,
      kpis_por_clausula: compliance.kpis_por_clausula
    });
  } catch (e) { 
    console.error('getResponsibleDashboard error', e); 
    res.status(500).json({ error: 'internal' }); 
  }
}

// Dashboard operativo
async function getOperativeDashboard(req, res) {
  try {
    const authUser = await getAuthUser(req, res);
    if (!authUser) return;

    const filters = buildFilters(req, 'nc');
    const wsParams = [authUser.workspace_id, ...filters.params];

    const conteoResult = await pool.execute(`
      SELECT 
        COUNT(DISTINCT nc.id) as identificadas,
        SUM(CASE WHEN nc.estado_flujo IN ('Análisis', 'Ejecución') THEN 1 ELSE 0 END) as en_progreso
      FROM AUDITORIA_NC nc
      JOIN EVALUACION_REQUISITO er ON nc.evaluacion_requisito_id = er.id
      JOIN REQUISITOS_BASE r ON er.requisito_base_id = r.id
      JOIN CLAUSULAS c ON r.clausula_id = c.id
      WHERE er.workspace_id = ? ${filters.sql}
    `, wsParams);
    const conteoRows = Array.isArray(conteoResult?.[0]) && conteoResult[0].length ? conteoResult[0] : [{ identificadas: 0, en_progreso: 0 }];

    const operativoResult = await pool.execute(`
      SELECT 
        CONCAT('NC-', YEAR(nc.fecha_ultima_edicion), '-', LPAD(nc.id, 3, '0')) as id_visual,
        CONCAT('Cláusula ', c.numero_clausula) as origen,
        nc.estado_flujo as estado,
        IFNULL(u.nombre, 'Sin asignar') as responsable
      FROM AUDITORIA_NC nc
      JOIN EVALUACION_REQUISITO er ON nc.evaluacion_requisito_id = er.id
      JOIN REQUISITOS_BASE r ON er.requisito_base_id = r.id
      JOIN CLAUSULAS c ON r.clausula_id = c.id
      LEFT JOIN AUDITORIA_NC_RESPONSABLES ncr ON ncr.auditoria_nc_id = nc.id
      LEFT JOIN USUARIOS u ON ncr.usuario_id = u.id
      WHERE er.workspace_id = ? 
      ORDER BY nc.estado_flujo ASC, nc.fecha_ultima_edicion DESC
    `, [authUser.workspace_id]);
    const operativoRows = Array.isArray(operativoResult?.[0]) && operativoResult[0].length ? operativoResult[0] : [];

    const mapProgreso = { 
      'Abierta': '10%', 
      'Análisis': '30%', 
      'Ejecución': '60%', 
      'Verificación': '90%', 
      'Cerrada': '100%' 
    };

    const tablaOperativa = operativoRows.map(row => ({
      id_visual: row.id_visual,
      origen: row.origen,
      estado: row.estado || 'Abierta',
      responsable: row.responsable,
      progreso: mapProgreso[row.estado || 'Abierta']
    }));

    res.json({
      metricas: {
        nc_identificadas: conteoRows[0].identificadas || 0,
        en_progreso: conteoRows[0].en_progreso || 0
      },
      tabla_operativa: tablaOperativa
    });
  } catch (e) { 
    console.error('getOperativeDashboard error', e); 
    res.status(500).json({ error: 'internal' }); 
  }
}

module.exports = { 
  getAdminDashboard, 
  getEvaluatorDashboard, 
  getResponsibleDashboard, 
  getOperativeDashboard 
};