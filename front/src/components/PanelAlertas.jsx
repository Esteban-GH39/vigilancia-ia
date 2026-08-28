import { useAlertas } from '../hooks/useAlertas';

export default function PanelAlertas({ idCamara, activo }) {
    const alertas = useAlertas(idCamara, activo);

    return (
        <div className="panel-alertas">
        <h3>Alertas activas</h3>
        {alertas.length === 0 ? (
            <p className="panel-alertas-vacio">Esperando alertas…</p>
        ) : (
            <ul>
            {alertas.map((alerta, indice) => (
                <li key={indice} className={`alerta alerta-${alerta.nivel_riesgo?.toLowerCase()}`}>
                <strong>{alerta.nivel_riesgo}</strong>
                <span>{alerta.descripcion}</span>
                </li>
            ))}
            </ul>
        )}
        </div>
    );
}
