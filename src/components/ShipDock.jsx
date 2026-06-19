import { memo } from 'react';
import { SHIP_TYPES } from '../logic/constants';
import './ShipDock.css';

/**
 * ShipDock — displays ships with tactical wireframe icons and a single shared rotate button.
 *
 * Props:
 *  - ships: Ship[]
 *  - selectedShipId: string | null
 *  - onSelectShip: (shipId) => void
 *  - onRotateShip: (shipId) => void
 */
const ShipDock = memo(function ShipDock({
  ships,
  selectedShipId,
  onSelectShip,
  onRotateShip,
}) {
  const unplacedShips = ships.filter((s) => s.positions.length === 0);
  const selectedShip = ships.find((s) => s.id === selectedShipId);

  if (unplacedShips.length === 0) {
    return (
      <div className="ship-dock ship-dock--empty">
        <div className="ship-dock__header">FLEET DEPLOYED</div>
        <p className="ship-dock__empty-text">All ships positioned. Ready for battle.</p>
      </div>
    );
  }

  return (
    <div className="ship-dock">
      <div className="ship-dock__header">
        <span>NAVAL ASSETS</span>
        <span className="ship-dock__count">{unplacedShips.length}/{SHIP_TYPES.length}</span>
      </div>

      <div className="ship-dock__ships">
        {ships.map((ship) => (
          <ShipCard
            key={ship.id}
            ship={ship}
            isSelected={selectedShipId === ship.id}
            isPlaced={ship.positions.length > 0}
            onSelect={() => onSelectShip(ship.id)}
          />
        ))}
      </div>

      {/* Single shared rotate button — applies to the currently selected ship */}
      <button
        className="btn ship-dock__rotate-btn"
        disabled={!selectedShipId || !selectedShip || selectedShip.positions.length > 0}
        onClick={() => {
          if (selectedShipId) onRotateShip(selectedShipId);
        }}
        title="Rotate selected ship (or press R / right-click board)"
      >
        ↻ Rotate ({selectedShip?.orientation === 'v' ? 'V' : 'H'})
      </button>
    </div>
  );
});

function ShipCard({ ship, isSelected, isPlaced, onSelect }) {
  const orient = ship.orientation || 'h';

  return (
    <div
      className={`ship-card ${isSelected ? 'ship-card--selected' : ''} ${isPlaced ? 'ship-card--placed' : ''}`}
      onClick={() => { if (!isPlaced) onSelect(); }}
    >
      <div className="ship-card__info">
        <span className="ship-card__name">{ship.name}</span>
        <span className="ship-card__length">{ship.length} cells</span>
        <span className="ship-card__orient">{orient === 'h' ? '═══' : '║'}</span>
      </div>

      <div className="ship-card__visual">
        <ShipWireframe
          length={ship.length}
          orientation={orient}
          color={isSelected ? '#00E5FF' : '#00BCD4'}
          glow={isSelected}
        />
      </div>

      {isPlaced && <span className="ship-card__placed-badge">✓</span>}
    </div>
  );
}

/**
 * Draw a tactical wireframe ship as an inline SVG.
 */
/** Fixed viewport area for ship wireframes (max ship = Carrier 5×22+10=120). */
const WIRE_VIEW = 130;
const WIRE_VIEW_H = 40;

function ShipWireframe({ length, orientation, color, glow }) {
  const cell = 20;
  const gap = 2;
  const step = cell + gap; // 22
  const isH = orientation === 'h';

  // Compute the ship's natural bounding box centered in the fixed viewport
  const shipLong = length * step - gap; // long axis length in px
  const shipShort = cell;               // short axis length in px
  const longPx = isH ? shipLong : shipShort;
  const shortPx = isH ? shipShort : shipLong;
  const ox = (WIRE_VIEW - longPx) / 2;
  const oy = (WIRE_VIEW_H - shortPx) / 2;

  const segments = [];
  for (let i = 0; i < length; i++) {
    const cx = ox + (isH ? i * step : (shipShort - 14) / 2);
    const cy = oy + (isH ? (shipShort - 14) / 2 : i * step);
    segments.push(
      <rect
        key={i}
        x={cx}
        y={cy}
        width={14}
        height={14}
        rx={3}
        fill={color}
        opacity={0.5}
        stroke={color}
        strokeWidth={1}
      />
    );
  }

  // Center line
  const midX = ox + longPx / 2;
  const midY = oy + shortPx / 2;
  const lineX1 = isH ? ox + 7 : midX + 7;
  const lineY1 = isH ? midY + 7 : oy + 7;
  const lineX2 = isH ? ox + longPx - 7 : midX + 7;
  const lineY2 = isH ? midY + 7 : oy + shortPx - 7;

  return (
    <svg
      width={WIRE_VIEW}
      height={WIRE_VIEW_H}
      viewBox={`0 0 ${WIRE_VIEW} ${WIRE_VIEW_H}`}
      style={{ filter: glow ? `drop-shadow(0 0 6px ${color})` : 'none' }}
      className="ship-wireframe"
    >
      {segments}
      <line x1={lineX1} y1={lineY1} x2={lineX2} y2={lineY2} stroke={color} strokeWidth={1.5} opacity={0.6} />
    </svg>
  );
}

export default ShipDock;
