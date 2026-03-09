const express = require("express");
const { openDb } = require("./db");

function apiRouter() {
  const router = express.Router();
  const db = openDb();

  // Helpers
  const toInt = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  // =========================
  // AUTORES
  // =========================
  router.get("/autores", (req, res) => {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(toInt(req.query.limit, 50), 200);
    const offset = Math.max(toInt(req.query.offset, 0), 0);

    const rows = db
      .prepare(
        `
        SELECT ID, NOMBRE, NACIONALIDAD, BIBLIOGRAFIA, CREATED_AT, UPDATED_AT
        FROM AUTOR
        WHERE (? = '' OR NOMBRE LIKE '%' || ? || '%' OR NACIONALIDAD LIKE '%' || ? || '%')
        ORDER BY ID DESC
        LIMIT ? OFFSET ?;
      `
      )
      .all(q, q, q, limit, offset);

    res.json({ ok: true, data: rows });
  });

  router.post("/autores", (req, res) => {
    const { nombre, nacionalidad, bibliografia } = req.body || {};
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre de autor requerido." });
    }

    const info = db
      .prepare(
        `INSERT INTO AUTOR (NOMBRE, NACIONALIDAD, BIBLIOGRAFIA) VALUES (?,?,?)`
      )
      .run(String(nombre).trim(), nacionalidad ?? null, bibliografia ?? null);

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  router.put("/autores/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    const { nombre, nacionalidad, bibliografia } = req.body || {};

    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre requerido." });
    }

    const info = db
      .prepare(
        `
        UPDATE AUTOR
        SET NOMBRE=?, NACIONALIDAD=?, BIBLIOGRAFIA=?
        WHERE ID=?;
      `
      )
      .run(String(nombre).trim(), nacionalidad ?? null, bibliografia ?? null, id);

    res.json({ ok: true, changes: info.changes });
  });

  router.delete("/autores/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db.prepare(`DELETE FROM AUTOR WHERE ID=?;`).run(id);
    res.json({ ok: true, changes: info.changes });
  });

  // =========================
  // EDITORIALES
  // =========================
  router.get("/editoriales", (req, res) => {
    const q = String(req.query.q || "").trim();
    const rows = db
      .prepare(
        `
        SELECT ID, NOMBRE, DIRECCION, TELEFONO, EMAIL, CREATED_AT, UPDATED_AT
        FROM EDITORIAL
        WHERE (?='' OR NOMBRE LIKE '%'||?||'%' OR EMAIL LIKE '%'||?||'%')
        ORDER BY ID DESC;
      `
      )
      .all(q, q, q);

    res.json({ ok: true, data: rows });
  });

  router.post("/editoriales", (req, res) => {
    const { nombre, direccion, telefono, email } = req.body || {};
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre de editorial requerido." });
    }

    const info = db
      .prepare(
        `INSERT INTO EDITORIAL (NOMBRE, DIRECCION, TELEFONO, EMAIL) VALUES (?,?,?,?)`
      )
      .run(String(nombre).trim(), direccion ?? null, telefono ?? null, email ?? null);

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  router.put("/editoriales/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    const { nombre, direccion, telefono, email } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre requerido." });
    }

    const info = db
      .prepare(
        `
        UPDATE EDITORIAL
        SET NOMBRE=?, DIRECCION=?, TELEFONO=?, EMAIL=?
        WHERE ID=?;
      `
      )
      .run(String(nombre).trim(), direccion ?? null, telefono ?? null, email ?? null, id);

    res.json({ ok: true, changes: info.changes });
  });

  router.delete("/editoriales/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db.prepare(`DELETE FROM EDITORIAL WHERE ID=?;`).run(id);
    res.json({ ok: true, changes: info.changes });
  });

  // =========================
  // USUARIOS
  // =========================
  router.get("/usuarios", (req, res) => {
    const q = String(req.query.q || "").trim();
    const rows = db
      .prepare(
        `
        SELECT ID, NOMBRE, EMAIL, TELEFONO, DIRECCION, TIPO, ACTIVO, FECHA_REGISTRO, UPDATED_AT
        FROM USUARIO
        WHERE (?='' OR NOMBRE LIKE '%'||?||'%' OR EMAIL LIKE '%'||?||'%')
        ORDER BY ID DESC;
      `
      )
      .all(q, q, q);

    res.json({ ok: true, data: rows });
  });

  router.post("/usuarios", (req, res) => {
    const { nombre, email, telefono, direccion, tipo, activo } = req.body || {};
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre requerido." });
    }

    const info = db
      .prepare(
        `
        INSERT INTO USUARIO (NOMBRE, EMAIL, TELEFONO, DIRECCION, TIPO, ACTIVO)
        VALUES (?,?,?,?,?,?);
      `
      )
      .run(
        String(nombre).trim(),
        email ?? null,
        telefono ?? null,
        direccion ?? null,
        tipo ?? "alumno",
        typeof activo === "number" ? activo : 1
      );

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  router.put("/usuarios/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    const { nombre, email, telefono, direccion, tipo, activo } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Nombre requerido." });
    }

    const info = db
      .prepare(
        `
        UPDATE USUARIO
        SET NOMBRE=?, EMAIL=?, TELEFONO=?, DIRECCION=?, TIPO=?, ACTIVO=?
        WHERE ID=?;
      `
      )
      .run(
        String(nombre).trim(),
        email ?? null,
        telefono ?? null,
        direccion ?? null,
        tipo ?? "alumno",
        typeof activo === "number" ? activo : 1,
        id
      );

    res.json({ ok: true, changes: info.changes });
  });

  // Soft-delete (desactivar)
  router.delete("/usuarios/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db.prepare(`UPDATE USUARIO SET ACTIVO=0 WHERE ID=?;`).run(id);
    res.json({ ok: true, changes: info.changes });
  });

  // =========================
  // LIBROS (Catálogo)
  // =========================
  router.get("/libros", (req, res) => {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(toInt(req.query.limit, 50), 200);
    const offset = Math.max(toInt(req.query.offset, 0), 0);

    const rows = db
      .prepare(
        `
        SELECT
          L.ID, L.TITULO, L.ISBN, L.GENERO, L.IDIOMA, L.PAGINAS, L.FECHA_PUBLICACION,
          (SELECT GROUP_CONCAT(A.NOMBRE, ', ')
            FROM LIBRO_AUTOR LA
            JOIN AUTOR A ON A.ID = LA.AUTOR_ID
            WHERE LA.LIBRO_ID = L.ID
            ORDER BY COALESCE(LA.ORDEN_AUTORIA, 9999), A.NOMBRE
          ) AS AUTORES,
          (SELECT COUNT(*)
            FROM EDICION E
            JOIN EJEMPLAR J ON J.EDICION_ID = E.ID
            WHERE E.LIBRO_ID = L.ID
          ) AS TOTAL_EJEMPLARES,
          (SELECT COUNT(*)
            FROM EDICION E
            JOIN EJEMPLAR J ON J.EDICION_ID = E.ID
            WHERE E.LIBRO_ID = L.ID AND J.ESTADO = 'disponible'
          ) AS DISPONIBLES
        FROM LIBRO L
        WHERE (?='' OR L.TITULO LIKE '%'||?||'%' OR L.ISBN LIKE '%'||?||'%' OR L.GENERO LIKE '%'||?||'%')
        ORDER BY L.ID DESC
        LIMIT ? OFFSET ?;
      `
      )
      .all(q, q, q, q, limit, offset);

    res.json({ ok: true, data: rows });
  });

  router.get("/libros/:id/detail", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const libro = db
      .prepare(
        `
        SELECT ID, TITULO, ISBN, GENERO, IDIOMA, PAGINAS, FECHA_PUBLICACION, DESCRIPCION, CREATED_AT, UPDATED_AT
        FROM LIBRO
        WHERE ID=?;
      `
      )
      .get(id);

    if (!libro) return res.status(404).json({ ok: false, message: "Libro no encontrado." });

    const autores = db
      .prepare(
        `
        SELECT A.ID, A.NOMBRE, LA.ORDEN_AUTORIA, LA.ROL
        FROM LIBRO_AUTOR LA
        JOIN AUTOR A ON A.ID = LA.AUTOR_ID
        WHERE LA.LIBRO_ID=?
        ORDER BY COALESCE(LA.ORDEN_AUTORIA, 9999), A.NOMBRE;
      `
      )
      .all(id);

    const ediciones = db
      .prepare(
        `
        SELECT
          E.ID, E.LIBRO_ID, E.EDITORIAL_ID, E.NUM_EDICION, E.FECHA_LANZAMIENTO, E.LUGAR_PUBLICACION, E.ISBN_EDICION,
          ED.NOMBRE AS EDITORIAL_NOMBRE,
          (SELECT COUNT(*) FROM EJEMPLAR J WHERE J.EDICION_ID = E.ID) AS TOTAL_EJEMPLARES,
          (SELECT COUNT(*) FROM EJEMPLAR J WHERE J.EDICION_ID = E.ID AND J.ESTADO='disponible') AS DISPONIBLES
        FROM EDICION E
        JOIN EDITORIAL ED ON ED.ID = E.EDITORIAL_ID
        WHERE E.LIBRO_ID=?
        ORDER BY E.ID DESC;
      `
      )
      .all(id);

    res.json({ ok: true, data: { libro, autores, ediciones } });
  });

  router.post("/libros", (req, res) => {
    const { titulo, isbn, genero, idioma, paginas, fecha_publicacion, descripcion } = req.body || {};
    if (!titulo || String(titulo).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Título requerido." });
    }

    const info = db
      .prepare(
        `
        INSERT INTO LIBRO (TITULO, ISBN, GENERO, IDIOMA, PAGINAS, FECHA_PUBLICACION, DESCRIPCION)
        VALUES (?,?,?,?,?,?,?);
      `
      )
      .run(
        String(titulo).trim(),
        isbn ?? null,
        genero ?? null,
        idioma ?? null,
        paginas ?? null,
        fecha_publicacion ?? null,
        descripcion ?? null
      );

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  router.put("/libros/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    const { titulo, isbn, genero, idioma, paginas, fecha_publicacion, descripcion } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });
    if (!titulo || String(titulo).trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Título requerido." });
    }

    const info = db
      .prepare(
        `
        UPDATE LIBRO
        SET TITULO=?, ISBN=?, GENERO=?, IDIOMA=?, PAGINAS=?, FECHA_PUBLICACION=?, DESCRIPCION=?
        WHERE ID=?;
      `
      )
      .run(
        String(titulo).trim(),
        isbn ?? null,
        genero ?? null,
        idioma ?? null,
        paginas ?? null,
        fecha_publicacion ?? null,
        descripcion ?? null,
        id
      );

    res.json({ ok: true, changes: info.changes });
  });

  router.delete("/libros/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db.prepare(`DELETE FROM LIBRO WHERE ID=?;`).run(id);
    res.json({ ok: true, changes: info.changes });
  });

  // Asignar autores a un libro (reemplaza lista completa)
  router.put("/libros/:id/autores", (req, res) => {
    const libroId = toInt(req.params.id, 0);
    const list = Array.isArray(req.body?.autores) ? req.body.autores : [];
    if (!libroId) return res.status(400).json({ ok: false, message: "ID inválido." });

    const doTx = db.transaction(() => {
      db.prepare(`DELETE FROM LIBRO_AUTOR WHERE LIBRO_ID=?;`).run(libroId);

      const ins = db.prepare(`
        INSERT INTO LIBRO_AUTOR (LIBRO_ID, AUTOR_ID, ORDEN_AUTORIA, ROL)
        VALUES (?,?,?,?);
      `);

      for (const a of list) {
        const autorId = Number(a.autor_id);
        if (!Number.isFinite(autorId) || autorId <= 0) continue;
        ins.run(libroId, autorId, a.orden_autoria ?? null, a.rol ?? null);
      }
    });

    doTx();
    res.json({ ok: true });
  });

  // =========================
  // EDICIONES
  // =========================
  router.get("/ediciones", (req, res) => {
    const libroId = toInt(req.query.libro_id, 0);

    const rows = db
      .prepare(
        `
        SELECT
          E.ID, E.LIBRO_ID, E.EDITORIAL_ID, E.NUM_EDICION, E.FECHA_LANZAMIENTO, E.LUGAR_PUBLICACION, E.ISBN_EDICION,
          L.TITULO AS LIBRO_TITULO,
          ED.NOMBRE AS EDITORIAL_NOMBRE
        FROM EDICION E
        JOIN LIBRO L ON L.ID = E.LIBRO_ID
        JOIN EDITORIAL ED ON ED.ID = E.EDITORIAL_ID
        WHERE (?=0 OR E.LIBRO_ID=?)
        ORDER BY E.ID DESC;
      `
      )
      .all(libroId, libroId);

    res.json({ ok: true, data: rows });
  });

  router.post("/ediciones", (req, res) => {
    const { libro_id, editorial_id, num_edicion, fecha_lanzamiento, lugar_publicacion, isbn_edicion } = req.body || {};
    if (!libro_id || !editorial_id) {
      return res.status(400).json({ ok: false, message: "libro_id y editorial_id son requeridos." });
    }

    const info = db
      .prepare(
        `
        INSERT INTO EDICION (LIBRO_ID, EDITORIAL_ID, NUM_EDICION, FECHA_LANZAMIENTO, LUGAR_PUBLICACION, ISBN_EDICION)
        VALUES (?,?,?,?,?,?);
      `
      )
      .run(
        Number(libro_id),
        Number(editorial_id),
        num_edicion ?? null,
        fecha_lanzamiento ?? null,
        lugar_publicacion ?? null,
        isbn_edicion ?? null
      );

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  router.put("/ediciones/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    const { libro_id, editorial_id, num_edicion, fecha_lanzamiento, lugar_publicacion, isbn_edicion } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db
      .prepare(
        `
        UPDATE EDICION
        SET LIBRO_ID=?, EDITORIAL_ID=?, NUM_EDICION=?, FECHA_LANZAMIENTO=?, LUGAR_PUBLICACION=?, ISBN_EDICION=?
        WHERE ID=?;
      `
      )
      .run(
        Number(libro_id),
        Number(editorial_id),
        num_edicion ?? null,
        fecha_lanzamiento ?? null,
        lugar_publicacion ?? null,
        isbn_edicion ?? null,
        id
      );

    res.json({ ok: true, changes: info.changes });
  });

  router.delete("/ediciones/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db.prepare(`DELETE FROM EDICION WHERE ID=?;`).run(id);
    res.json({ ok: true, changes: info.changes });
  });

  // =========================
  // EJEMPLARES
  // =========================
  router.get("/ejemplares", (req, res) => {
    const q = String(req.query.q || "").trim();
    const estado = String(req.query.estado || "").trim();

    const rows = db
      .prepare(
        `
        SELECT
          J.ID, J.EDICION_ID, J.CODIGO_BARRAS, J.UBICACION, J.ESTADO, J.FECHA_ALTA,
          L.TITULO AS LIBRO_TITULO,
          E.ISBN_EDICION,
          ED.NOMBRE AS EDITORIAL_NOMBRE
        FROM EJEMPLAR J
        JOIN EDICION E ON E.ID = J.EDICION_ID
        JOIN LIBRO L ON L.ID = E.LIBRO_ID
        JOIN EDITORIAL ED ON ED.ID = E.EDITORIAL_ID
        WHERE
          (?='' OR J.CODIGO_BARRAS LIKE '%'||?||'%' OR L.TITULO LIKE '%'||?||'%')
          AND (?='' OR J.ESTADO = ?)
        ORDER BY J.ID DESC;
      `
      )
      .all(q, q, q, estado, estado);

    res.json({ ok: true, data: rows });
  });

  router.get("/ejemplares/lookup", (req, res) => {
    const codigo = String(req.query.codigo || "").trim();
    if (!codigo) return res.status(400).json({ ok: false, message: "codigo requerido" });

    const row = db
      .prepare(
        `
        SELECT
          J.ID, J.CODIGO_BARRAS, J.ESTADO,
          L.TITULO AS LIBRO_TITULO
        FROM EJEMPLAR J
        JOIN EDICION E ON E.ID = J.EDICION_ID
        JOIN LIBRO L ON L.ID = E.LIBRO_ID
        WHERE J.CODIGO_BARRAS=?;
      `
      )
      .get(codigo);

    if (!row) return res.status(404).json({ ok: false, message: "No encontrado" });
    res.json({ ok: true, data: row });
  });

  router.post("/ejemplares", (req, res) => {
    const { edicion_id, codigo_barras, ubicacion, estado } = req.body || {};
    if (!edicion_id || !codigo_barras) {
      return res.status(400).json({ ok: false, message: "edicion_id y codigo_barras son requeridos." });
    }

    const info = db
      .prepare(
        `
        INSERT INTO EJEMPLAR (EDICION_ID, CODIGO_BARRAS, UBICACION, ESTADO)
        VALUES (?,?,?,?);
      `
      )
      .run(Number(edicion_id), String(codigo_barras).trim(), ubicacion ?? null, estado ?? "disponible");

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  router.put("/ejemplares/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    const { ubicacion, estado } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db
      .prepare(`UPDATE EJEMPLAR SET UBICACION=?, ESTADO=? WHERE ID=?;`)
      .run(ubicacion ?? null, estado ?? "disponible", id);

    res.json({ ok: true, changes: info.changes });
  });

  router.delete("/ejemplares/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db.prepare(`DELETE FROM EJEMPLAR WHERE ID=?;`).run(id);
    res.json({ ok: true, changes: info.changes });
  });

  // =========================
  // PRESTAMOS
  // =========================
  router.get("/prestamos", (req, res) => {
    const estado = String(req.query.estado || "").trim();

    const rows = db
      .prepare(
        `
        SELECT
          P.ID, P.USUARIO_ID, U.NOMBRE AS USUARIO_NOMBRE,
          P.FECHA_PRESTAMO, P.ESTADO, P.OBSERVACIONES,
          (SELECT COUNT(*) FROM PRESTAMO_ITEM PI WHERE PI.PRESTAMO_ID=P.ID) AS ITEMS,
          (SELECT COUNT(*)
            FROM PRESTAMO_ITEM PI
            WHERE PI.PRESTAMO_ID=P.ID AND PI.ESTADO='activo' AND datetime(PI.FECHA_VENCIMIENTO) < datetime('now')
          ) AS VENCIDOS
        FROM PRESTAMO P
        JOIN USUARIO U ON U.ID = P.USUARIO_ID
        WHERE (?='' OR P.ESTADO=?)
        ORDER BY P.ID DESC;
      `
      )
      .all(estado, estado);

    res.json({ ok: true, data: rows });
  });

  router.get("/prestamos/:id", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const prestamo = db
      .prepare(
        `
        SELECT P.ID, P.USUARIO_ID, U.NOMBRE AS USUARIO_NOMBRE, P.FECHA_PRESTAMO, P.ESTADO, P.OBSERVACIONES
        FROM PRESTAMO P
        JOIN USUARIO U ON U.ID = P.USUARIO_ID
        WHERE P.ID=?;
      `
      )
      .get(id);

    if (!prestamo) return res.status(404).json({ ok: false, message: "Préstamo no encontrado." });

    const items = db
      .prepare(
        `
        SELECT
          PI.PRESTAMO_ID, PI.EJEMPLAR_ID,
          PI.FECHA_VENCIMIENTO, PI.FECHA_DEVOLUCION, PI.ESTADO, PI.CONDICION_DEVOLUCION, PI.MULTA_MXN,
          J.CODIGO_BARRAS,
          L.TITULO AS LIBRO_TITULO
        FROM PRESTAMO_ITEM PI
        JOIN EJEMPLAR J ON J.ID = PI.EJEMPLAR_ID
        JOIN EDICION E ON E.ID = J.EDICION_ID
        JOIN LIBRO L ON L.ID = E.LIBRO_ID
        WHERE PI.PRESTAMO_ID=?
        ORDER BY PI.EJEMPLAR_ID DESC;
      `
      )
      .all(id);

    res.json({ ok: true, data: { prestamo, items } });
  });

  router.post("/prestamos", (req, res) => {
    const { usuario_id, observaciones, items } = req.body || {};
    if (!usuario_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "usuario_id e items[] son requeridos." });
    }

    const createTx = db.transaction(() => {
      const user = db.prepare(`SELECT ID, ACTIVO FROM USUARIO WHERE ID=?;`).get(Number(usuario_id));
      if (!user) throw new Error("USUARIO_NO_EXISTE");
      if (user.ACTIVO !== 1) throw new Error("USUARIO_INACTIVO");

      const insPrestamo = db.prepare(
        `INSERT INTO PRESTAMO (USUARIO_ID, OBSERVACIONES) VALUES (?,?);`
      );
      const pInfo = insPrestamo.run(Number(usuario_id), observaciones ?? null);
      const prestamoId = pInfo.lastInsertRowid;

      const insItem = db.prepare(
        `
        INSERT INTO PRESTAMO_ITEM (PRESTAMO_ID, EJEMPLAR_ID, FECHA_VENCIMIENTO, ESTADO, MULTA_MXN)
        VALUES (?,?,?,?,0);
      `
      );
      const updEj = db.prepare(`UPDATE EJEMPLAR SET ESTADO='prestado' WHERE ID=?;`);
      const getEj = db.prepare(`SELECT ID, ESTADO FROM EJEMPLAR WHERE ID=?;`);

      for (const it of items) {
        const ejemplarId = Number(it.ejemplar_id);
        const fechaVenc = String(it.fecha_vencimiento || "").trim();
        if (!ejemplarId || !fechaVenc) throw new Error("ITEM_INVALIDO");

        const ej = getEj.get(ejemplarId);
        if (!ej) throw new Error("EJEMPLAR_NO_EXISTE");
        if (String(ej.ESTADO) !== "disponible") throw new Error("EJEMPLAR_NO_DISPONIBLE");

        insItem.run(prestamoId, ejemplarId, fechaVenc, "activo");
        updEj.run(ejemplarId);
      }

      return prestamoId;
    });

    try {
      const prestamoId = createTx();
      res.status(201).json({ ok: true, id: prestamoId });
    } catch (e) {
      if (e.message === "USUARIO_NO_EXISTE") {
        return res.status(400).json({ ok: false, message: "Usuario no existe." });
      }
      if (e.message === "USUARIO_INACTIVO") {
        return res.status(400).json({ ok: false, message: "Usuario inactivo." });
      }
      if (e.message === "EJEMPLAR_NO_DISPONIBLE") {
        return res.status(409).json({ ok: false, message: "Hay un ejemplar no disponible." });
      }
      if (e.message === "ITEM_INVALIDO") {
        return res.status(400).json({ ok: false, message: "Item inválido." });
      }
      throw e;
    }
  });

  router.post("/prestamos/:id/devolver", (req, res) => {
    const prestamoId = toInt(req.params.id, 0);
    const { ejemplar_id, condicion_devolucion, multa_mxn } = req.body || {};
    if (!prestamoId || !ejemplar_id) {
      return res.status(400).json({ ok: false, message: "prestamo_id y ejemplar_id requeridos." });
    }

    const tx = db.transaction(() => {
      const item = db
        .prepare(
          `SELECT ESTADO FROM PRESTAMO_ITEM WHERE PRESTAMO_ID=? AND EJEMPLAR_ID=?;`
        )
        .get(prestamoId, Number(ejemplar_id));

      if (!item) throw new Error("ITEM_NO_EXISTE");
      if (item.ESTADO !== "activo") throw new Error("ITEM_NO_ACTIVO");

      db.prepare(
        `
        UPDATE PRESTAMO_ITEM
        SET ESTADO='devuelto',
            FECHA_DEVOLUCION=CURRENT_TIMESTAMP,
            CONDICION_DEVOLUCION=?,
            MULTA_MXN=?
        WHERE PRESTAMO_ID=? AND EJEMPLAR_ID=?;
      `
      ).run(condicion_devolucion ?? null, Number(multa_mxn || 0), prestamoId, Number(ejemplar_id));

      db.prepare(`UPDATE EJEMPLAR SET ESTADO='disponible' WHERE ID=?;`).run(Number(ejemplar_id));

      const open = db
        .prepare(
          `SELECT COUNT(*) AS c FROM PRESTAMO_ITEM WHERE PRESTAMO_ID=? AND ESTADO='activo';`
        )
        .get(prestamoId);

      if (open.c === 0) {
        db.prepare(`UPDATE PRESTAMO SET ESTADO='cerrado' WHERE ID=?;`).run(prestamoId);
      }
    });

    try {
      tx();
      res.json({ ok: true });
    } catch (e) {
      if (e.message === "ITEM_NO_EXISTE") return res.status(404).json({ ok: false, message: "Item no existe." });
      if (e.message === "ITEM_NO_ACTIVO") return res.status(409).json({ ok: false, message: "Item no está activo." });
      throw e;
    }
  });

  // =========================
  // RESERVAS
  // =========================
  router.get("/reservas", (req, res) => {
    const estado = String(req.query.estado || "").trim();

    const rows = db
      .prepare(
        `
        SELECT
          R.ID, R.USUARIO_ID, U.NOMBRE AS USUARIO_NOMBRE,
          R.LIBRO_ID, L.TITULO AS LIBRO_TITULO,
          R.FECHA_RESERVA, R.EXPIRA_EN, R.ESTADO
        FROM RESERVA R
        JOIN USUARIO U ON U.ID = R.USUARIO_ID
        JOIN LIBRO L ON L.ID = R.LIBRO_ID
        WHERE (?='' OR R.ESTADO=?)
        ORDER BY R.ID DESC;
      `
      )
      .all(estado, estado);

    res.json({ ok: true, data: rows });
  });

  router.post("/reservas", (req, res) => {
    const { usuario_id, libro_id, expira_en } = req.body || {};
    if (!usuario_id || !libro_id) {
      return res.status(400).json({ ok: false, message: "usuario_id y libro_id son requeridos." });
    }

    const info = db
      .prepare(
        `
        INSERT INTO RESERVA (USUARIO_ID, LIBRO_ID, EXPIRA_EN)
        VALUES (?,?,?);
      `
      )
      .run(Number(usuario_id), Number(libro_id), expira_en ?? null);

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  });

  router.put("/reservas/:id/cancelar", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db.prepare(`UPDATE RESERVA SET ESTADO='cancelada' WHERE ID=?;`).run(id);
    res.json({ ok: true, changes: info.changes });
  });

  router.put("/reservas/:id/cumplir", (req, res) => {
    const id = toInt(req.params.id, 0);
    if (!id) return res.status(400).json({ ok: false, message: "ID inválido." });

    const info = db.prepare(`UPDATE RESERVA SET ESTADO='cumplida' WHERE ID=?;`).run(id);
    res.json({ ok: true, changes: info.changes });
  });

  // =========================
  // SELECTS para UI
  // =========================
  router.get("/select/autores", (req, res) => {
    const rows = db.prepare(`SELECT ID, NOMBRE FROM AUTOR ORDER BY NOMBRE;`).all();
    res.json({ ok: true, data: rows });
  });

  router.get("/select/editoriales", (req, res) => {
    const rows = db.prepare(`SELECT ID, NOMBRE FROM EDITORIAL ORDER BY NOMBRE;`).all();
    res.json({ ok: true, data: rows });
  });

  router.get("/select/libros", (req, res) => {
    const rows = db.prepare(`SELECT ID, TITULO FROM LIBRO ORDER BY TITULO;`).all();
    res.json({ ok: true, data: rows });
  });

  router.get("/select/usuarios", (req, res) => {
    const rows = db.prepare(`SELECT ID, NOMBRE FROM USUARIO WHERE ACTIVO=1 ORDER BY NOMBRE;`).all();
    res.json({ ok: true, data: rows });
  });

  router.get("/select/ediciones", (req, res) => {
    const libroId = toInt(req.query.libro_id, 0);
    const rows = db
      .prepare(
        `
        SELECT E.ID,
               (L.TITULO || ' — ' || ED.NOMBRE || COALESCE(' — Ed.' || E.NUM_EDICION,'') ) AS LABEL
        FROM EDICION E
        JOIN LIBRO L ON L.ID = E.LIBRO_ID
        JOIN EDITORIAL ED ON ED.ID = E.EDITORIAL_ID
        WHERE (?=0 OR E.LIBRO_ID=?)
        ORDER BY E.ID DESC;
      `
      )
      .all(libroId, libroId);

    res.json({ ok: true, data: rows });
  });

  return router;
}

module.exports = { apiRouter };