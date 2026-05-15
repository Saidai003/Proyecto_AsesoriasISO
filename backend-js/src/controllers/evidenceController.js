// This controller returns placeholder evidence data for frontend development.
// Intentionally does NOT query the database — returns fake records.

async function listByRequisito(req, res){
  const requisitoId = Number(req.params.id) || 0;
  // Create some placeholder evidence items. These are fake and meant
  // for UI development only.
  const now = new Date();
  const placeholders = [
    {
      id: 1001,
      evaluacion_requisito_id: requisitoId || 1,
      usuario_carga_id: 5,
      ev_id: 1,
      nombre_archivo: 'evidencia_01.pdf',
      url_archivo: '',
      tipo_formato: 'pdf',
      estado_validacion_archivo: 'Pendiente',
      comentario_evidencia: 'Evidencia cargada manualmente (placeholder).',
      fecha_carga: now.toISOString().slice(0,10)
    },
    {
      id: 1002,
      evaluacion_requisito_id: requisitoId || 1,
      usuario_carga_id: 8,
      ev_id: 1,
      nombre_archivo: 'foto_entrada.jpg',
      url_archivo: '',
      tipo_formato: 'jpg',
      estado_validacion_archivo: 'Aceptado',
      comentario_evidencia: 'Placeholder: imagen de la entrada.',
      fecha_carga: now.toISOString().slice(0,10)
    },
    {
      id: 1003,
      evaluacion_requisito_id: requisitoId || 1,
      usuario_carga_id: 9,
      ev_id: 1,
      nombre_archivo: 'informe_v1.docx',
      url_archivo: '',
      tipo_formato: 'docx',
      estado_validacion_archivo: 'Rechazado',
      comentario_evidencia: 'Placeholder: informe con observaciones.',
      fecha_carga: now.toISOString().slice(0,10)
    }
  ];

  return res.json({ evidencias: placeholders });
}

module.exports = { listByRequisito };
