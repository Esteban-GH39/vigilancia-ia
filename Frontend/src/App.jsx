import { useState } from "react";
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import 'styles.css';

export default function App() {
    
    const [sesion, setSesion] = useState(null);

    function cerrarSesion() {
        sessionStorage.removeItem('token');
        setSesion(null);
    }

    if (!sesion) {
        return <Login onLoginExitoso={setSesion} />
    }

    return <Dashboard sesion={sesion} onCerrarSesion={cerrarSesion} />;

}