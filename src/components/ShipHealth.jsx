import { memo } from 'react';
import './ShipHealth.css';

const ShipHealth = memo(function ShipHealth({ ships = [], label = '' }) {
  return (
    <div className="ship-health">
      {label && <div className="ship-health__header">{label}</div>}
      <div className="ship-health__bars">
        {ships.map((ship) => {
          const healthPercent = ship.sunk
            ? 0
            : Math.round(((ship.length - ship.hits) / ship.length) * 100);
          const damagePercent = Math.round((ship.hits / ship.length) * 100);

          return (
            <div
              key={ship.id}
              className={`ship-health__item ${ship.sunk ? 'ship-health__item--sunk' : ''}`}
            >
              <div className="ship-health__info">
                <span className="ship-health__name">{ship.name}</span>
                <span className="ship-health__status">
                  {ship.sunk ? '☠ SUNK' : `${ship.hits}/${ship.length}`}
                </span>
              </div>
              <div className="ship-health__bar-track">
                <div
                  className={`ship-health__bar-fill ${ship.sunk ? 'ship-health__bar-fill--sunk' : ''}`}
                  style={{ width: `${healthPercent}%` }}
                />
                <div
                  className="ship-health__bar-damage"
                  style={{ width: `${damagePercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ShipHealth;
