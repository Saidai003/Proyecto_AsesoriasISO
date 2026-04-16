require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT || 3001

app.use(express.json())

app.get('/api/ping', (req, res) => {
  res.json({ pong: true, env: process.env.NODE_ENV || 'development' })
})

app.listen(port, () => console.log(`backend-js running on ${port}`))
