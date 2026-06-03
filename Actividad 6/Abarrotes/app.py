import os
import io
import sqlite3
import datetime
import atexit
import pandas as pd
from flask import Flask, render_template, request, jsonify, send_file
from apscheduler.schedulers.background import BackgroundScheduler

# --- CONFIGURACIÓN INICIAL ---
app = Flask(__name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

codigos_pendientes = []

# --- RUTAS DE INTERFAZ ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scanner')
def scanner_view():
    return render_template('scanner.html')

# --- RUTAS API (ESCÁNER Y COLA) ---
@app.route('/api/add_scan', methods=['POST'])
def add_scan():
    data = request.json
    codigo = data.get('codigo_barras')
    if codigo:
        codigos_pendientes.append(codigo)
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 400

@app.route('/api/get_scans', methods=['GET'])
def get_scans():
    if codigos_pendientes:
        codigo = codigos_pendientes.pop(0)
        return jsonify({"status": "success", "codigo": codigo})
    return jsonify({"status": "empty"})

@app.route('/scan', methods=['POST'])
def scan_barcode():
    codigo = str(request.json.get('codigo_barras', '')).strip()
    
    print(f"🔎 Buscando en DB: '{codigo}'") 

    conn = sqlite3.connect(os.path.join(BASE_DIR, 'pos_abarrotes.db'))
    cursor = conn.cursor()
    cursor.execute("SELECT nombre, precio, stock FROM productos WHERE codigo_barras = ?", (codigo,))
    producto = cursor.fetchone()
    conn.close()
    
    if producto:
        return jsonify({"status": "success", "producto": {"nombre": producto[0], "precio": producto[1], "stock": producto[2]}})
    
    print(f" No se encontró: {codigo}")
    return jsonify({"status": "not_found", "message": "Producto no registrado"}), 404

@app.route('/api/search_product', methods=['GET'])
def search_product():
    query = request.args.get('q', '').strip()
    
    # Si la búsqueda está vacía, no devolvemos nada
    if not query:
        return jsonify([])

    conn = sqlite3.connect(os.path.join(BASE_DIR, 'pos_abarrotes.db'))
    cursor = conn.cursor()
    cursor.execute('''
        SELECT codigo_barras, nombre, precio, stock 
        FROM productos 
        WHERE nombre LIKE ? OR codigo_barras = ?
        LIMIT 10
    ''', (f'%{query}%', query))
    
    resultados = cursor.fetchall()
    conn.close()
    productos = [{"codigo": r[0], "nombre": r[1], "precio": r[2], "stock": r[3]} for r in resultados]
    
    return jsonify(productos)

# --- RUTAS DE VENTA E INVENTARIO ---
@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.json
    carrito = data.get('carrito')
    total = data.get('total')
    
    if not carrito or total <= 0:
        return jsonify({"status": "error", "message": "El carrito está vacío"}), 400

    conn = sqlite3.connect(os.path.join(BASE_DIR, 'pos_abarrotes.db'))
    cursor = conn.cursor()
    
    try:
        cursor.execute("INSERT INTO ventas_diarias (total) VALUES (?)", (total,))
        venta_id = cursor.lastrowid
        
        for codigo, item in carrito.items():
            cantidad = item['cantidad']
            subtotal = item['precio'] * cantidad
            
            cursor.execute('''INSERT INTO detalle_ventas (venta_id, codigo_barras, cantidad, subtotal) 
                              VALUES (?, ?, ?, ?)''', (venta_id, codigo, cantidad, subtotal))
            
            cursor.execute("UPDATE productos SET stock = stock - ? WHERE codigo_barras = ?", (cantidad, codigo))
            
        conn.commit()
        exito = True
    except Exception as e:
        conn.rollback()
        exito = False
        error_msg = str(e)
    finally:
        conn.close()
    
    if exito:
        return jsonify({"status": "success", "message": "Venta completada con éxito"})
    else:
        return jsonify({"status": "error", "message": error_msg}), 500

@app.route('/api/upload_inventory', methods=['POST'])
def upload_inventory():
    for index, row in df.iterrows():
        raw_codigo = str(row['codigo_barras']).strip()
        if '.' in raw_codigo:
            codigo = raw_codigo.split('.')[0]
        else:
            codigo = raw_codigo
            
        nombre = row['nombre']
    
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No se adjuntó ningún archivo"}), 400
    
    file = request.files['file']
    provider_key = request.form.get('provider_key')

    if not provider_key:
        return jsonify({"status": "error", "message": "Se requiere la Key de seguridad del Proveedor"}), 400

    conn = sqlite3.connect(os.path.join(BASE_DIR, 'pos_abarrotes.db'))
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM proveedores WHERE key_acceso = ?", (provider_key,))
    proveedor = cursor.fetchone()

    if not proveedor:
        conn.close()
        return jsonify({"status": "error", "message": "Key inválida o proveedor no existe"}), 403
    
    proveedor_id = proveedor[0]

    try:
        df = pd.read_excel(file, dtype={'codigo_barras': str})
        
        for index, row in df.iterrows():
            codigo = str(row['codigo_barras']).strip()
            nombre = row['nombre']
            nuevo_precio = float(row['precio'])
            cantidad_surtida = int(row['cantidad_surtida'])

            cursor.execute("SELECT stock FROM productos WHERE codigo_barras = ?", (codigo,))
            producto_existente = cursor.fetchone()

            if producto_existente:
                cursor.execute('''
                    UPDATE productos 
                    SET stock = stock + ?, precio = ? 
                    WHERE codigo_barras = ?
                ''', (cantidad_surtida, nuevo_precio, codigo))
            else:
                cursor.execute('''
                    INSERT INTO productos (codigo_barras, nombre, precio, stock, proveedor_id) 
                    VALUES (?, ?, ?, ?, ?)
                ''', (codigo, nombre, nuevo_precio, cantidad_surtida, proveedor_id))
        
        conn.commit()
        exito = True
    except Exception as e:
        conn.rollback()
        exito = False
        error_msg = str(e)
    finally:
        conn.close()

    if exito:
        return jsonify({"status": "success", "message": "Inventario procesado exitosamente."})
    else:
        return jsonify({"status": "error", "message": f"Error procesando el Excel: {error_msg}"}), 500

@app.route('/api/update_price', methods=['POST'])
def update_price():
    data = request.json
    codigo = data.get('codigo_barras')
    nuevo_precio = data.get('nuevo_precio')
    admin_key = data.get('admin_key')

    if not codigo or not nuevo_precio or not admin_key:
        return jsonify({"status": "error", "message": "Faltan datos en el formulario."}), 400

    if admin_key != "ADMIN-POS-2026":
        return jsonify({"status": "error", "message": "Credenciales de Administrador inválidas."}), 403

    conn = sqlite3.connect(os.path.join(BASE_DIR, 'pos_abarrotes.db'))
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT nombre FROM productos WHERE codigo_barras = ?", (codigo,))
        producto = cursor.fetchone()
        
        if not producto:
            conn.close()
            return jsonify({"status": "error", "message": "El código de barras no está registrado."}), 404
        
        cursor.execute("UPDATE productos SET precio = ? WHERE codigo_barras = ?", (float(nuevo_precio), codigo))
        conn.commit()
        exito = True
        nombre_prod = producto[0]
    except Exception as e:
        conn.rollback()
        exito = False
        error_msg = str(e)
    finally:
        conn.close()

    if exito:
        return jsonify({"status": "success", "message": f"Precio de '{nombre_prod}' actualizado a ${float(nuevo_precio):.2f}"})
    else:
        return jsonify({"status": "error", "message": f"Error en BD: {error_msg}"}), 500

# --- LÓGICA DE REPORTES ---
@app.route('/api/generate_report', methods=['GET'])
def generate_report():
    conn = sqlite3.connect(os.path.join(BASE_DIR, 'pos_abarrotes.db'))
    query = '''
        SELECT 
            pr.nombre AS "Proveedor",
            p.nombre AS "Producto",
            SUM(dv.cantidad) AS "Cantidad Vendida",
            SUM(dv.subtotal) AS "Monto Total ($)"
        FROM detalle_ventas dv
        JOIN productos p ON dv.codigo_barras = p.codigo_barras
        JOIN proveedores pr ON p.proveedor_id = pr.id
        JOIN ventas_diarias vd ON dv.venta_id = vd.id
        WHERE DATE(vd.fecha_hora) = DATE('now', 'localtime')
        GROUP BY pr.nombre, p.nombre
        ORDER BY pr.nombre, p.nombre
    '''
    
    try:
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            return jsonify({"status": "error", "message": "No hay ventas registradas el día de hoy."}), 404
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Corte de Caja')
        
        output.seek(0)
        return send_file(
            output,
            as_attachment=True,
            download_name='corte_de_caja_hoy.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

def guardar_reporte_automatico():
    """Función programada para el cierre de caja a las 23:59"""
    print(f"[{datetime.datetime.now()}] Iniciando cierre de caja automático...")
    conn = sqlite3.connect(os.path.join(BASE_DIR, 'pos_abarrotes.db'))
    query = '''
        SELECT 
            pr.nombre AS "Proveedor",
            p.nombre AS "Producto",
            SUM(dv.cantidad) AS "Cantidad Vendida",
            SUM(dv.subtotal) AS "Monto Total ($)"
        FROM detalle_ventas dv
        JOIN productos p ON dv.codigo_barras = p.codigo_barras
        JOIN proveedores pr ON p.proveedor_id = pr.id
        JOIN ventas_diarias vd ON dv.venta_id = vd.id
        WHERE DATE(vd.fecha_hora) = DATE('now', 'localtime')
        GROUP BY pr.nombre, p.nombre
    '''
    
    try:
        df = pd.read_sql_query(query, conn)
        if not df.empty:
            reportes_dir = os.path.join(BASE_DIR, 'reportes_diarios')
            if not os.path.exists(reportes_dir):
                os.makedirs(reportes_dir)
                
            fecha_hoy = datetime.datetime.now().strftime("%Y-%m-%d")
            ruta_archivo = os.path.join(reportes_dir, f'cierre_{fecha_hoy}.xlsx')
            
            df.to_excel(ruta_archivo, index=False, engine='openpyxl')
            print(f" Reporte automático guardado en: {ruta_archivo}")
        else:
            print(" No hubo ventas hoy, no se generó reporte.")
    except Exception as e:
        print(f" Error en reporte automático: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        scheduler = BackgroundScheduler()
        scheduler.add_job(func=guardar_reporte_automatico, trigger="cron", hour=23, minute=59)
        scheduler.start()
        atexit.register(lambda: scheduler.shutdown())
        
    app.run(host='0.0.0.0', port=3000, ssl_context='adhoc', debug=True)