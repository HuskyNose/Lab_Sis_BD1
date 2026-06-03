import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'pos_abarrotes.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)

    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tabla Proveedores
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS proveedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            key_acceso TEXT UNIQUE NOT NULL
        )
    ''')
    
    # Tabla Productos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS productos (
            codigo_barras TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            precio REAL NOT NULL,
            stock INTEGER NOT NULL,
            proveedor_id INTEGER,
            FOREIGN KEY(proveedor_id) REFERENCES proveedores(id)
        )
    ''')
    
    # Tabla Registro de Ventas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ventas_diarias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total REAL NOT NULL
        )
    ''')

    # Tabla Detalle de Ventas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS detalle_ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_id INTEGER,
            codigo_barras TEXT,
            cantidad INTEGER,
            subtotal REAL,
            FOREIGN KEY(venta_id) REFERENCES ventas_diarias(id)
        )
    ''')

    conn.commit()
    conn.close()
    print(f" Base de datos sincronizada correctamente en: {DB_PATH}")

if __name__ == '__main__':
    init_db()