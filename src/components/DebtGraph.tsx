import type { Person } from '../types';
import type { Settlement } from '../settlement';
import { fmt } from '../utils';

/**
 * SVG debt graph: members arranged on a circle, animated colored arrows
 * flowing from each debtor to the creditor they should pay.
 */
export default function DebtGraph({
  members,
  settlements,
}: {
  members: Person[];
  settlements: Settlement[];
}) {
  const W = 340;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2 - 4;
  const R = Math.min(W, H) / 2 - 52;
  const NODE_R = 24;

  const pos = new Map<string, { x: number; y: number }>();
  members.forEach((m, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / members.length;
    pos.set(m.id, { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) });
  });

  const personById = new Map(members.map((m) => [m.id, m]));
  const maxAmt = Math.max(1, ...settlements.map((s) => s.amount));

  return (
    <svg
      className="debt-graph"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Debt flow graph"
    >
      {settlements.map((s, i) => {
        const a = pos.get(s.from);
        const b = pos.get(s.to);
        const from = personById.get(s.from);
        if (!a || !b || !from) return null;

        // Curve control point: midpoint pushed away from graph center.
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const push = 34;
        const qx = mx + (dx / dist) * push;
        const qy = my + (dy / dist) * push;

        // Trim endpoints so arrows start/stop at node edges.
        const trim = (px: number, py: number, tx: number, ty: number, r: number) => {
          const vx = tx - px;
          const vy = ty - py;
          const len = Math.hypot(vx, vy) || 1;
          return { x: px + (vx / len) * r, y: py + (vy / len) * r };
        };
        const start = trim(a.x, a.y, qx, qy, NODE_R + 4);
        const end = trim(b.x, b.y, qx, qy, NODE_R + 10);

        // Arrowhead angle at the end of the quadratic curve.
        const angle = Math.atan2(end.y - qy, end.x - qx);
        const ah = 8;
        const tip1 = {
          x: end.x - ah * Math.cos(angle - 0.45),
          y: end.y - ah * Math.sin(angle - 0.45),
        };
        const tip2 = {
          x: end.x - ah * Math.cos(angle + 0.45),
          y: end.y - ah * Math.sin(angle + 0.45),
        };

        // Label at curve midpoint (t = 0.5).
        const lx = 0.25 * start.x + 0.5 * qx + 0.25 * end.x;
        const ly = 0.25 * start.y + 0.5 * qy + 0.25 * end.y;
        const label = fmt(s.amount);
        const lw = label.length * 7.2 + 12;

        const width = 2 + (s.amount / maxAmt) * 3.5;

        return (
          <g key={i}>
            <path
              className="debt-arrow"
              d={`M ${start.x} ${start.y} Q ${qx} ${qy} ${end.x} ${end.y}`}
              fill="none"
              stroke={from.color}
              strokeWidth={width}
              strokeLinecap="round"
            />
            <polygon
              points={`${end.x},${end.y} ${tip1.x},${tip1.y} ${tip2.x},${tip2.y}`}
              fill={from.color}
            />
            <g>
              <rect
                className="debt-label-bg"
                x={lx - lw / 2}
                y={ly - 11}
                width={lw}
                height={22}
                rx={11}
              />
              <text className="debt-label" x={lx} y={ly + 4} textAnchor="middle">
                {label}
              </text>
            </g>
          </g>
        );
      })}

      {members.map((m) => {
        const p = pos.get(m.id)!;
        return (
          <g key={m.id}>
            <circle cx={p.x} cy={p.y} r={NODE_R} fill={m.color} className="debt-node" />
            <text x={p.x} y={p.y + 5} textAnchor="middle" className="debt-initials">
              {m.initials}
            </text>
            <text x={p.x} y={p.y + NODE_R + 16} textAnchor="middle" className="debt-name">
              {m.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
