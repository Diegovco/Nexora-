import os

dbconn = None


# ------------------------------------------------------------------
# Lee el archivo API/.env (si existe) y guarda sus valores.
# Cada línea tiene la forma NOMBRE=valor. Las líneas con # se ignoran.
# El .env NO se sube a GitHub: cada integrante tiene el suyo.
# ------------------------------------------------------------------
def fnLeerEnv():
    strRuta = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    if not os.path.exists(strRuta):
        return
    with open(strRuta, encoding="utf-8") as archivo:
        for strLinea in archivo:
            strLinea = strLinea.strip()
            if strLinea == "" or strLinea.startswith("#") or "=" not in strLinea:
                continue
            strNombre, strValor = strLinea.split("=", 1)
            # Si ya existe como variable del sistema (por ejemplo en el servidor), se respeta
            if strNombre.strip() not in os.environ:
                os.environ[strNombre.strip()] = strValor.strip()


fnLeerEnv()

# MongoDB Server (si no hay MONGO_URI en el .env, se usa el MongoDB local)
strConnection = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
# Nombre de la base de datos (se define en API/.env con MONGO_DB)
strBDConnection = os.environ.get("MONGO_DB", "dbNexora")

# Clave para crear cuentas de administrador (se define en API/.env)
strClaveAdmin = os.environ.get("CLAVE_ADMIN", "")
