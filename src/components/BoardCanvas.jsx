import { useRef, useEffect, useCallback, memo, useState } from 'react';
import { GRID_SIZE, CELL_STATUS } from '../logic/constants';
import './BoardCanvas.css';

// Canvas cell size constants
const CELL_SIZE = 42;
const CELL_GAP = 1;
const PADDING = 2;
const COORD_LABEL_WIDTH = 20;

/**
 * BoardCanvas — renders a single game board with full canvas animations.
 *
 * Props:
 *  - board: 2D cell array
 *  - ships: Ship[] (only needed for own board)
 *  - isEnemy: boolean — if true, hides ship segments (only shows hits/misses)
 *  - isInteractive: boolean — enables click handling
 *  - onCellClick: (row, col) => void
 *  - onCellHover: (row, col | null) => void — for placement preview
 *  - previewPositions: [{row, col}] — highlighted preview cells during placement
 *  - previewValid: boolean — green or red preview
 *  - shakeBoard: boolean — triggers a brief shake animation
 *  - sunkShipCells: [{row, col}] — cells of a just-sunk ship for sinking animation
 *  - label: string — top label ("Your Fleet" / "Enemy Waters")
 *  - onCanvasSize: (width, height) => void — callback for responsive layout
 */
const BoardCanvas = memo(function BoardCanvas({
  board,
  ships = [],
  isEnemy = false,
  isInteractive = true,
  onCellClick,
  onCellRightClick,
  onCellHover,
  previewPositions = [],
  previewValid = false,
  shakeBoard = false,
  label = '',
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const [hoverCell, setHoverCell] = useState(null);
  const rippleAnimations = useRef([]);
  const explosionAnimations = useRef([]);
  const sunkAnimations = useRef([]);
  const radarAngle = useRef(0);
  const sunkShipCellsRef = useRef([]);

  const canvasWidth = PADDING * 2 + COORD_LABEL_WIDTH + GRID_SIZE * (CELL_SIZE + CELL_GAP);
  const canvasHeight = PADDING * 2 + COORD_LABEL_WIDTH + GRID_SIZE * (CELL_SIZE + CELL_GAP);

  // Track hit/miss cells for explosion/ripple animations
  const prevHitMissRef = useRef(new Set());

  // Check for new hits/misses and trigger animations
  useEffect(() => {
    const newSet = new Set();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = board[r][c];
        if (cell.status === CELL_STATUS.HIT || cell.status === CELL_STATUS.MISS) {
          const key = `${r},${c}`;
          newSet.add(key);
          if (!prevHitMissRef.current.has(key)) {
            // New hit/miss detected
            if (cell.status === CELL_STATUS.HIT) {
              explosionAnimations.current.push({ row: r, col: c, time: performance.now(), duration: 600 });
            } else {
              rippleAnimations.current.push({ row: r, col: c, time: performance.now(), duration: 500 });
            }
          }
        }
      }
    }
    prevHitMissRef.current = newSet;
  }, [board]);

  // Trigger sunk ship animation
  useEffect(() => {
    if (sunkShipCellsRef.current.length > 0) {
      sunkAnimations.current.push({
        cells: [...sunkShipCellsRef.current],
        time: performance.now(),
        duration: 1200,
      });
      sunkShipCellsRef.current = [];
    }
  });

  // Expose a way to trigger sunk animation from parent
  const triggerSunkAnimation = useCallback((cells) => {
    sunkShipCellsRef.current = cells;
  }, []);

  // Set canvas size once (not every frame — causes jitter)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
  }, [canvasWidth, canvasHeight]);

  // Main draw loop
  const draw = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Clear and apply DPI scaling
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Background — dark ocean gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGrad.addColorStop(0, '#0D2137');
    bgGrad.addColorStop(0.5, '#0F2A45');
    bgGrad.addColorStop(1, '#0A1C30');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid offset
    const ox = PADDING + COORD_LABEL_WIDTH;
    const oy = PADDING + COORD_LABEL_WIDTH;

    // Draw coordinate labels
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#4A7A9E';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let c = 0; c < GRID_SIZE; c++) {
      const cx = ox + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      ctx.fillText(String.fromCharCode(65 + c), cx, oy - 12);
    }
    for (let r = 0; r < GRID_SIZE; r++) {
      const cy = oy + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      ctx.fillText((r + 1).toString(), ox - 12, cy);
    }

    // Draw grid cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = board[r][c];
        const x = ox + c * (CELL_SIZE + CELL_GAP);
        const y = oy + r * (CELL_SIZE + CELL_GAP);

        // Cell background
        ctx.fillStyle = '#0A1929';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Grid line glow
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(0, 229, 255, 0.3)';
        ctx.shadowBlur = 3;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
        ctx.shadowBlur = 0;

        // Ship segment (only on own board)
        if (!isEnemy && cell.status === CELL_STATUS.SHIP) {
          drawShipSegment(ctx, x, y, CELL_SIZE, r, c, ships);
        }

        // Hit: explosion icon
        if (cell.status === CELL_STATUS.HIT) {
          drawExplosion(ctx, x, y, CELL_SIZE, timestamp, r, c);
        }

        // Miss: white circle with ripple
        if (cell.status === CELL_STATUS.MISS) {
          drawMiss(ctx, x, y, CELL_SIZE, timestamp, r, c);
        }

        // Sunk ship: fragments sinking
        // (drawn in post-processing pass below)
      }
    }

    // Draw sunk ship animations (on top)
    sunkAnimations.current = sunkAnimations.current.filter((anim) => {
      const elapsed = timestamp - anim.time;
      if (elapsed > anim.duration) return false;
      const progress = elapsed / anim.duration;
      drawSunkAnimation(ctx, ox, oy, CELL_SIZE, CELL_GAP, anim.cells, progress);
      return true;
    });

    // Draw explosion animations (overlay effects)
    explosionAnimations.current = explosionAnimations.current.filter((anim) => {
      const elapsed = timestamp - anim.time;
      if (elapsed > anim.duration) return false;
      const progress = elapsed / anim.duration;
      const x = ox + anim.col * (CELL_SIZE + CELL_GAP);
      const y = oy + anim.row * (CELL_SIZE + CELL_GAP);
      drawExplosionOverlay(ctx, x, y, CELL_SIZE, progress);
      return true;
    });

    // Ripple animations
    rippleAnimations.current = rippleAnimations.current.filter((anim) => {
      const elapsed = timestamp - anim.time;
      if (elapsed > anim.duration) return false;
      const progress = elapsed / anim.duration;
      const x = ox + anim.col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      const y = oy + anim.row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      drawRippleOverlay(ctx, x, y, CELL_SIZE, progress);
      return true;
    });

    // Hover effect
    if (hoverCell && isInteractive && isEnemy) {
      const { row, col } = hoverCell;
      const cell = board[row][col];
      const alreadyShot = cell.status === CELL_STATUS.HIT || cell.status === CELL_STATUS.MISS;
      if (!alreadyShot) {
        const hx = ox + col * (CELL_SIZE + CELL_GAP);
        const hy = oy + row * (CELL_SIZE + CELL_GAP);

        // Crosshair
        drawCrosshair(ctx, hx + CELL_SIZE / 2, hy + CELL_SIZE / 2, CELL_SIZE * 0.8);

        // Cell highlight
        ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.fillRect(hx, hy, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
        ctx.shadowBlur = 6;
        ctx.strokeRect(hx + 1, hy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.shadowBlur = 0;
      }
    }

    // Placement preview
    if (previewPositions.length > 0) {
      for (const pos of previewPositions) {
        const px = ox + pos.col * (CELL_SIZE + CELL_GAP);
        const py = oy + pos.row * (CELL_SIZE + CELL_GAP);

        ctx.fillStyle = previewValid
          ? 'rgba(105, 240, 174, 0.3)'
          : 'rgba(255, 61, 87, 0.3)';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        ctx.strokeStyle = previewValid
          ? 'rgba(105, 240, 174, 0.8)'
          : 'rgba(255, 61, 87, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = previewValid
          ? 'rgba(105, 240, 174, 0.5)'
          : 'rgba(255, 61, 87, 0.5)';
        ctx.shadowBlur = 4;
        ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.shadowBlur = 0;
      }
    }

    // Radar sweep (subtle, on the background)
    drawRadarSweep(ctx, ox, oy, GRID_SIZE * (CELL_SIZE + CELL_GAP), timestamp);

    ctx.restore();
    animFrameRef.current = requestAnimationFrame(draw);
  }, [board, ships, isEnemy, isInteractive, hoverCell, previewPositions, previewValid, canvasWidth, canvasHeight]);

  // Start/restart animation loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  // Handle hover
  const handleMouseMove = useCallback((e) => {
    if (!isInteractive) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const ox = PADDING + COORD_LABEL_WIDTH;
    const oy = PADDING + COORD_LABEL_WIDTH;

    const col = Math.floor((mx - ox) / (CELL_SIZE + CELL_GAP));
    const row = Math.floor((my - oy) / (CELL_SIZE + CELL_GAP));

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      setHoverCell({ row, col });
      onCellHover && onCellHover(row, col);
    } else {
      setHoverCell(null);
      onCellHover && onCellHover(null, null);
    }
  }, [isInteractive, onCellHover, canvasWidth, canvasHeight]);

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
    onCellHover && onCellHover(null, null);
  }, [onCellHover]);

  // Attach native click listener directly to the canvas DOM element.
  // This bypasses React's synthetic event system and any pointer-capture
  // interference, guaranteeing clicks are always captured.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCellFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const ox = PADDING + COORD_LABEL_WIDTH;
      const oy = PADDING + COORD_LABEL_WIDTH;
      const col = Math.floor((mx - ox) / (CELL_SIZE + CELL_GAP));
      const row = Math.floor((my - oy) / (CELL_SIZE + CELL_GAP));
      const valid = row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
      return { row, col, valid, mx, my };
    }

    function nativeClick(e) {
      if (!isInteractive || !onCellClick) return;

      const { row, col, valid } = getCellFromEvent(e);

      if (valid) {
        onCellClick(row, col);
      }
    }

    function nativeContextMenu(e) {
      if (!isInteractive) return;
      const { row, col, valid } = getCellFromEvent(e);
      if (valid && onCellRightClick) {
        e.preventDefault();
        onCellRightClick(row, col);
      }
    }

    canvas.addEventListener('click', nativeClick);
    canvas.addEventListener('contextmenu', nativeContextMenu);
    return () => {
      canvas.removeEventListener('click', nativeClick);
      canvas.removeEventListener('contextmenu', nativeContextMenu);
    };
  }, [isInteractive, onCellClick, onCellRightClick, canvasWidth, canvasHeight]);

  return (
    <div className={`board-canvas-wrapper ${shakeBoard ? 'shake' : ''}`} ref={containerRef}>
      {label && <div className="board-canvas-label">{label}</div>}
      <canvas
        ref={canvasRef}
        className={`board-canvas ${isEnemy && isInteractive ? 'board-canvas--crosshair' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: canvasWidth, height: canvasHeight }}
      />
    </div>
  );
});

// ─── Drawing Helpers ──────────────────────────────────────────────

function drawShipSegment(ctx, x, y, size, row, col, ships) {
  // Determine if this cell is at an edge of the ship for rounded corners
  ctx.fillStyle = '#00BCD4';
  ctx.shadowColor = 'rgba(0, 188, 212, 0.6)';
  ctx.shadowBlur = 6;

  const padding = 3;
  const radius = 5;

  // Draw rounded rectangle
  ctx.beginPath();
  ctx.moveTo(x + padding + radius, y + padding);
  ctx.lineTo(x + size - padding - radius, y + padding);
  ctx.arcTo(x + size - padding, y + padding, x + size - padding, y + padding + radius, radius);
  ctx.lineTo(x + size - padding, y + size - padding - radius);
  ctx.arcTo(x + size - padding, y + size - padding, x + size - padding - radius, y + size - padding, radius);
  ctx.lineTo(x + padding + radius, y + size - padding);
  ctx.arcTo(x + padding, y + size - padding, x + padding, y + size - padding - radius, radius);
  ctx.lineTo(x + padding, y + padding + radius);
  ctx.arcTo(x + padding, y + padding, x + padding + radius, y + padding, radius);
  ctx.closePath();
  ctx.fill();

  // Inner highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(x + padding + 2, y + padding + 2, size - padding * 2 - 4, (size - padding * 2) / 3, 3);

  ctx.shadowBlur = 0;
}

function drawExplosion(ctx, x, y, size, timestamp, row, col) {
  // Base dark red
  ctx.fillStyle = '#1A0A0A';
  ctx.fillRect(x, y, size, size);

  // Orange/red burst (star shape)
  const cx = x + size / 2;
  const cy = y + size / 2;
  const outerR = size * 0.4;
  const innerR = size * 0.15;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const burstGrad = ctx.createRadialGradient(cx, cy, innerR * 0.5, cx, cy, outerR);
  burstGrad.addColorStop(0, '#FFD54F');
  burstGrad.addColorStop(0.4, '#FF6D00');
  burstGrad.addColorStop(1, '#D50000');
  ctx.fillStyle = burstGrad;
  ctx.fill();

  // Sparks
  const sparkCount = 6;
  const seed = row * 13 + col * 7;
  for (let i = 0; i < sparkCount; i++) {
    const angle = ((seed + i * 61) / 100) * Math.PI * 2 + timestamp * 0.002;
    const dist = outerR * (0.6 + 0.4 * Math.sin(timestamp * 0.01 + i));
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    ctx.fillStyle = '#FFD54F';
    ctx.shadowColor = '#FFD54F';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawExplosionOverlay(ctx, x, y, size, progress) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  // Expanding ring
  const alpha = 1 - progress;
  const radius = size * 0.3 + progress * size * 0.8;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FF6D00';
  ctx.lineWidth = 3 * (1 - progress);
  ctx.shadowColor = '#FF6D00';
  ctx.shadowBlur = 10 * (1 - progress);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMiss(ctx, x, y, size, timestamp, row, col) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.fillStyle = '#0A1929';
  ctx.fillRect(x, y, size, size);

  // White circle
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
  ctx.stroke();

  // Inner dot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRippleOverlay(ctx, x, y, size, progress) {
  const alpha = 1 - progress;
  const radius = size * 0.15 + progress * size * 1.0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5 * (1 - progress);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawCrosshair(ctx, cx, cy, size) {
  const half = size / 2;

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
  ctx.shadowBlur = 4;

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(cx, cy - half * 0.7);
  ctx.lineTo(cx, cy + half * 0.7);
  ctx.stroke();

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(cx - half * 0.7, cy);
  ctx.lineTo(cx + half * 0.7, cy);
  ctx.stroke();

  // Small gap in middle
  ctx.fillStyle = '#0A1929';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(cx, cy, half * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawSunkAnimation(ctx, ox, oy, cellSize, gap, cells, progress) {
  // Each cell fragment sinks and fades
  for (const { row, col } of cells) {
    const cx = ox + col * (cellSize + gap) + cellSize / 2;
    const cy = oy + row * (cellSize + gap) + cellSize / 2;

    // Fragment breaks into pieces
    const pieceCount = 4;
    ctx.save();
    ctx.globalAlpha = 1 - progress;

    for (let i = 0; i < pieceCount; i++) {
      const angle = (i / pieceCount) * Math.PI * 2;
      const dist = progress * cellSize * 0.8;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist + progress * cellSize * 1.2; // sink downward
      const rot = progress * Math.PI * (i % 2 ? 1 : -1);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillStyle = '#00BCD4';
      const pieceSize = cellSize * 0.25 * (1 - progress * 0.5);
      ctx.fillRect(-pieceSize / 2, -pieceSize / 2, pieceSize, pieceSize);
      ctx.restore();
    }
    ctx.restore();
  }
}

function drawRadarSweep(ctx, ox, oy, boardSize, timestamp) {
  // Subtle rotating gradient on the grid area
  const angle = (timestamp * 0.0005) % (Math.PI * 2);
  const cx = ox + boardSize / 2;
  const cy = oy + boardSize / 2;
  const radius = boardSize * 0.72;

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, angle, angle + Math.PI * 0.4);
  ctx.closePath();
  ctx.fillStyle = '#00E5FF';
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

export default BoardCanvas;
