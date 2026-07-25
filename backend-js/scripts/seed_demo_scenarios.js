/** Crea dos workspaces sintéticos aislados y ejecuta sus seeds reproducibles. */
require('dotenv').config();
const path = require('path');
const { spawnSync } = require('child_process');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

const args = new Set(process.argv.slice(2));
if (args.has('--help')) {
  console.log('Uso: node scripts/seed_demo_scenarios.js [--dry-run]');
  process.exit(0);
}
const DRY_RUN = args.has('--dry-run');

const PASSWORD = 'MiClave.ProyectoISO2026';
const SCENARIOS = [
  { key: '50', workspaceName: 'Demo Defensa — 50% Cumplimiento', evaluator: { name: 'Evaluador Demo 50%', email: 'evaluador.demo50@demo.local' }, responsible: { name: 'Responsable Demo 50%', email: 'responsable.demo50@demo.local' }, script: 'seed_50_cumplimiento.js' },
  { key: '100', workspaceName: 'Demo Defensa — 100% Cumplimiento', evaluator: { name: 'Evaluador Demo 100%', email: 'evaluador.demo100@demo.local' }, responsible: { name: 'Responsable Demo 100%', email: 'responsable.demo100@demo.local' }, script: 'seed_100_cumplimiento.js' },
];

async function ensureWorkspace(conn, name) {
  const [existing] = await conn.execute('SELECT id FROM ESPACIO_TRABAJO WHERE nombre_cliente = ? LIMIT 1', [name]);
  if (existing.length) return existing[0].id;
  const [created] = await conn.execute('INSERT INTO ESPACIO_TRABAJO (nombre_cliente) VALUES (?)', [name]);
  return created.insertId;
}

async function ensureUser(conn, { workspaceId, roleId, name, email, passwordHash }) {
  await conn.execute(
    `INSERT INTO USUARIOS (workspace_id, role_id, nombre, email, password_hash, estado_invitacion)
     VALUES (?, ?, ?, ?, ?, 'Aceptada')
     ON DUPLICATE KEY UPDATE workspace_id = VALUES(workspace_id), role_id = VALUES(role_id),
       nombre = VALUES(nombre), password_hash = VALUES(password_hash), estado_invitacion = VALUES(estado_invitacion)`,
    [workspaceId, roleId, name, email, passwordHash]
  );
}

async function prepareScenarios() {
  const conn = await pool.getConnection();
  try {
    const [roles] = await conn.execute("SELECT id, nombre FROM ROLES WHERE nombre IN ('Evaluador', 'Responsable SGC')");
    const roleId = Object.fromEntries(roles.map((role) => [role.nombre, role.id]));
    if (!roleId.Evaluador || !roleId['Responsable SGC']) throw new Error('Faltan roles Evaluador o Responsable SGC');
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const scenario of SCENARIOS) {
      scenario.workspaceId = await ensureWorkspace(conn, scenario.workspaceName);
      await ensureUser(conn, { workspaceId: scenario.workspaceId, roleId: roleId.Evaluador, ...scenario.evaluator, passwordHash });
      await ensureUser(conn, { workspaceId: scenario.workspaceId, roleId: roleId['Responsable SGC'], ...scenario.responsible, passwordHash });
    }
  } finally {
    conn.release();
    await pool.end();
  }
}

async function run() {
  if (DRY_RUN) {
    console.log(`[demo] Vista previa: se crearían ${SCENARIOS.length} workspaces sintéticos.`);
    for (const scenario of SCENARIOS) console.log(` - ${scenario.workspaceName}`);
    return;
  }
  await prepareScenarios();
  for (const scenario of SCENARIOS) {
    console.log(`\n[demo] Poblando ${scenario.workspaceName}...`);
    const result = spawnSync(process.execPath, [path.join(__dirname, scenario.script)], {
      stdio: 'inherit',
      env: { ...process.env, DEMO_WORKSPACE_ID: String(scenario.workspaceId), DEMO_EVALUADOR_EMAIL: scenario.evaluator.email, DEMO_RESPONSABLE_EMAIL: scenario.responsible.email },
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
  console.log('\n[demo] Escenarios listos. Contraseña de las cuentas sintéticas: MiClave.ProyectoISO2026');
}
run().catch((error) => { console.error('[demo] Error:', error.message); process.exit(1); });
