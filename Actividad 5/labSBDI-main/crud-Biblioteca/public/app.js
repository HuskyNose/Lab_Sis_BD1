const $ = (s) => document.querySelector(s);

const state = {
  view: "libros",
  q: ""
};

const api = {
  async get(path) {
    const r = await fetch(path);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || j.message || "Error");
    return j;
  },
  async send(path, method, body) {
    const r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || j.message || "Error");
    return j;
  }
};

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
}

function setActiveNav() {
  document.querySelectorAll(".chip").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === state.view);
  });
}

function openModal(title, subtitle, bodyEl, footerEl) {
  $("#modalTitle").textContent = title;
  $("#modalSubtitle").textContent = subtitle || "";
  const body = $("#modalBody");
  const foot = $("#modalFooter");
  body.innerHTML = "";
  foot.innerHTML = "";
  body.appendChild(bodyEl);
  footerEl?.forEach((x) => foot.appendChild(x));
  $("#modal").classList.add("show");
}

function closeModal() {
  $("#modal").classList.remove("show");
}

$("#modalClose").addEventListener("click", closeModal);
$("#modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});

document.querySelectorAll(".chip").forEach((b) => {
  b.addEventListener("click", () => {
    state.view = b.dataset.view;
    $("#search").value = "";
    state.q = "";
    setActiveNav();
    render();
  });
});

$("#search").addEventListener("input", (e) => {
  state.q = e.target.value.trim();
});

$("#refresh").addEventListener("click", () => render());
$("#newBtn").addEventListener("click", () => onNew());

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  });
  children.forEach((c) => el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return el;
}

function table(headers, rows) {
  const thead = h("thead", {}, [
    h("tr", {}, headers.map((x) => h("th", {}, [x])))
  ]);

  const tbody = h("tbody", {}, rows.map((r) => h("tr", {}, r.map((c) => h("td", {}, [c])))));
  return h("table", { class: "table" }, [thead, tbody]);
}

// =========================
// VIEWS
// =========================
async function render() {
  setActiveNav();

  const titleMap = {
    libros: ["Libros", "Catálogo general"],
    autores: ["Autores", "Gestión de autores"],
    editoriales: ["Editoriales", "Gestión de editoriales"],
    ediciones: ["Ediciones", "Ediciones por libro/editorial"],
    ejemplares: ["Ejemplares", "Copias físicas (código de barras)"],
    usuarios: ["Usuarios", "Lectores y personal"],
    prestamos: ["Préstamos", "Alta y devolución"],
    reservas: ["Reservas", "Reservar un libro"]
  };

  $("#viewTitle").textContent = titleMap[state.view][0];
  $("#viewHint").textContent = titleMap[state.view][1];

  const content = $("#content");
  content.innerHTML = "Cargando...";

  try {
    if (state.view === "libros") return renderLibros();
    if (state.view === "autores") return renderAutores();
    if (state.view === "editoriales") return renderEditoriales();
    if (state.view === "usuarios") return renderUsuarios();
    if (state.view === "ediciones") return renderEdiciones();
    if (state.view === "ejemplares") return renderEjemplares();
    if (state.view === "prestamos") return renderPrestamos();
    if (state.view === "reservas") return renderReservas();
  } catch (e) {
    content.innerHTML = "";
    content.appendChild(h("div", {}, [`Error: ${e.message}`]));
  }
}

async function renderLibros() {
  const { data } = await api.get(`/api/libros?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => {
    const disp = Number(x.DISPONIBLES || 0);
    const tot = Number(x.TOTAL_EJEMPLARES || 0);
    const badge =
      tot === 0 ? h("span", { class: "badge warn" }, ["Sin ejemplares"]) :
      disp > 0 ? h("span", { class: "badge ok" }, [`${disp}/${tot} disponibles`]) :
      h("span", { class: "badge bad" }, [`0/${tot} disponibles`]);

    const btns = h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => libroDetalle(x.ID) }, ["Detalle"]),
      h("button", { class: "btn danger", onClick: () => delLibro(x.ID) }, ["Eliminar"])
    ]);

    return [
      String(x.ID),
      x.TITULO || "",
      x.AUTORES || "—",
      x.ISBN || "—",
      badge,
      btns
    ];
  });

  const t = table(["ID", "Título", "Autores", "ISBN", "Disponibilidad", "Acciones"], rows);
  $("#content").innerHTML = "";
  $("#content").appendChild(t);
}

async function libroDetalle(id) {
  const r = await api.get(`/api/libros/${id}/detail`);
  const { libro, autores, ediciones } = r.data;

  const body = h("div", {}, [
    h("div", { class: "muted" }, [`Libro #${libro.ID}`]),
    h("div", { style: "margin:10px 0;font-weight:800;" }, [libro.TITULO]),
    h("div", { class: "muted" }, [`ISBN: ${libro.ISBN || "—"} · Género: ${libro.GENERO || "—"} · Idioma: ${libro.IDIOMA || "—"}`]),
    h("hr", { style: "border:0;border-top:1px solid var(--border);margin:12px 0;" }),

    h("div", { style: "font-weight:800;margin-bottom:6px;" }, ["Autores asignados"]),
    h("div", { class: "muted", style: "margin-bottom:10px;" }, [
      autores.length ? autores.map(a => a.NOMBRE).join(", ") : "—"
    ]),
    h("div", { style: "font-weight:800;margin:12px 0 6px;" }, ["Ediciones"]),
    h("div", { class: "muted", style: "margin-bottom:8px;" }, ["(Puedes crear ediciones desde la pestaña Ediciones.)"]),
    h("div", {}, [
      ediciones.length
        ? table(
            ["ID", "Editorial", "Ed.", "ISBN edición", "Ejemplares"],
            ediciones.map(e => [
              String(e.ID),
              e.EDITORIAL_NOMBRE,
              e.NUM_EDICION ?? "—",
              e.ISBN_EDICION ?? "—",
              `${e.DISPONIBLES}/${e.TOTAL_EJEMPLARES}`
            ])
          )
        : h("div", { class: "muted" }, ["—"])
    ])
  ]);

  const footer = [
    h("button", { class: "btn", onClick: async () => openLibroEdit(libro) }, ["Editar"]),
    h("button", { class: "btn primary", onClick: async () => openAutoresAsignacion(libro.ID) }, ["Asignar autores"])
  ];

  openModal("Detalle de libro", "Catálogo", body, footer);
}

async function openLibroEdit(libro) {
  const form = h("div", { class: "form" }, [
    field("Título", "titulo", libro.TITULO),
    field("ISBN", "isbn", libro.ISBN || ""),
    field("Género", "genero", libro.GENERO || ""),
    field("Idioma", "idioma", libro.IDIOMA || ""),
    field("Páginas", "paginas", libro.PAGINAS ?? ""),
    field("Fecha publicación", "fecha_publicacion", libro.FECHA_PUBLICACION || ""),
    field("Descripción", "descripcion", libro.DESCRIPCION || "", true)
  ]);

  const save = async () => {
    const payload = readForm(form);
    await api.send(`/api/libros/${libro.ID}`, "PUT", payload);
    toast("Libro actualizado");
    closeModal();
    render();
  };

  openModal("Editar libro", `ID ${libro.ID}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function openAutoresAsignacion(libroId) {
  const opts = await api.get("/api/select/autores");
  const autores = opts.data || [];

  const wrap = h("div", {}, [
    h("div", { class: "muted", style: "margin-bottom:8px;" }, ["Selecciona autores para este libro (se reemplaza la lista completa)."]),
  ]);

  const list = h("div", { style: "display:grid;gap:8px;" }, autores.map((a) => {
    const row = h("div", { style: "display:flex;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--border);border-radius:12px;padding:10px;" }, [
      h("div", {}, [a.NOMBRE]),
      h("div", { style: "display:flex;gap:8px;align-items:center;" }, [
        h("input", { type: "checkbox", "data-autor": a.ID }),
        h("input", { class: "input", style: "width:110px;", placeholder: "Orden", "data-orden": a.ID }),
        h("input", { class: "input", style: "width:160px;", placeholder: "Rol", "data-rol": a.ID })
      ])
    ]);
    return row;
  }));

  wrap.appendChild(list);

  const save = async () => {
    const selected = [];
    list.querySelectorAll("input[type='checkbox']").forEach((chk) => {
      if (!chk.checked) return;
      const autorId = Number(chk.getAttribute("data-autor"));
      const orden = list.querySelector(`input[data-orden='${autorId}']`)?.value || null;
      const rol = list.querySelector(`input[data-rol='${autorId}']`)?.value || null;
      selected.push({
        autor_id: autorId,
        orden_autoria: orden ? Number(orden) : null,
        rol: rol || null
      });
    });

    await api.send(`/api/libros/${libroId}/autores`, "PUT", { autores: selected });
    toast("Autores asignados");
    closeModal();
  };

  openModal("Asignar autores", `Libro ID ${libroId}`, wrap, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delLibro(id) {
  if (!confirm("¿Eliminar libro? (Se borrará y puede fallar si tiene relaciones)")) return;
  await api.send(`/api/libros/${id}`, "DELETE");
  toast("Libro eliminado");
  render();
}

async function renderAutores() {
  const { data } = await api.get(`/api/autores?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => ([
    String(x.ID),
    x.NOMBRE || "",
    x.NACIONALIDAD || "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editAutor(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delAutor(x.ID) }, ["Eliminar"])
    ])
  ]));

  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Nombre","Nacionalidad","Acciones"], rows));
}

async function renderEditoriales() {
  const { data } = await api.get(`/api/editoriales?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => ([
    String(x.ID),
    x.NOMBRE || "",
    x.EMAIL || "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editEditorial(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delEditorial(x.ID) }, ["Eliminar"])
    ])
  ]));

  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Nombre","Email","Acciones"], rows));
}

async function renderUsuarios() {
  const { data } = await api.get(`/api/usuarios?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => ([
    String(x.ID),
    x.NOMBRE || "",
    x.TIPO || "",
    x.EMAIL || "—",
    x.ACTIVO === 1 ? h("span", { class: "badge ok" }, ["Activo"]) : h("span", { class: "badge bad" }, ["Inactivo"]),
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editUsuario(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => desactUsuario(x.ID) }, ["Desactivar"])
    ])
  ]));

  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Nombre","Tipo","Email","Estado","Acciones"], rows));
}

async function renderEdiciones() {
  const { data } = await api.get(`/api/ediciones?libro_id=0`);
  const rows = data.map((x) => ([
    String(x.ID),
    x.LIBRO_TITULO,
    x.EDITORIAL_NOMBRE,
    x.NUM_EDICION ?? "—",
    x.ISBN_EDICION ?? "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editEdicion(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delEdicion(x.ID) }, ["Eliminar"])
    ])
  ]));

  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Libro","Editorial","Ed.","ISBN edición","Acciones"], rows));
}

async function renderEjemplares() {
  const est = "";
  const { data } = await api.get(`/api/ejemplares?q=${encodeURIComponent(state.q)}&estado=${encodeURIComponent(est)}`);
  const rows = data.map((x) => ([
    String(x.ID),
    x.CODIGO_BARRAS,
    x.LIBRO_TITULO,
    x.ESTADO,
    x.UBICACION || "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editEjemplar(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delEjemplar(x.ID) }, ["Eliminar"])
    ])
  ]));

  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Código","Libro","Estado","Ubicación","Acciones"], rows));
}

async function renderPrestamos() {
  const { data } = await api.get(`/api/prestamos?estado=`);
  const rows = data.map((p) => ([
    String(p.ID),
    p.USUARIO_NOMBRE,
    p.ESTADO,
    String(p.ITEMS || 0),
    Number(p.VENCIDOS || 0) > 0 ? h("span", { class: "badge bad" }, [`${p.VENCIDOS} vencido(s)`]) : h("span", { class: "badge ok" }, ["OK"]),
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => detallePrestamo(p.ID) }, ["Detalle"])
    ])
  ]));

  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Usuario","Estado","Items","Vencimientos","Acciones"], rows));
}

async function detallePrestamo(id) {
  const r = await api.get(`/api/prestamos/${id}`);
  const { prestamo, items } = r.data;

  const body = h("div", {}, [
    h("div", { class: "muted" }, [`Préstamo #${prestamo.ID} — ${prestamo.USUARIO_NOMBRE}`]),
    h("div", { style: "margin:10px 0;font-weight:800;" }, [`Estado: ${prestamo.ESTADO}`]),
    items.length
      ? table(
          ["Ejemplar","Libro","Vence","Estado","Multa","Acción"],
          items.map((it) => {
            const canReturn = it.ESTADO === "activo";
            const btn = canReturn
              ? h("button", { class: "btn primary", onClick: () => devolverItem(prestamo.ID, it.EJEMPLAR_ID) }, ["Devolver"])
              : h("span", { class: "muted" }, ["—"]);
            return [
              it.CODIGO_BARRAS,
              it.LIBRO_TITULO,
              it.FECHA_VENCIMIENTO,
              it.ESTADO,
              String(it.MULTA_MXN || 0),
              btn
            ];
          })
        )
      : h("div", { class: "muted" }, ["Sin items."])
  ]);

  openModal("Detalle de préstamo", `ID ${prestamo.ID}`, body, [
    h("button", { class: "btn", onClick: closeModal }, ["Cerrar"])
  ]);
}

async function devolverItem(prestamoId, ejemplarId) {
  const multa = prompt("Multa MXN (0 si no aplica):", "0");
  const condicion = prompt("Condición devolución (opcional):", "");
  await api.send(`/api/prestamos/${prestamoId}/devolver`, "POST", {
    ejemplar_id: ejemplarId,
    multa_mxn: Number(multa || 0),
    condicion_devolucion: condicion || null
  });
  toast("Devuelto");
  closeModal();
  render();
}

async function renderReservas() {
  const { data } = await api.get(`/api/reservas?estado=`);
  const rows = data.map((x) => ([
    String(x.ID),
    x.USUARIO_NOMBRE,
    x.LIBRO_TITULO,
    x.ESTADO,
    h("div", { class: "actions" }, [
      x.ESTADO === "activa"
        ? h("button", { class: "btn", onClick: () => cancelarReserva(x.ID) }, ["Cancelar"])
        : h("span", { class: "muted" }, ["—"]),
      x.ESTADO === "activa"
        ? h("button", { class: "btn primary", onClick: () => cumplirReserva(x.ID) }, ["Cumplir"])
        : h("span", { class: "muted" }, ["—"])
    ])
  ]));

  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Usuario","Libro","Estado","Acciones"], rows));
}

// =========================
// MODALS CRUD
// =========================
function field(label, name, value = "", full = false) {
  const input = h("input", { class: "input", name, value: String(value ?? "") });
  return h("div", { class: `field ${full ? "full" : ""}` }, [
    h("div", { class: "label" }, [label]),
    input
  ]);
}

function readForm(root) {
  const obj = {};
  root.querySelectorAll("input[name]").forEach((i) => {
    obj[i.name] = i.value.trim();
  });
  if ("paginas" in obj) obj.paginas = obj.paginas ? Number(obj.paginas) : null;
  return obj;
}

async function onNew() {
  if (state.view === "libros") return newLibro();
  if (state.view === "autores") return newAutor();
  if (state.view === "editoriales") return newEditorial();
  if (state.view === "usuarios") return newUsuario();
  if (state.view === "ediciones") return newEdicion();
  if (state.view === "ejemplares") return newEjemplar();
  if (state.view === "prestamos") return newPrestamo();
  if (state.view === "reservas") return newReserva();
}

async function newLibro() {
  const form = h("div", { class: "form" }, [
    field("Título", "titulo", ""),
    field("ISBN", "isbn", ""),
    field("Género", "genero", ""),
    field("Idioma", "idioma", ""),
    field("Páginas", "paginas", ""),
    field("Fecha publicación", "fecha_publicacion", ""),
    field("Descripción", "descripcion", "", true)
  ]);

  const save = async () => {
    const payload = readForm(form);
    await api.send("/api/libros", "POST", payload);
    toast("Libro creado");
    closeModal();
    render();
  };

  openModal("Nuevo libro", "Catálogo", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function newAutor() {
  const form = h("div", { class: "form" }, [
    field("Nombre", "nombre", ""),
    field("Nacionalidad", "nacionalidad", ""),
    field("Bibliografía", "bibliografia", "", true)
  ]);

  const save = async () => {
    const payload = readForm(form);
    await api.send("/api/autores", "POST", payload);
    toast("Autor creado");
    closeModal();
    render();
  };

  openModal("Nuevo autor", "Catálogo", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editAutor(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre", "nombre", x.NOMBRE),
    field("Nacionalidad", "nacionalidad", x.NACIONALIDAD || ""),
    field("Bibliografía", "bibliografia", x.BIBLIOGRAFIA || "", true)
  ]);

  const save = async () => {
    const payload = readForm(form);
    await api.send(`/api/autores/${x.ID}`, "PUT", payload);
    toast("Autor actualizado");
    closeModal();
    render();
  };

  openModal("Editar autor", `ID ${x.ID}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delAutor(id) {
  if (!confirm("¿Eliminar autor?")) return;
  await api.send(`/api/autores/${id}`, "DELETE");
  toast("Autor eliminado");
  render();
}

async function newEditorial() {
  const form = h("div", { class: "form" }, [
    field("Nombre", "nombre", ""),
    field("Email", "email", ""),
    field("Teléfono", "telefono", ""),
    field("Dirección", "direccion", "", true)
  ]);

  const save = async () => {
    const payload = readForm(form);
    await api.send("/api/editoriales", "POST", payload);
    toast("Editorial creada");
    closeModal();
    render();
  };

  openModal("Nueva editorial", "Catálogo", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editEditorial(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre", "nombre", x.NOMBRE),
    field("Email", "email", x.EMAIL || ""),
    field("Teléfono", "telefono", x.TELEFONO || ""),
    field("Dirección", "direccion", x.DIRECCION || "", true)
  ]);

  const save = async () => {
    const payload = readForm(form);
    await api.send(`/api/editoriales/${x.ID}`, "PUT", payload);
    toast("Editorial actualizada");
    closeModal();
    render();
  };

  openModal("Editar editorial", `ID ${x.ID}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delEditorial(id) {
  if (!confirm("¿Eliminar editorial?")) return;
  await api.send(`/api/editoriales/${id}`, "DELETE");
  toast("Editorial eliminada");
  render();
}

async function newUsuario() {
  const form = h("div", { class: "form" }, [
    field("Nombre", "nombre", ""),
    field("Email", "email", ""),
    field("Teléfono", "telefono", ""),
    field("Dirección", "direccion", "", true),
    field("Tipo (alumno/docente/externo/bibliotecario/admin)", "tipo", "alumno"),
    field("Activo (1/0)", "activo", "1")
  ]);

  const save = async () => {
    const payload = readForm(form);
    payload.activo = payload.activo ? Number(payload.activo) : 1;
    await api.send("/api/usuarios", "POST", payload);
    toast("Usuario creado");
    closeModal();
    render();
  };

  openModal("Nuevo usuario", "Biblioteca", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editUsuario(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre", "nombre", x.NOMBRE),
    field("Email", "email", x.EMAIL || ""),
    field("Teléfono", "telefono", x.TELEFONO || ""),
    field("Dirección", "direccion", x.DIRECCION || "", true),
    field("Tipo", "tipo", x.TIPO),
    field("Activo (1/0)", "activo", String(x.ACTIVO))
  ]);

  const save = async () => {
    const payload = readForm(form);
    payload.activo = payload.activo ? Number(payload.activo) : 1;
    await api.send(`/api/usuarios/${x.ID}`, "PUT", payload);
    toast("Usuario actualizado");
    closeModal();
    render();
  };

  openModal("Editar usuario", `ID ${x.ID}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function desactUsuario(id) {
  if (!confirm("¿Desactivar usuario?")) return;
  await api.send(`/api/usuarios/${id}`, "DELETE");
  toast("Usuario desactivado");
  render();
}

async function newEdicion() {
  const [libros, editoriales] = await Promise.all([
    api.get("/api/select/libros"),
    api.get("/api/select/editoriales")
  ]);

  const form = h("div", { class: "form" }, [
    selectField("Libro", "libro_id", libros.data),
    selectField("Editorial", "editorial_id", editoriales.data),
    field("Num edición", "num_edicion", ""),
    field("Fecha lanzamiento", "fecha_lanzamiento", ""),
    field("Lugar publicación", "lugar_publicacion", ""),
    field("ISBN edición", "isbn_edicion", "")
  ]);

  const save = async () => {
    const payload = readForm(form);
    payload.libro_id = Number(payload.libro_id);
    payload.editorial_id = Number(payload.editorial_id);
    payload.num_edicion = payload.num_edicion ? Number(payload.num_edicion) : null;
    await api.send("/api/ediciones", "POST", payload);
    toast("Edición creada");
    closeModal();
    render();
  };

  openModal("Nueva edición", "Catálogo", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editEdicion(x) {
  const [libros, editoriales] = await Promise.all([
    api.get("/api/select/libros"),
    api.get("/api/select/editoriales")
  ]);

  const form = h("div", { class: "form" }, [
    selectField("Libro", "libro_id", libros.data, x.LIBRO_ID),
    selectField("Editorial", "editorial_id", editoriales.data, x.EDITORIAL_ID),
    field("Num edición", "num_edicion", x.NUM_EDICION ?? ""),
    field("Fecha lanzamiento", "fecha_lanzamiento", x.FECHA_LANZAMIENTO ?? ""),
    field("Lugar publicación", "lugar_publicacion", x.LUGAR_PUBLICACION ?? ""),
    field("ISBN edición", "isbn_edicion", x.ISBN_EDICION ?? "")
  ]);

  const save = async () => {
    const payload = readForm(form);
    payload.libro_id = Number(payload.libro_id);
    payload.editorial_id = Number(payload.editorial_id);
    payload.num_edicion = payload.num_edicion ? Number(payload.num_edicion) : null;
    await api.send(`/api/ediciones/${x.ID}`, "PUT", payload);
    toast("Edición actualizada");
    closeModal();
    render();
  };

  openModal("Editar edición", `ID ${x.ID}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delEdicion(id) {
  if (!confirm("¿Eliminar edición?")) return;
  await api.send(`/api/ediciones/${id}`, "DELETE");
  toast("Edición eliminada");
  render();
}

async function newEjemplar() {
  const ed = await api.get("/api/select/ediciones?libro_id=0");

  const form = h("div", { class: "form" }, [
    selectField("Edición", "edicion_id", ed.data),
    field("Código de barras", "codigo_barras", ""),
    field("Ubicación", "ubicacion", ""),
    field("Estado (disponible/prestado/mantenimiento/baja)", "estado", "disponible")
  ]);

  const save = async () => {
    const payload = readForm(form);
    payload.edicion_id = Number(payload.edicion_id);
    await api.send("/api/ejemplares", "POST", payload);
    toast("Ejemplar creado");
    closeModal();
    render();
  };

  openModal("Nuevo ejemplar", "Catálogo", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editEjemplar(x) {
  const form = h("div", { class: "form" }, [
    field("Ubicación", "ubicacion", x.UBICACION || ""),
    field("Estado", "estado", x.ESTADO || "disponible")
  ]);

  const save = async () => {
    const payload = readForm(form);
    await api.send(`/api/ejemplares/${x.ID}`, "PUT", payload);
    toast("Ejemplar actualizado");
    closeModal();
    render();
  };

  openModal("Editar ejemplar", `ID ${x.ID} — ${x.CODIGO_BARRAS}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delEjemplar(id) {
  if (!confirm("¿Eliminar ejemplar?")) return;
  await api.send(`/api/ejemplares/${id}`, "DELETE");
  toast("Ejemplar eliminado");
  render();
}

function selectField(label, name, options, selected) {
  const sel = h("select", { class: "input", name }, []);
  (options || []).forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.ID;
    opt.textContent = o.LABEL || o.NOMBRE || o.TITULO || `#${o.ID}`;
    if (selected && Number(selected) === Number(o.ID)) opt.selected = true;
    sel.appendChild(opt);
  });
  return h("div", { class: "field" }, [
    h("div", { class: "label" }, [label]),
    sel
  ]);
}

async function newPrestamo() {
  const users = await api.get("/api/select/usuarios");

  const form = h("div", {}, []);
  const top = h("div", { class: "form" }, [
    selectField("Usuario", "usuario_id", users.data),
    field("Observaciones", "observaciones", ""),
    field("Fecha vencimiento (YYYY-MM-DD HH:MM:SS)", "fecha_vencimiento", "", true),
    field("Código de barras (buscar y agregar)", "codigo", "", true)
  ]);

  const items = [];
  const list = h("div", { style: "margin-top:12px;" }, [
    h("div", { style: "font-weight:800;margin-bottom:6px;" }, ["Items del préstamo"]),
    h("div", { class: "muted", style: "margin-bottom:8px;" }, ["Agrega ejemplares disponibles por código de barras."]),
    h("div", { id: "itemsBox" }, [])
  ]);

  const refreshItems = () => {
    const box = list.querySelector("#itemsBox");
    box.innerHTML = "";
    if (!items.length) {
      box.appendChild(h("div", { class: "muted" }, ["—"]));
      return;
    }
    box.appendChild(
      table(
        ["Ejemplar ID", "Código", "Libro", "Acción"],
        items.map((it, idx) => [
          String(it.ejemplar_id),
          it.codigo,
          it.titulo,
          h("button", { class: "btn danger", onClick: () => { items.splice(idx,1); refreshItems(); } }, ["Quitar"])
        ])
      )
    );
  };

  const addByBarcode = async () => {
    const codigo = top.querySelector("input[name='codigo']").value.trim();
    if (!codigo) return;

    const r = await api.get(`/api/ejemplares/lookup?codigo=${encodeURIComponent(codigo)}`);
    const ej = r.data;
    if (ej.ESTADO !== "disponible") {
      alert("Ese ejemplar no está disponible.");
      return;
    }
    if (items.some(x => x.ejemplar_id === ej.ID)) {
      alert("Ya está agregado.");
      return;
    }
    items.push({ ejemplar_id: ej.ID, codigo: ej.CODIGO_BARRAS, titulo: ej.LIBRO_TITULO });
    top.querySelector("input[name='codigo']").value = "";
    refreshItems();
  };

  const addBtn = h("button", { class: "btn", onClick: addByBarcode }, ["Agregar ejemplar"]);
  top.appendChild(h("div", { class: "field full" }, [addBtn]));

  form.appendChild(top);
  form.appendChild(list);
  refreshItems();

  const save = async () => {
    const usuario_id = Number(top.querySelector("select[name='usuario_id']").value);
    const observaciones = top.querySelector("input[name='observaciones']").value.trim() || null;

    let fecha_vencimiento = top.querySelector("input[name='fecha_vencimiento']").value.trim();
    if (!fecha_vencimiento) {
      const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const pad = (n) => String(n).padStart(2, "0");
      fecha_vencimiento = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    }

    if (!items.length) {
      alert("Agrega al menos un ejemplar.");
      return;
    }

    await api.send("/api/prestamos", "POST", {
      usuario_id,
      observaciones,
      items: items.map((x) => ({ ejemplar_id: x.ejemplar_id, fecha_vencimiento }))
    });

    toast("Préstamo creado");
    closeModal();
    render();
  };

  openModal("Nuevo préstamo", "Circulación", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function newReserva() {
  const [users, libros] = await Promise.all([
    api.get("/api/select/usuarios"),
    api.get("/api/select/libros")
  ]);

  const form = h("div", { class: "form" }, [
    selectField("Usuario", "usuario_id", users.data),
    selectField("Libro", "libro_id", libros.data.map(x => ({ ID: x.ID, LABEL: x.TITULO }))),
    field("Expira en (opcional)", "expira_en", "")
  ]);

  const save = async () => {
    const payload = readForm(form);
    payload.usuario_id = Number(payload.usuario_id);
    payload.libro_id = Number(payload.libro_id);
    await api.send("/api/reservas", "POST", payload);
    toast("Reserva creada");
    closeModal();
    render();
  };

  openModal("Nueva reserva", "Reservas", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function cancelarReserva(id) {
  await api.send(`/api/reservas/${id}/cancelar`, "PUT", {});
  toast("Reserva cancelada");
  render();
}
async function cumplirReserva(id) {
  await api.send(`/api/reservas/${id}/cumplir`, "PUT", {});
  toast("Reserva cumplida");
  render();
}

render();