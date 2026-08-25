import { useState } from 'react';
import { api } from '../api/client';

export default function Login({ onLoginExitoso }) {
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    async function manejarSubmit(evento) {
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
        onLoginExitoso({ usuario: datos.usuario, rol: datos.rol });
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

            <form onSubmit={manejarSubmit}>
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

            <p className="login-aviso">Sistema exclusivo para uso institucional</p>
        </div>
        </div>
    );
}
