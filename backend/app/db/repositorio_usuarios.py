from passlib.hash import bcrypt
from app.db.base_datos import FabricaSesion
from app.db.modelos_usuario import Usuario, ROLES_VALIDOS, ESTADOS_VALIDOS


def crear_usuario(usuario, nombre, contrasena, rol="visualizador", estado="pendiente"):
    sesion = FabricaSesion()
    try:
        if sesion.query(Usuario).filter(Usuario.usuario == usuario.lower()).first():
            raise ValueError("Ya existe un usuario con ese nombre")

        nuevo = Usuario(
            usuario=usuario.lower(),
            nombre=nombre,
            contrasena_hash=bcrypt.hash(contrasena),
            rol=rol,
            estado=estado,
        )
        sesion.add(nuevo)
        sesion.commit()
        sesion.refresh(nuevo)
        return nuevo.a_diccionario()
    finally:
        sesion.close()


def verificar_credenciales(usuario, contrasena):
    sesion = FabricaSesion()
    try:
        registro = sesion.query(Usuario).filter(Usuario.usuario == usuario.lower()).first()
        if registro is None or not bcrypt.verify(contrasena, registro.contrasena_hash):
            return None
        return registro.a_diccionario()
    finally:
        sesion.close()


def listar_usuarios():
    sesion = FabricaSesion()
    try:
        return [u.a_diccionario() for u in sesion.query(Usuario).order_by(Usuario.fecha_creacion.desc()).all()]
    finally:
        sesion.close()


def contar_admins_aprobados(excluir_id=None):
    sesion = FabricaSesion()
    try:
        consulta = sesion.query(Usuario).filter(Usuario.rol == "admin", Usuario.estado == "aprobado")
        if excluir_id is not None:
            consulta = consulta.filter(Usuario.id != excluir_id)
        return consulta.count()
    finally:
        sesion.close()


def actualizar_estado_usuario(id_usuario, nuevo_estado):
    if nuevo_estado not in ESTADOS_VALIDOS:
        raise ValueError(f"Estado inválido: {nuevo_estado}")

    sesion = FabricaSesion()
    try:
        registro = sesion.query(Usuario).filter(Usuario.id == id_usuario).first()
        if registro is None:
            return None

        if registro.rol == "admin" and nuevo_estado != "aprobado":
            if contar_admins_aprobados(excluir_id=id_usuario) == 0:
                raise ValueError("No puedes dejar el sistema sin ningún administrador aprobado")

        registro.estado = nuevo_estado
        sesion.commit()
        sesion.refresh(registro)
        return registro.a_diccionario()
    finally:
        sesion.close()


def actualizar_rol_usuario(id_usuario, nuevo_rol):
    if nuevo_rol not in ROLES_VALIDOS:
        raise ValueError(f"Rol inválido: {nuevo_rol}")

    sesion = FabricaSesion()
    try:
        registro = sesion.query(Usuario).filter(Usuario.id == id_usuario).first()
        if registro is None:
            return None

        if registro.rol == "admin" and nuevo_rol != "admin":
            if contar_admins_aprobados(excluir_id=id_usuario) == 0:
                raise ValueError("No puedes dejar el sistema sin ningún administrador aprobado")

        registro.rol = nuevo_rol
        sesion.commit()
        sesion.refresh(registro)
        return registro.a_diccionario()
    finally:
        sesion.close()


def asegurar_admin_inicial():
    sesion = FabricaSesion()
    try:
        if sesion.query(Usuario).count() > 0:
            return
    finally:
        sesion.close()

    crear_usuario("admin", "Administrador del sistema", "admin123", rol="admin", estado="aprobado")
    print("⚠ Usuario admin creado por defecto -> usuario: admin | contraseña: admin123 (cámbiala pronto)")
