import { Point, Shape } from '../types';

export const distance = (a: Point, b: Point) => 
  Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));

export const rotatePoint = (point: Point, center: Point, angleDeg: number): Point => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };
};

const distanceToSegment = (p: Point, a: Point, b: Point) => {
  const l2 = Math.pow(distance(a, b), 2);
  if (l2 === 0) return distance(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return distance(p, proj);
};

// Hit Test
export const isPointInShape = (p: Point, shape: Shape): boolean => {
  if (shape.type === 'connector') {
    const conn = shape as any;
    const hitRadius = 10; // Larger hit area for easier selection
    return distanceToSegment(p, conn.startPoint, conn.endPoint) <= hitRadius;
  } 

  if (shape.type === 'pen') {
      const s = shape as any;
      const points = s.points as Point[];
      const hitRadius = (s.strokeWidth || 3) + 5; 
      
      for (let i = 0; i < points.length - 1; i++) {
          if (distanceToSegment(p, points[i], points[i+1]) <= hitRadius) {
              return true;
          }
      }
      return false;
  }

  const s = shape as any; 
  if (!s.width || !s.height) return false;

  const center = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
  const unrotatedP = rotatePoint(p, center, -(s.rotation || 0));
  
  // Local coordinates relative to shape top-left
  const lx = unrotatedP.x - s.x;
  const ly = unrotatedP.y - s.y;
  const w = s.width;
  const h = s.height;

  // Bounding Box Check
  if (lx < 0 || lx > w || ly < 0 || ly > h) return false;

  if (shape.type === 'geo') {
      const g = shape as any;
      if (g.subType === 'circle' || g.subType === 'bubble') { 
          // For circle
          if (g.subType === 'circle') {
             const dx = lx - w/2;
             const dy = ly - h/2;
             return (dx*dx)/((w/2)*(w/2)) + (dy*dy)/((h/2)*(h/2)) <= 1;
          }
      }
      if (g.subType === 'triangle') {
          // Barycentric technique or simple half-plane check
          // Vertices: (w/2, 0), (0, h), (w, h)
          // Function to check side of line
          const sign = (p1: Point, p2: Point, p3: Point) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
          
          const pt = {x: lx, y: ly};
          const v1 = {x: w/2, y: 0};
          const v2 = {x: 0, y: h};
          const v3 = {x: w, y: h};

          const d1 = sign(pt, v1, v2);
          const d2 = sign(pt, v2, v3);
          const d3 = sign(pt, v3, v1);

          const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
          const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

          return !(hasNeg && hasPos);
      }
      if (g.subType === 'diamond') {
          const dx = Math.abs(lx - w/2);
          const dy = Math.abs(ly - h/2);
          return (dx / (w/2) + dy / (h/2)) <= 1;
      }
  }

  return true;
};

export const getShapeCenter = (shape: Shape): Point => {
  if (shape.type === 'pen') {
     const s = shape as any;
     if (!s.points || s.points.length === 0) return {x:0, y:0};
     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
     s.points.forEach((p: Point) => {
         minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
         maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
     });
     return { x: minX + (maxX - minX)/2, y: minY + (maxY - minY)/2 };
  }
  if (shape.type === 'connector') return { x: 0, y: 0 };
  const s = shape as any;
  return {
    x: s.x + s.width / 2,
    y: s.y + s.height / 2
  };
};

const getLineIntersection = (p1: Point, p2: Point, p3: Point, p4: Point): Point | null => {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (d === 0) return null;
    const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        return { x: p1.x + u * (p2.x - p1.x), y: p1.y + u * (p2.y - p1.y) };
    }
    return null;
};

export const getPerimeterPoint = (shape: Shape, from: Point): Point => {
  if (shape.type === 'pen' || shape.type === 'connector') return getShapeCenter(shape);
  const s = shape as any;
  const center = { x: s.x + s.width / 2, y: s.y + s.height / 2 };

  // Work in unrotated coordinate space
  const unrotatedFrom = rotatePoint(from, center, -(s.rotation || 0));

  // Direction from center to target
  const dx = unrotatedFrom.x - center.x;
  const dy = unrotatedFrom.y - center.y;
  const angle = Math.atan2(dy, dx);

  let result: Point;

  if (s.subType === 'circle') {
      // For circles, simply use angle
      const rx = s.width / 2;
      const ry = s.height / 2;
      result = {
          x: center.x + rx * Math.cos(angle),
          y: center.y + ry * Math.sin(angle)
      };
  }
  else if (s.subType === 'triangle') {
      const p1 = { x: s.x + s.width / 2, y: s.y };
      const p2 = { x: s.x, y: s.y + s.height };
      const p3 = { x: s.x + s.width, y: s.y + s.height };
      const farPoint = { x: center.x + dx * 1000, y: center.y + dy * 1000 };
      result = getLineIntersection(center, farPoint, p1, p2)
            || getLineIntersection(center, farPoint, p2, p3)
            || getLineIntersection(center, farPoint, p3, p1)
            || center;
  }
  else if (s.subType === 'diamond') {
      const p1 = { x: s.x + s.width / 2, y: s.y };
      const p2 = { x: s.x + s.width, y: s.y + s.height / 2 };
      const p3 = { x: s.x + s.width / 2, y: s.y + s.height };
      const p4 = { x: s.x, y: s.y + s.height / 2 };
      const farPoint = { x: center.x + dx * 1000, y: center.y + dy * 1000 };
      result = getLineIntersection(center, farPoint, p1, p2)
            || getLineIntersection(center, farPoint, p2, p3)
            || getLineIntersection(center, farPoint, p3, p4)
            || getLineIntersection(center, farPoint, p4, p1)
            || center;
  }
  else if (s.subType === 'star' || s.subType === 'bubble') {
      // Approximate as ellipse
      const rx = s.width / 2;
      const ry = s.height / 2;
      result = {
          x: center.x + rx * Math.cos(angle),
          y: center.y + ry * Math.sin(angle)
      };
  }
  else {
      // Rectangles, sticky notes, text - smooth ray-cast intersection
      // This creates Excalidraw-like smooth attachment that flows around corners
      const halfW = s.width / 2;
      const halfH = s.height / 2;

      // Normalize direction
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) {
          result = { x: center.x + halfW, y: center.y };
      } else {
          const ndx = dx / len;
          const ndy = dy / len;

          // Find intersection with rectangle edges using parametric ray
          // Ray: P = center + t * direction, find smallest positive t where ray hits edge
          let t = Infinity;

          // Right edge (x = center.x + halfW)
          if (ndx > 0) {
              const tRight = halfW / ndx;
              const yAtRight = ndy * tRight;
              if (Math.abs(yAtRight) <= halfH) t = Math.min(t, tRight);
          }
          // Left edge (x = center.x - halfW)
          if (ndx < 0) {
              const tLeft = -halfW / ndx;
              const yAtLeft = ndy * tLeft;
              if (Math.abs(yAtLeft) <= halfH) t = Math.min(t, tLeft);
          }
          // Bottom edge (y = center.y + halfH)
          if (ndy > 0) {
              const tBottom = halfH / ndy;
              const xAtBottom = ndx * tBottom;
              if (Math.abs(xAtBottom) <= halfW) t = Math.min(t, tBottom);
          }
          // Top edge (y = center.y - halfH)
          if (ndy < 0) {
              const tTop = -halfH / ndy;
              const xAtTop = ndx * tTop;
              if (Math.abs(xAtTop) <= halfW) t = Math.min(t, tTop);
          }

          if (t === Infinity) t = 0;
          result = {
              x: center.x + ndx * t,
              y: center.y + ndy * t
          };
      }
  }

  // Rotate result back to world space
  return rotatePoint(result, center, s.rotation || 0);
};

export const getElbowPoints = (start: Point, end: Point): Point[] => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Simple orthogonal routing with one bend
  // If horizontal distance is larger, go horizontal first
  if (Math.abs(dx) > Math.abs(dy)) {
    const midX = start.x + dx / 2;
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  } else {
    // Otherwise go vertical first
    const midY = start.y + dy / 2;
    return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
  }
};

export const screenToWorld = (x: number, y: number, pan: Point, zoom: number, svgRef: React.RefObject<SVGSVGElement>): Point => {
  if (!svgRef.current) return { x: 0, y: 0 };
  const rect = svgRef.current.getBoundingClientRect();
  return {
    x: (x - rect.left - pan.x) / zoom,
    y: (y - rect.top - pan.y) / zoom,
  };
};

// --- PATH GENERATORS ---

/**
 * Calculates a rounded corner for a polygon using a Quadratic curve approximation for visual smoothness.
 * p: Current corner point
 * pPrev: Previous corner point
 * pNext: Next corner point
 * r: Radius (distance from corner to cut start)
 */
const getPolyCorner = (p: Point, pPrev: Point, pNext: Point, r: number) => {
    // 1. Vectors
    const v1 = { x: p.x - pPrev.x, y: p.y - pPrev.y };
    const v2 = { x: pNext.x - p.x, y: pNext.y - p.y };
    
    // 2. Lengths
    const l1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const l2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    // 3. Limit radius to half of shortest side to prevent overlap/glitches
    const maxR = Math.min(l1, l2) / 2;
    const effR = Math.min(r, maxR);
    
    if (effR <= 0) return { start: p, end: p, ctrl: p, skip: true };

    // 4. Normalize
    const n1 = { x: v1.x / l1, y: v1.y / l1 };
    const n2 = { x: v2.x / l2, y: v2.y / l2 };

    // 5. Points
    // Start point on incoming edge (p - n1 * effR)
    const start = { x: p.x - n1.x * effR, y: p.y - n1.y * effR };
    // End point on outgoing edge (p + n2 * effR)
    const end = { x: p.x + n2.x * effR, y: p.y + n2.y * effR };

    return { start, end, ctrl: p, skip: false };
}

/**
 * Generates an SVG path data string for a generic polygon with rounded corners.
 */
export const getRoundedPolygonPath = (points: Point[], r: number) => {
    if (points.length < 3) return "";
    let d = "";
    
    for (let i = 0; i < points.length; i++) {
        const curr = points[i];
        const prev = points[(i - 1 + points.length) % points.length];
        const next = points[(i + 1) % points.length];
        
        const c = getPolyCorner(curr, prev, next, r);
        
        if (i === 0) {
            if (c.skip) d += `M ${curr.x},${curr.y} `;
            else d += `M ${c.start.x},${c.start.y} Q ${c.ctrl.x},${c.ctrl.y} ${c.end.x},${c.end.y} `;
        } else {
            if (c.skip) d += `L ${curr.x},${curr.y} `;
            else d += `L ${c.start.x},${c.start.y} Q ${c.ctrl.x},${c.ctrl.y} ${c.end.x},${c.end.y} `;
        }
    }
    d += "Z";
    return d;
}

export const getStarPath = (w: number, h: number, r: number = 0) => {
    const cx = w/2;
    const cy = h/2;
    const outerRadius = Math.min(w, h) / 2;
    const innerRadius = outerRadius * 0.382;
    const points: Point[] = [];
    
    for (let i = 0; i < 10; i++) {
        const rad = (i % 2 === 0) ? outerRadius : innerRadius;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        points.push({
            x: cx + Math.cos(angle) * rad,
            y: cy + Math.sin(angle) * rad
        });
    }
    return getRoundedPolygonPath(points, r);
};

export const getBubblePath = (w: number, h: number) => {
    const r = Math.min(w, h) * 0.15; 
    const tailH = Math.min(h * 0.2, 30);
    const bodyH = h - tailH;
    
    return `
      M ${r},0 
      H ${w-r} 
      Q ${w},0 ${w},${r} 
      V ${bodyH-r} 
      Q ${w},${bodyH} ${w-r},${bodyH}
      H ${w/2 + 15}
      L ${w/2},${h}
      L ${w/2 - 15},${bodyH}
      H ${r}
      Q 0,${bodyH} 0,${bodyH-r}
      V ${r}
      Q 0,0 ${r},0
      Z
    `;
};

export const getRoundedTrianglePath = (w: number, h: number, r: number) => {
    // Top-Middle, Bottom-Right, Bottom-Left
    const points = [
        { x: w/2, y: 0 },
        { x: w, y: h },
        { x: 0, y: h }
    ];
    return getRoundedPolygonPath(points, r);
};

export const getRoundedDiamondPath = (w: number, h: number, r: number) => {
    // Top, Right, Bottom, Left
    const points = [
        { x: w/2, y: 0 },
        { x: w, y: h/2 },
        { x: w/2, y: h },
        { x: 0, y: h/2 }
    ];
    return getRoundedPolygonPath(points, r);
};

export const getArrowPath = (w: number, h: number) => {
    // Simple right-pointing block arrow
    const tailH = h * 0.5;
    const tailY = (h - tailH) / 2;
    const headW = w * 0.4;
    const tailW = w - headW;
    
    return `
      M 0,${tailY} 
      H ${tailW} 
      V 0 
      L ${w},${h/2} 
      L ${tailW},${h} 
      V ${tailY + tailH} 
      H 0 
      Z
    `;
};
