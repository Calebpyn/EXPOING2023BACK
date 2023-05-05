/** @format */

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");

const routes = require("./routes/expoing.routes");

const app = express();

const port = 4000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());
app.use(morgan("dev"));

app.use(routes);

app.use(express.json());
app.set("view engine", "pug");

app.listen(port, () => console.log(`Listening in port ${port}...`));
