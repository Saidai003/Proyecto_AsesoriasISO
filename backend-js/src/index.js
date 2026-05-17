require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const {pool, testConnection} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const cookieParser = require('cookie-parser')
const { signAccessToken, createRefreshSession, revokeRefreshSession, getSession, requireAuth, requireRole } = require('./auth');
app.use(cookieParser());

// Middleware
app.use(express.json());

// Simple CORS middleware for local development (moved to middleware file)
const devCors = require('./middleware/cors');
app.use(devCors);

// Test database connection
testConnection().then(() => console.log('DB connection OK')).catch(err => console.error('DB connection failed', err));

// Mount feature routers (routes are implemented in src/routes/*)
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const operationalRouter = require('./routes/operational');
const evaluatorRouter = require('./routes/evaluator');
const seedRouter = require('./routes/seed');
const workspacesRouter = require('./routes/workspaces');
const isoRouter = require('./routes/iso');
const evidencesRouter = require('./routes/evidences');
const ncRouter = require('./routes/nc');
const evaluacionesRouter = require('./routes/evaluaciones');

app.use('/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/operational', operationalRouter);
app.use('/api/evaluator', evaluatorRouter);
app.use('/seed', seedRouter); // development-only seed endpoint
app.use('/api/workspaces', workspacesRouter);
app.use('/api/isos', isoRouter);
app.use('/api/evidencias', evidencesRouter);
app.use('/api/nc', ncRouter);
app.use('/api/evaluaciones', evaluacionesRouter);

// why do we use /api if there is no folder called API?
// The /api prefix is a common convention to indicate that these routes 
// are part of the application's API.

// We have to set a path so that the server can differentiate between
// a request for the API and a request for a static file 
// or a different route.

// An example code fragment that could call by a path like /api/evaluaciones
// could be fetch('/api/evaluaciones/requisito/123') from the frontend,
// which would trigger the getOrCreateEvaluacion function in evaluationsController.js
// for requisito id 123.

app.get('/', (req, res) => {
    res.send('Hello, World!');
})

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// Basic graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    process.exit();
});

module.exports = app;