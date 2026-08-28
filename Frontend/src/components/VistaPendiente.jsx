export default function VistaPendiente({ titulo, icono, sprintSugerido }) {
    return (
        <div className="vista-pendiente">
        <div className="vista-pendiente-icono">{icono}</div>
        <h2>{titulo}</h2>
        <p>Este módulo todavía no está implementado en el frontend nuevo.</p>
        {sprintSugerido && (
            <p className="vista-pendiente-sprint">Backlog: {sprintSugerido}</p>
        )}
        </div>
    );
}
