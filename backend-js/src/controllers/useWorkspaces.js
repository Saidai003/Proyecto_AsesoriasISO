const { pool } = require('../db');

async function createWorkspace(req, res){
    try{
        const { nombre_cliente } = req.body;
        if(!nombre_cliente) return res.status(400).json({ error: 'nombre_cliente required' });
        const [result] = await pool.execute(
            'INSERT INTO ESPACIO_TRABAJO (nombre_cliente, fecha_creacion) VALUES (?, NOW())',
            [nombre_cliente]
        );
        // 201 is the standard status code for "created"
        // and it's a good practice to return the id of the 
        // newly created resource in the response body
        return res.status(201).json({ id: result.insertId });
    }catch(err){
        console.error('createWorkspace error', err);
        // 500 is the standard status code for "internal server error"
        return res.status(500).json({ error: 'internal_error' });
    }
}

async function updateWorkspace(req, res){
    try{
        const id = req.params.id;
        const { nombre_cliente } = req.body;
        if(!id) return res.status(400).json({ error: 'id required' });
        // build update dynamically but keep it simple
        await pool.execute(
            'UPDATE ESPACIO_TRABAJO SET nombre_cliente = ? WHERE id = ?',
            [nombre_cliente, id]
        );
        return res.json({ ok: true });
    }catch(err){
        console.error('updateWorkspace error', err);
        return res.status(500).json({ error: 'internal_error' });
    }
}

async function deleteWorkspace(req, res){
    try{
        const id = req.params.id;
        if(!id) return res.status(400).json({ error: 'id required' });
        await pool.execute('DELETE FROM ESPACIO_TRABAJO WHERE id = ?', [id]);
        return res.json({ id });
    }catch(err){
        console.error('deleteWorkspace error', err);
        return res.status(500).json({ error: 'internal_error' });
    }
}

async function getWorkspace(req, res){
    try{
        const id = req.params.id;
        const [rows] = await pool.execute('SELECT id, nombre_cliente, fecha_creacion FROM ESPACIO_TRABAJO WHERE id = ?', [id]);
        if(!rows.length) return res.status(404).json({ error: 'not_found' });
        return res.json(rows[0]);
    }catch(err){
        console.error('getWorkspace error', err);
        return res.status(500).json({ error: 'internal_error' });
    }
}

async function listWorkspaces(req, res){
    try{
        const [rows] = await pool.execute('SELECT id, nombre_cliente, fecha_creacion FROM ESPACIO_TRABAJO');
        return res.json(rows);
    }catch(err){
        console.error('listWorkspaces error', err);
        return res.status(500).json({ error: 'internal_error' });
    }
}

module.exports = { createWorkspace, listWorkspaces, getWorkspace, updateWorkspace, deleteWorkspace };