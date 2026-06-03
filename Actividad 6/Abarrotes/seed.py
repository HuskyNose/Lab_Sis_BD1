from database import get_db_connection

def poblar_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Insertamos proveedores de prueba
    proveedores = [
        (1, 'Coca-Cola FEMSA', 'PROV-COCA-001'),
        (2, 'Sabritas S.A. de C.V.', 'PROV-SABR-002'),
        (3, 'Grupo Bimbo', 'PROV-BIMB-003')
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO proveedores (id, nombre, key_acceso) 
        VALUES (?, ?, ?)
    ''', proveedores)
    
    # 2. Insertamos productos de prueba variados
    productos = [
        ('1234567890', 'Coca-Cola 600ml', 18.50, 24, 1),
        ('7501011167332', 'Cheetos Torciditos 52g', 15.00, 10, 2),
        ('7501030460924', 'Pan Blanco Bimbo Grande', 45.00, 8, 3),
        ('7501000111201', 'Leche Alpura Clásica 1L', 26.50, 15, None)
    ]
    
    cursor.executemany('''
        INSERT OR REPLACE INTO productos (codigo_barras, nombre, precio, stock, proveedor_id) 
        VALUES (?, ?, ?, ?, ?)
    ''', productos)
    
    conn.commit()
    conn.close()
    print(" Datos de prueba inyectados correctamente en la base de datos oficial.")

if __name__ == '__main__':
    poblar_db()