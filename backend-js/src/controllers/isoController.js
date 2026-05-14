const { pool } = require('../db');

async function listISOs(req, res){
  try{
    const [rows] = await pool.execute('SELECT id, nombre, descripcion FROM ISOS');
    return res.json(rows);
  }catch(err){
    console.error('listISOs error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function getClausesByISO(req, res){
  try{
    const isoId = req.params.id;
    const [rows] = await pool.execute('SELECT id, numero_clausula, titulo FROM CLAUSULAS WHERE iso_id = ? ORDER BY numero_clausula', [isoId]);
    return res.json(rows);
  }catch(err){
    console.error('getClausesByISO error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function getRequisitosByClausula(req, res){
  try{
    const clausulaId = req.params.id;
    const [rows] = await pool.execute('SELECT id, requisito_padre_id, descripcion_normativa FROM REQUISITOS_BASE WHERE clausula_id = ? ORDER BY id', [clausulaId]);
    return res.json(rows);
  }catch(err){
    console.error('getRequisitosByClausula error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

// Optional: return clauses with nested requisitos
async function getISOTree(req, res){
  try{
    const isoId = req.params.id;

    // 1) Load ISO metadata (id, nombre, descripcion)
    const [isosRows] = await pool.execute('SELECT id, nombre, descripcion FROM ISOS WHERE id = ?', [isoId]);
    const iso = isosRows[0] || null;

    // 2) Load all clauses that belong to this ISO
    const [clauses] = await pool.execute('SELECT id, numero_clausula, titulo FROM CLAUSULAS WHERE iso_id = ? ORDER BY numero_clausula', [isoId]);

    // 3) For each clause, build its requisitos tree using the helper
    for(const c of clauses){
      const { map, roots } = await buildClauseTree(c.id);
      // attach both the nested roots and the map for O(1) lookups
      c.requisitos = roots;     // nested array usable for rendering
      c.requisitosMap = map;    // keyed map for fast lookup by id
    }

    // 4) Return a single object that contains ISO metadata and the full clauses tree
    return res.json({ iso, clauses });
  }catch(err){
    console.error('getISOTree error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

// Parse a descripcion_normativa into {number, name, full}
/**
 * Parse a `descripcion_normativa` string into its numeric prefix and the
 * remaining text. Example: "4.1 Comprensión de la organización" ->
 * { number: '4.1', name: 'Comprensión de la organización', full: original }
 *
 * This helper makes it easier for the UI to show a compact title (number + name).
 */
function parseDesc(text){
  if(!text) return { number: null, name: null, full: text };
  const m = text.trim().match(/^([0-9]+(?:\.[0-9]+)*)\s+(.+)$/);
  if(m) return { number: m[1], name: m[2], full: text };
  return { number: null, name: null, full: text };
}

// Build a map and roots array from requisitos list. Mutates items to add children, number, name.
/**
 * Convert a flat array of requisitos into a tree structure.
 *
 * Input: [{id, requisito_padre_id, descripcion_normativa}, ...]
 * Output: { map, roots }
 *  - `map` is an object keyed by requisito id for O(1) lookup
 *  - `roots` is an array of top-level requisitos (those without a parent)
 *
 * The function mutates the original requisito objects by adding:
 *  - `children`: array of child requisitos
 *  - `number` and `name`: parsed values from `descripcion_normativa`
 */
function buildRequisitosMap(requisitos){
  const map = {};

  // First pass: normalize items, parse descriptions and put into map
  requisitos.forEach(r => {
    r.children = []; // prepare children array
    const p = parseDesc(r.descripcion_normativa);
    r.number = p.number; // e.g. '4.1'
    r.name = p.name;     // e.g. 'Comprensión de la organización'
    r.descripcion_normativa = p.full;
    map[r.id] = r;
  });

  // Second pass: link children to their parents, collect roots
  const roots = [];
  requisitos.forEach(r => {
    if(r.requisito_padre_id && map[r.requisito_padre_id]){
      // attach to found parent
      map[r.requisito_padre_id].children.push(r);
    }else{
      // no parent found => top-level node for this clause
      roots.push(r);
    }
  });

  return { map, roots };
}

// Helper: fetch requisitos for a clause and build its tree (map + roots)
async function buildClauseTree(clauseId){
  // Read flat requisitos from DB for the clause
  const [requisitos] = await pool.execute(
    'SELECT id, requisito_padre_id, descripcion_normativa FROM REQUISITOS_BASE WHERE clausula_id = ? ORDER BY id',
    [clauseId]
  );
  // Transform into tree structure
  const { map, roots } = buildRequisitosMap(requisitos);
  return { map, roots };
}

async function getRequisitoById(req, res){
  try{
    const id = req.params.id;
    console.log('getRequisitoById called with id=', id);
    const [rows] = await pool.execute('SELECT id, clausula_id, requisito_padre_id, descripcion_normativa FROM REQUISITOS_BASE WHERE id = ?', [id]);
    const node = rows[0];
    if(!node) return res.status(404).json({ error: 'not_found' });
    // load clause info
    const [crows] = await pool.execute('SELECT id, numero_clausula, titulo FROM CLAUSULAS WHERE id = ?', [node.clausula_id]);
    const clause = crows[0] || null;
    // load all requisitos for the clausula to build subtree
    const [all] = await pool.execute('SELECT id, requisito_padre_id, descripcion_normativa FROM REQUISITOS_BASE WHERE clausula_id = ?', [node.clausula_id]);
    const { map, roots } = buildRequisitosMap(all);
    // find the subtree rooted at node.id
    console.log('map keys sample:', Object.keys(map).slice(0,10), 'node.id=', node.id)
    const subtree = map[node.id] || { id: node.id, descripcion_normativa: node.descripcion_normativa, children: [] };
    console.log('subtree keys:', Object.keys(subtree))
    return res.json({ requisito: subtree, clause });
  }catch(err){
    console.error('getRequisitoById error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { listISOs, getISOTree };
