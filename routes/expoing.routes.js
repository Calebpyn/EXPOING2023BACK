/** @format */

const { Router } = require("express");

const mysql = require("mysql");
const router = new Router();
require("dotenv").config();

const pool = mysql.createPool({
  connectionLimit: 50,
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  multipleStatements: true,
});

//obtener las calificaciones de un proyecto
router.get("/calificaciones/:proyecto", (req, res) => {
  const correo = req.body.correo;
  const proyecto = req.params.proyecto;
  pool.getConnection((err, connection) => {
    if (err) {
      console.log(`error connecting to database: ${err}`);
      res.status(500).send("Error connecting to database");
      return;
    }
    connection.query(
      "CALL sp_get_user_id(?, @res); SELECT @res;",
      [correo],
      (err, rows) => {
        if (err) {
          connection.release();
          console.log(`error executing query: ${err}`);
          res.status(500).send("Error executing query");
          return;
        }
        const userId = rows[1][0]["@res"]; // obtener el valor de @res
        connection.query(
          "SELECT calificacion, bloqueado FROM Calificaciones WHERE juez = ? AND proyecto = ?",
          [userId, proyecto],
          (err, rows) => {
            connection.release();
            if (err) {
              console.log(`error executing query: ${err}`);
              res.status(500).send("Error executing query");
              return;
            }
            res.send(rows);
          }
        );
      }
    );
  });
});

//obtener las preguntas de una categoria
router.get("/pregunta/:categoria", (req, res) => {
  const categoria = req.params.categoria;
  pool.getConnection((err, connection) => {
    if (err) {
      console.log(`error connecting to database: ${err}`);
      res.status(500).send("Error connecting to database");
      return;
    }
    connection.query(
      "select p.idPregunta, p.pregunta from Pregunta_Categoria pc, Pregunta p where pc.categoria=? and pc.pregunta=p.idPregunta",
      [categoria],
      (err, rows) => {
        connection.release();
        if (err) {
          console.log(`error executing query: ${err}`);
          res.status(500).send("Error executing query");
          return;
        }
        res.send(rows);
      }
    );
  });
});

//Calificar una pregunta de un proyecto
router.post(
  "/calificar/:proyecto/:pregunta/:calificacion",
  (req, res) => {
    const pregunta = req.params.pregunta;
    const proyecto = req.params.proyecto;
    const calificacion = req.params.calificacion;
    const correo = req.body.correo;

    pool.getConnection((err, connection) => {
      if (err) {
        console.log(`error connecting to database: ${err}`);
        res.status(500).send("Error connecting to database");
        return;
      }
      connection.query(
        "CALL guardar_calificacion(?,?,?,?)",
        [correo, pregunta, proyecto, calificacion],
        (err, rows) => {
          connection.release();
          if (err) {
            console.log(`error executing query: ${err}`);
            res.status(500).send(err);
            return;
          }
          res.send(rows);
        }
      );
    });
  }
);

//para bloquear las calificaciones, se hace un update al atributo bloquear
router.put("/bloquear/:proyecto", (req, res) => {
  const proyecto = req.params.proyecto;
  const correo = req.body.correo;

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(`error connecting to database: ${err}`);
      res.status(500).send("Error connecting to database");
      return;
    }
    connection.query(
      "CALL bloquear_calificaciones(?,?);",
      [correo, proyecto],
      (err, rows) => {
        connection.release();
        if (err) {
          console.log(`error executing query: ${err}`);
          res.status(500).send(err);
          return;
        }
        res.send(rows);
      }
    );
  });
});

//agregar links de proyecto
router.put("/proyecto/:proyecto/links", checkUserProject, (req, res) => {
  const proyecto = req.params.proyecto;
  const linkVideo = req.body.link_video || "";
  const linkZoom = req.body.link_zoom || "";
  const userProject = req.userProject || {}; // proyecto del usuario que está haciendo la búsqueda

  // verifica si el usuario tiene acceso de edición
  const puedeEditar =
    userProject && userProject.idProyecto == parseInt(proyecto, 10);

  pool.getConnection((err, connection) => {
    if (err || puedeEditar === false) {
      if (err) {
        console.log(`error connecting to database: ${err}`);
        res.status(500).send("Error connecting to database");
      } else {
        res.status(500).send("Acceso denegado");
      }
      return;
    }

    connection.query(
      "UPDATE Proyecto SET link_video = ? WHERE idProyecto = ?",
      [linkVideo, proyecto],
      (err, result) => {
        if (err) {
          console.log(`error executing query: ${err}`);
          res.status(500).send(err);
          return;
        }
        if (result.affectedRows === 0) {
          res.status(404).send("Proyecto no encontrado");
          return;
        }
        connection.query(
          "UPDATE Proyecto SET link_zoom = ? WHERE idProyecto = ?",
          [linkZoom, proyecto],
          (err, result) => {
            connection.release();
            if (err) {
              console.log(`error executing query: ${err}`);
              res.status(500).send(err);
              return;
            }
            if (result.affectedRows === 0) {
              res.status(404).send("Proyecto no encontrado");
              return;
            }
            res.status(200).send("Links actualizados exitosamente");
          }
        );
      }
    );
  });
});

//desplegar un proyecto, y en caso de que el usuario sea parte del equipo sera editable
router.get("/proyecto/:proyecto", checkUserProject, (req, res) => {
  const proyecto = req.params.proyecto;
  const userProject = req.userProject || {}; // proyecto del usuario que está haciendo la búsqueda

  // verifica si el usuario tiene acceso de edición
  const puedeEditar =
    userProject && userProject.idProyecto == parseInt(proyecto, 10);

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(`error connecting to database: ${err}`);
      res.status(500).send("Error connecting to database");
      return;
    }

    connection.query(
      "SELECT * FROM Proyecto WHERE idProyecto = ?;",
      [proyecto],
      (err, rows) => {
        connection.release();
        if (err) {
          console.log(`error executing query: ${err}`);
          res.status(500).send(err);
          return;
        }
        const proyecto = rows[0];
        const data = {
          ...proyecto,
          editable: puedeEditar,
        };

        res.send(data); // pasar el valor de puedeEditar a la plantilla
      }
    );
  });
});

//Despliegue de proyectos
router.get("/proyecto", (req, res) => {
  // const proyecto = req.params.proyecto;
  // const userProject = req.userProject || {}; // proyecto del usuario que está haciendo la búsqueda

  // verifica si el usuario tiene acceso de edición
  // const puedeEditar =
  //   userProject && userProject.idProyecto == parseInt(proyecto, 10);

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(`error connecting to database: ${err}`);
      res.status(500).send("Error connecting to database");
      return;
    }

    connection.query("SELECT * FROM Proyecto;", [proyecto], (err, rows) => {
      connection.release();
      if (err) {
        console.log(`error executing query: ${err}`);
        res.status(500).send(err);
        return;
      }
      const proyecto = rows[0];
      const data = {
        ...proyecto,
        editable: puedeEditar,
      };

      res.send(data); // pasar el valor de puedeEditar a la plantilla
    });
  });
});

//despliegue de proyecto por categoria
router.get("/proyectos/:categoria", (req, res) => {
  const categoria = req.params.categoria;

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(`error connecting to database: ${err}`);
      res.status(500).send("Error connecting to database");
      return;
    }

    connection.query(
      "SELECT * FROM Proyecto where categoria = ?;",
      [categoria],
      (err, rows) => {
        connection.release();
        if (err) {
          console.log(`error executing query: ${err}`);
          res.status(500).send(err);
          return;
        }

        res.send(rows); // pasar el valor de puedeEditar a la plantilla
      }
    );
  });
});

function authJuez(req, res, next) {
  var correo = req.body.correo;
  pool.getConnection((err, connection) => {
    if (err) {
      console.log(`error connecting to database: ${err}`);
      res.status(500).send("Error connecting to database");
      return;
    }
    connection.query(
      "CALL check_user_role(?, @result); SELECT @result;",
      [correo],
      (err, rows) => {
        connection.release();
        if (err) {
          console.log(`error executing query: ${err}`);
          res.status(500).send(err);
          return;
        }
        const result = rows[1][0]["@result"];

        if (result == 60) {
          // El usuario es Juez
          next();
        } else {
          res.status(500).send("Usuario no es Juez");
        }
      }
    );
  });
}




function checkUserProject(req, res, next) {
  const idProyecto = req.params.proyecto; // suponiendo que el idProyecto está en la ruta
  const idUsuario = req.body.correo; // suponiendo que el idUsuario del usuario está disponible en req.user

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(`error connecting to database: ${err}`);
      res.status(500).send("Error connecting to database");
      return;
    }
    connection.query(
      "select p.idProyecto, p.nombre_equipo, p.nombre_proyecto, p.descripcion_proyecto, p.link_zoom, p.link_video, p.categoria, p.objetivos_onu from Proyecto p, Usuarios u where u.correo=? and p.idProyecto=? and u.proyecto=p.idProyecto;",
      [idUsuario, idProyecto],
      (err, rows) => {
        connection.release();
        if (err) {
          console.log(`error executing query: ${err}`);
          res.status(500).send(err);
          return;
        }
        if (rows.length > 0) {
          // si el proyecto pertenece al usuario, lo agregamos al objeto req para usarlo en la siguiente ruta
          req.userProject = rows[0];
        }

        next();
      }
    );
  });
}

module.exports = router;
