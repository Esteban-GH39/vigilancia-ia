import { useState } from 'react';
import { api } from '../api/client';

export default function Login({ onLoginExitoso }) {
    const [modo, setModo] = useState('login'); // 'login' | 'registro'

    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [nombre, setNombre] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');

    const [error, setError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');
    const [cargando, setCargando] = useState(false);

    function cambiarModo(nuevoModo) {
        setModo(nuevoModo);
        setError('');
        setMensajeExito('');
    }

    async function manejarLogin(evento) {
        evento.preventDefault();
        if (!usuario.trim() || !contrasena.trim()) {
            setError('Por favor completa todos los campos.');
            return;
        }

        setCargando(true);
        setError('');
        try {
            const datos = await api.login(usuario, contrasena);
            sessionStorage.setItem('token', datos.token);
            onLoginExitoso({ usuario: datos.usuario, rol: datos.rol, nombre: datos.nombre });
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    async function manejarRegistro(evento) {
        evento.preventDefault();
        setError('');

        if (!usuario.trim() || !nombre.trim() || !contrasena.trim()) {
            setError('Por favor completa todos los campos.');
            return;
        }
        if (contrasena !== confirmarContrasena) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (contrasena.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setCargando(true);
        try {
            const datos = await api.registro(usuario, nombre, contrasena);
            setMensajeExito(datos.mensaje);
            setUsuario('');
            setContrasena('');
            setConfirmarContrasena('');
            setNombre('');
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="login-screen">
        <div className="login-box">
            <div className="login-logo">🛡️</div>
            <h2>Sistema de Vigilancia IA</h2>
            <p className="login-sub">Universidad Central — Acceso Institucional</p>

            {modo === 'login' ? (
                <form onSubmit={manejarLogin}>
                    <div className="login-field">
                        <label htmlFor="login-user">Usuario</label>
                        <input
                            id="login-user"
                            type="text"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            placeholder="Ingrese su usuario"
                            autoComplete="username"
                        />
                    </div>
                    <div className="login-field">
                        <label htmlFor="login-pass">Contraseña</label>
                        <input
                            id="login-pass"
                            type="password"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            placeholder="Ingrese su contraseña"
                            autoComplete="current-password"
                        />
                    </div>
                    <button type="submit" className="btn-login" disabled={cargando}>
                        {cargando ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                    {error && <p className="login-error">{error}</p>}
                </form>
            ) : (
                <form onSubmit={manejarRegistro}>
                    <div className="login-field">
                        <label htmlFor="reg-nombre">Nombre completo</label>
                        <input
                            id="reg-nombre"
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Tu nombre completo"
                        />
                    </div>
                    <div className="login-field">
                        <label htmlFor="reg-user">Usuario</label>
                        <input
                            id="reg-user"
                            type="text"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            placeholder="Elige un nombre de usuario"
                            autoComplete="username"
                        />
                    </div>
                    <div className="login-field">
                        <label htmlFor="reg-pass">Contraseña</label>
                        <input
                            id="reg-pass"
                            type="password"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="login-field">
                        <label htmlFor="reg-pass-confirm">Confirmar contraseña</label>
                        <input
                            id="reg-pass-confirm"
                            type="password"
                            value={confirmarContrasena}
                            onChange={(e) => setConfirmarContrasena(e.target.value)}
                            placeholder="Repite la contraseña"
                            autoComplete="new-password"
                        />
                    </div>
                    <button type="submit" className="btn-login" disabled={cargando}>
                        {cargando ? 'Enviando...' : 'Solicitar acceso'}
                    </button>
                    {error && <p className="login-error">{error}</p>}
                    {mensajeExito && <p className="login-exito">{mensajeExito}</p>}
                </form>
            )}

            <button className="login-toggle-modo" onClick={() => cambiarModo(modo === 'login' ? 'registro' : 'login')}>
                {modo === 'login' ? '¿No tienes cuenta? Solicitar acceso' : '¿Ya tienes cuenta? Iniciar sesión'}
            </button>

            <p className="login-aviso">
                {modo === 'login'
                    ? 'Sistema exclusivo para uso institucional'
                    : 'Tu cuenta debe ser aprobada por un administrador antes de poder ingresar'}
            </p>
        </div>
        </div>
    );
}
