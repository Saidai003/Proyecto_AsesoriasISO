import React from 'react';

const Notificaciones = () => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);

  const clearAll = () => {
    if (window.confirm('¿Seguro que quieres borrar todas las notificaciones?')) {
      setNotifications([]);
    }
  };

  return (
    <div className="fixed top-0 right-0 z-50 w-48 h-48 bg-white border rounded shadow-lg">
      {showNotifications && (
        <div className="p-2 space-y-1">
          {notifications.map((n, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-1 rounded-full ${n.type === 'success' ? 'bg-green-500 text-white' : n.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'} transition-colors duration-300 hover:bg-slate-950`}
            >
              <span className="text-sm">{n.message}</span>
              <button
                onClick={() => setNotifications(notifications.filter((_, j) => j !== i))}
                className="text-xs text-white"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {showNotifications && (
        <button
          onClick={clearAll}
          className="px-3 py-1 rounded bg-slate-900 text-white hover:bg-slate-950"
        >
          Borrar Notificaciones
        </button>
      )}
    </div>
  );
};

export default Notificaciones;