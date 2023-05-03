/** @format */

const { Router } = require("express");

const mysql = require("mysql");
const router = new Router();

const pool = mysql.createPool({
  connectionLimit: 50,
  host: "ns130.hostgator.mx",
  user: "expoinge_developer",
  password: "v42rachLdo0i",
  database: "expoinge_expo2023",
});

router.get("/", function (req, res) {
  res.send("hello world");
});

router.get("/categorias", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;
    console.log(`connected as id ${connection.threadId}`);
    connection.query("SELECT * from Categorias", (err, rows) => {
      connection.release();
      if (!err) {
        res.send(rows);
      } else {
        console.log(err);
      }
    });
  });
});

//Obtener las preguntas de cada categoria a desplegar
router.get("/pregunta-categoria/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;
    console.log(`connected as id ${connection.threadId}`);
    connection.query(
      "select r.pregunta, r.idRubrica from Rubrica r, Pregunta_Categoria p where p.categoria=? and p.rubrica=r.idRubrica",
      [req.params.id],
      (err, rows) => {
        connection.release();
        if (!err) {
          res.send(rows);
        } else {
          console.log(err);
        }
      }
    );
  });
});

//obtener Proyecto
router.get("/proyecto/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;
    console.log(`connected as id ${connection.threadId}`);
    connection.query(
      "select * from Proyecto where id=?",
      [req.params.id],
      (err, rows) => {
        connection.release();
        if (!err) {
          res.send(rows);
        } else {
          console.log(err);
        }
      }
    );
  });
});

//obtener calificacion y pregunta de cada proyecto
router.get("/calificar/proyecto", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) throw err;
    console.log(`connected as id ${connection.threadId}`);
    const { id, categoria, juez } = req.body;
    connection.query(
      "SELECT Pregunta_Categoria.pregunta, Pregunta.pregunta, COALESCE(Calificacion.calificacion, 0) AS calificacion, Juez.idJuez, Pregunta.idPregunta FROM Pregunta_Categoria INNER JOIN Categorias ON Pregunta_Categoria.categoria = Categorias.idCategorias INNER JOIN Pregunta ON Pregunta_Categoria.pregunta = Pregunta.idPregunta LEFT JOIN Calificacion ON Pregunta_Categoria.pregunta = Calificacion.pregunta LEFT JOIN Juez ON Calificacion.juez = Juez.idJuez LEFT JOIN Proyecto ON Calificacion.proyecto = Proyecto.idProyecto WHERE Categorias.idCategorias = ? AND (Juez.idJuez = ? OR Calificacion.juez IS NULL) AND (Proyecto.idProyecto = ? OR Calificacion.proyecto IS NULL);",
      [categoria, juez, id],
      (err, rows) => {
        if (!err) {
          res.send(rows);
        } else {
          console.log(err);
        }
      }
    );
  });
});

module.exports = router;
