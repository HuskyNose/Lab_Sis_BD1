from database import get_db_connection

def inyectar_proveedores():
    proveedores = [
        ('Coca Cola', 'PROV-COCA-001'),
        ('Marinela', 'PROV-MARI-002'),
        ('Barcel', 'PROV-BARC-003')
    ]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.executemany("INSERT OR IGNORE INTO proveedores (nombre, key_acceso) VALUES (?, ?)", proveedores)
        conn.commit()
        print("✅ Proveedores Coca Cola, Marinela y Barcel registrados con éxito.")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    inyectar_proveedores()