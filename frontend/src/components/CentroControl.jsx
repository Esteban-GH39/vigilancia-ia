import { useEffect, useState } from 'react';
import { api } from '../api/client';

function tiempoRelativo(fechaIso) {
    const diferenciaMs = Date.now() - new Date(fechaIso).getTime();
    const minutos = Math.max(0, Math.floor(diferenciaMs / 60000));
    if (minutos < 1) return 'justo ahora';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    return `hace ${Math.floor(horas / 24)} d`;
}

export default function CentroControl() {
    const [resumen, setResumen] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let activo = true;

        function cargar() {
            api.resumenControl()
                .then((datos) => { if (activo) { setResumen(datos); setError(null); } })
                .catch((err) => { if (activo) setError(err.message); })
                .finally(() => { if (activo) setCargando(false); });
        }

        cargar();
        const intervalo = setInterval(cargar, 15000);
        return () => { activo = false; clearInterval(intervalo); };
    }, []);

    if (cargando) {
        return (
            <div>
                <div className="dashboard-toolbar">
                    <h2>Centro de Control Estratégico</h2>
                </div>
                <div className="mapa-contenedor mapa-contenedor-vacio" style={{ height: '200px' }}>
                    <span className="spinner-conexion" />
                    <span>Cargando panorama operativo…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="estado-vacio">
                <span className="estado-vacio-icono">⚠️</span>
                <p>No se pudo cargar el Centro de Control: {error}</p>
            </div>
        );
    }

    const { camaras, alertas_24h: alertas24h, casos, serie_horaria: serieHoraria, ranking_localidades: ranking, ultimas_alertas: ultimasAlertas } = resumen;
    const maximoHora = Math.max(...serieHoraria.map((h) => h.cantidad), 1);
    const maximoRanking = Math.max(...ranking.map((r) => r.eventos), 1);

    return (
        <div>
            <div className="dashboard-toolbar">
                <h2>Centro de Control Estratégico</h2>
                <span className="mapa-nota">Vista consolidada del sistema · se actualiza cada 15s</span>
            </div>

            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-valor">{camaras.activas}/{camaras.total}</span>
                    <span className="kpi-etiqueta">Cámaras activas</span>
                </div>
                <div className="kpi-card kpi-card-alto">
                    <span className="kpi-valor">{alertas24h}</span>
                    <span className="kpi-etiqueta">Alertas últimas 24h</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-valor">{casos.pendientes}</span>
                    <span className="kpi-etiqueta">Casos pendientes</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-valor">{casos.resueltos}/{casos.total}</span>
                    <span className="kpi-etiqueta">Casos resueltos</span>
                </div>
            </div>

            <div className="centro-control-layout">
                <div className="mapa-tarjeta">
                    <h3>Actividad últimas 24 horas</h3>
                    {alertas24h === 0 ? (
                        <p className="mapa-nota">Sin eventos en las últimas 24 horas.</p>
                    ) : (
                        <div className="grafico-barras">
                            {serieHoraria.map((punto) => (
                                <div className="grafico-barra-col" key={punto.hora} title={`${punto.hora} · ${punto.cantidad} evento(s)`}>
                                    <div
                                        className="grafico-barra"
                                        style={{ height: `${Math.max((punto.cantidad / maximoHora) * 100, punto.cantidad > 0 ? 6 : 2)}%` }}
                                    />
                                    <span className="grafico-barra-etiqueta">{punto.hora.slice(0, 2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="ranking-localidades">
                    <h3>Localidades prioritarias</h3>
                    {ranking.length === 0 ? (
                        <p className="mapa-nota">Aún sin eventos suficientes para priorizar.</p>
                    ) : (
                        <div className="ranking-lista">
                            {ranking.map((loc, indice) => (
                                <div key={loc.nombre} className="ranking-fila">
                                    <span className="ranking-posicion">#{indice + 1}</span>
                                    <div className="ranking-info">
                                        <div className="ranking-nombre">{loc.nombre}</div>
                                        <div className="ranking-barra-track">
                                            <div
                                                className="ranking-barra-relleno"
                                                style={{ width: `${(loc.eventos / maximoRanking) * 100}%`, background: '#3b82f6' }}
                                            />
                                        </div>
                                    </div>
                                    <span className="ranking-valor">{loc.eventos}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="feed-alertas">
                <h3>Últimas alertas</h3>
                {ultimasAlertas.length === 0 ? (
                    <p className="tarjeta-camara-espera">No hay alertas registradas todavía.</p>
                ) : (
                    <ul className="feed-alertas-lista">
                        {ultimasAlertas.map((alerta) => (
                            <li key={alerta.id} className="feed-alertas-item">
                                <span className={`etiqueta-riesgo etiqueta-${alerta.nivel_riesgo?.toLowerCase()}`}>
                                    {alerta.nivel_riesgo}
                                </span>
                                <div className="feed-alertas-texto">
                                    <strong>{alerta.tipo_evento || 'Evento'}</strong> en {alerta.ubicacion || 'ubicación desconocida'}
                                    <span className="feed-alertas-descripcion">{alerta.descripcion}</span>
                                </div>
                                <span className="feed-alertas-tiempo">{tiempoRelativo(alerta.marca_tiempo)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
