import { useEffect, useState } from 'react';
import { api } from '../api/client';

const ROLES = [
    { id: 'admin', etiqueta: 'Administrador' },
    { id: 'operador', etiqueta: 'Operador' },
    { id: 'visualizador', etiqueta: 'Visualizador' },
];

const ESTADO_INFO = {
    pendiente: { etiqueta: 'Pendiente', clase: 'usuario-estado-pendiente' },
    aprobado: { etiqueta: 'Aprobado', clase: 'usuario-estado-aprobado' },
    rechazado: { etiqueta: 'Rechazado', clase: 'usuario-estado-rechazado' },
};

export default function GestionUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [filtro, setFiltro] = useState('todos');

    useEffect(() => {
        cargar();
    }, []);

    async function cargar() {
        setCargando(true);
        try {
            const datos = await api.listarUsuarios();
            setUsuarios(datos);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    async function cambiarEstado(idUsuario, nuevoEstado) {
        const anteriores = usuarios;
        setUsuarios((prev) => prev.map((u) => (u.id === idUsuario ? { ...u, estado: nuevoEstado } : u)));
        try {
            await api.actualizarEstadoUsuario(idUsuario, nuevoEstado);
        } catch (err) {
            setUsuarios(anteriores);
            setError(err.message);
        }
    }

    async function cambiarRol(idUsuario, nuevoRol) {
        const anteriores = usuarios;
        setUsuarios((prev) => prev.map((u) => (u.id === idUsuario ? { ...u, rol: nuevoRol } : u)));
        try {
            await api.actualizarRolUsuario(idUsuario, nuevoRol);
        } catch (err) {
            setUsuarios(anteriores);
            setError(err.message);
        }
    }

    const pendientes = usuarios.filter((u) => u.estado === 'pendiente');
    const usuariosFiltrados = filtro === 'todos' ? usuarios : usuarios.filter((u) => u.estado === filtro);

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Gestión de Usuarios {pendientes.length > 0 && <span className="badge-pendientes">{pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'}</span>}</h2>
                <button className="btn-mini" onClick={cargar}>↻ Actualizar</button>
            </div>

            <div className="bitacora-filtros">
                {['todos', 'pendiente', 'aprobado', 'rechazado'].map((estado) => (
                    <button
                        key={estado}
                        className={`btn-mini ${filtro === estado ? 'btn-mini-activo' : ''}`}
                        onClick={() => setFiltro(estado)}
                    >
                        {estado === 'todos' ? 'Todos' : ESTADO_INFO[estado].etiqueta}
                    </button>
                ))}
            </div>

            {error && <p className="centro-control-error">{error}</p>}

            {cargando ? (
                <p className="panel-alertas-vacio">Cargando usuarios…</p>
            ) : usuariosFiltrados.length === 0 ? (
                <div className="estado-vacio">
                    <span className="estado-vacio-icono">👥</span>
                    <p>No hay usuarios con este filtro.</p>
                </div>
            ) : (
                <table className="tabla-usuarios">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuariosFiltrados.map((u) => (
                            <tr key={u.id}>
                                <td className="tabla-usuarios-usuario">{u.usuario}</td>
                                <td>{u.nombre}</td>
                                <td>
                                    <span className={`usuario-estado-badge ${ESTADO_INFO[u.estado].clase}`}>
                                        {ESTADO_INFO[u.estado].etiqueta}
                                    </span>
                                </td>
                                <td>
                                    <select
                                        value={u.rol}
                                        onChange={(e) => cambiarRol(u.id, e.target.value)}
                                        disabled={u.estado !== 'aprobado'}
                                    >
                                        {ROLES.map((rol) => (
                                            <option key={rol.id} value={rol.id}>{rol.etiqueta}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    {u.estado === 'pendiente' ? (
                                        <div className="tabla-usuarios-acciones">
                                            <button className="btn-mini" onClick={() => cambiarEstado(u.id, 'aprobado')}>
                                                ✅ Aprobar
                                            </button>
                                            <button className="btn-mini btn-mini-peligro" onClick={() => cambiarEstado(u.id, 'rechazado')}>
                                                ✕ Rechazar
                                            </button>
                                        </div>
                                    ) : u.estado === 'aprobado' ? (
                                        <button className="btn-mini btn-mini-peligro" onClick={() => cambiarEstado(u.id, 'rechazado')}>
                                            Revocar acceso
                                        </button>
                                    ) : (
                                        <button className="btn-mini" onClick={() => cambiarEstado(u.id, 'aprobado')}>
                                            Reactivar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
