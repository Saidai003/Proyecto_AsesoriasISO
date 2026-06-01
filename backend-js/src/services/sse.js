// Simple in-memory SSE broadcaster
const clients = new Set()

function initClient(res, user){
  // store minimal client info
  const client = { id: Date.now() + Math.random(), res, user }
  clients.add(client)
  // remove on close
  reqOnClose(res, client)
  return client
}

function reqOnClose(res, client){
  res.on('close', ()=>{
    try{ clients.delete(client) }catch(_){}
  })
}

function sendEvent(name, data){
  const payload = `event: ${name}\n` + `data: ${JSON.stringify(data)}\n\n`
  for(const c of Array.from(clients)){
    try{ c.res.write(payload) }catch(e){ try{ clients.delete(c) }catch(_){} }
  }
}

function addClient(req, res, user){
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write('\n')
  return initClient(res, user)
}

module.exports = { addClient, sendEvent };
