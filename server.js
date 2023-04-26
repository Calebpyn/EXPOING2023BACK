const express = require('express')
const morgan = require('morgan')
const cors = require('cors')

const routes = require('./routes/expoing.routes')

const app = express()

const port = 4000

app.use(cors())
app.use(morgan('dev'))

app.use(routes)

app.use(express.json())


app.listen(port, () => console.log(`Listening in port ${port}...`))