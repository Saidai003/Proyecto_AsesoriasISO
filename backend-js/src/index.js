require('dotenv').config();
const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const { pool, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '2000mb' }));
const devCors = require('./middleware/cors');
app.use(devCors);
app.use(cookieParser());

// Mount feature routers
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const seedRouter = require('./routes/seed');
const workspacesRouter = require('./routes/workspaces');
const isoRouter = require('./routes/iso');
const evidencesRouter = require('./routes/evidences');
const ncRouter = require('./routes/nc');
const notificationsRouter = require('./routes/notifications');
const evaluacionesRouter = require('./routes/evaluaciones');
const driveRouter = require('./routes/drive');
const accionesRouter = require('./routes/acciones');
const chatRouter = require('./routes/chat');
const dashboardsRouter = require('./routes/dashboards');

app.use('/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/seed', seedRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/isos', isoRouter);
app.use('/api/evidencias', evidencesRouter);
app.use('/google-drive', driveRouter);

const path = require('path');
const { requireAuth } = require('./middleware/auth');
const uploadsPath = path.join(__dirname, '..', 'uploads');
// Static files must not be anonymously retrievable. Resource/workspace-level
// authorization remains the responsibility of the evidence download endpoint.
app.use('/uploads', requireAuth, express.static(uploadsPath));

app.use('/api/nc', ncRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/evaluaciones', evaluacionesRouter);
app.use('/api/acciones', accionesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/dashboards', dashboardsRouter);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

/**
 * Startup sequence: wait for DB, ensure seeds, start server
 */
async function startup() {
  try {
    // 1. Wait for database to be available
    console.log('[startup] Waiting for database...');
    let retries = 0;
    const maxRetries = 60;
    let dbConnected = false;

    while (!dbConnected && retries < maxRetries) {
      try {
        await testConnection();
        console.log('[startup] Database is available.');
        console.log('DB connection OK');
        dbConnected = true;
      } catch (err) {
        retries++;
        if (retries >= maxRetries) {
          console.error('[startup] Timeout waiting for database.');
          process.exit(1);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // 2. Ensure seeds are applied
    console.log('[startup] Checking seeds...');
    try {
      require('../scripts/ensureSeed.js');
      console.log('[startup] Seeds ensured.');
    } catch (err) {
      console.error('[startup] Error checking seeds:', err);
      throw err;
    }

    // 3. Start notification worker
    startNotificationWorker();

    // 4. Start the HTTP server
    const server = http.createServer(app);
    const { init: initWs } = require('./services/ws');
    initWs(server);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      server.close();
      process.exit();
    });
  } catch (err) {
    console.error('[startup] Fatal error:', err);
    process.exit(1);
  }
}

/**
 * Periodic worker to process scheduled notifications
 */
function startNotificationWorker() {
  setInterval(async () => {
    try {
      const [rows] = await pool.execute(
        'SELECT id, nc_id, usuario_id FROM SCHEDULED_NOTIFICATIONS WHERE sent_flag = 0 AND trigger_at <= NOW() LIMIT 100'
      );
      if (!rows || rows.length === 0) return;

      for (const r of rows) {
        try {
          const msg = `Recordatorio: Verificación pendiente para NC #${r.nc_id}`;
          const link = `/nc/${r.nc_id}`;
          await pool.execute(
            'INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link, created_at) VALUES (?, ?, ?, ?, NOW())',
            [r.usuario_id, 'Verificación NC', msg, link]
          );
          await pool.execute('UPDATE SCHEDULED_NOTIFICATIONS SET sent_flag = 1 WHERE id = ?', [r.id]);
        } catch (e) {
          console.error('Error processing scheduled notif for id', r.id, e);
        }
      }
    } catch (e) {
      console.error('Scheduled notification worker error:', e);
    }
  }, 30 * 1000);
}

// Start the application
startup();

module.exports = app;
