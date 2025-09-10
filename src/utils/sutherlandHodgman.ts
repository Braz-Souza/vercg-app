
export interface Point {
  x: number;
  y: number;
}

const isInside = (p: Point, edge: 'left' | 'right' | 'top' | 'bottom', xmin: number, ymin: number, xmax: number, ymax: number): boolean => {
  switch (edge) {
    case 'left': return p.x >= xmin;
    case 'right': return p.x <= xmax;
    case 'top': return p.y >= ymin;
    case 'bottom': return p.y <= ymax;
  }
};

const getIntersection = (p1: Point, p2: Point, edge: 'left' | 'right' | 'top' | 'bottom', xmin: number, ymin: number, xmax: number, ymax: number): Point => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  switch (edge) {
    case 'left':
      if (Math.abs(dx) < 1e-10) {
        return { x: xmin, y: Math.round(p1.y) };
      }
      return { x: xmin, y: Math.round(p1.y + dy * (xmin - p1.x) / dx) };
    case 'right':
      if (Math.abs(dx) < 1e-10) {
        return { x: xmax, y: Math.round(p1.y) };
      }
      return { x: xmax, y: Math.round(p1.y + dy * (xmax - p1.x) / dx) };
    case 'top':
      if (Math.abs(dy) < 1e-10) {
        return { x: Math.round(p1.x), y: ymin };
      }
      return { x: Math.round(p1.x + dx * (ymin - p1.y) / dy), y: ymin };
    case 'bottom':
      if (Math.abs(dy) < 1e-10) {
        return { x: Math.round(p1.x), y: ymax };
      }
      return { x: Math.round(p1.x + dx * (ymax - p1.y) / dy), y: ymax };
  }
};

const clip = (polygon: Point[], edge: 'left' | 'right' | 'top' | 'bottom', xmin: number, ymin: number, xmax: number, ymax: number): Point[] => {
  if (polygon.length === 0) return [];
  
  const newPolygon: Point[] = [];
  
  if (polygon.length === 1) {
    const p = polygon[0];
    if (isInside(p, edge, xmin, ymin, xmax, ymax)) {
      return [p];
    }
    return [];
  }

  let s = polygon[polygon.length - 1];

  for (let i = 0; i < polygon.length; i++) {
    const e = polygon[i];
    
    const sInside = isInside(s, edge, xmin, ymin, xmax, ymax);
    const eInside = isInside(e, edge, xmin, ymin, xmax, ymax);

    if (eInside) {
      if (!sInside) {
        const intersection = getIntersection(s, e, edge, xmin, ymin, xmax, ymax);
        newPolygon.push(intersection);
      }
      newPolygon.push(e);
    } else if (sInside) {
      const intersection = getIntersection(s, e, edge, xmin, ymin, xmax, ymax);
      newPolygon.push(intersection);
    }
    
    s = e;
  }

  return newPolygon;
};

export const sutherlandHodgman = (polygon: Point[], xmin: number, ymin: number, xmax: number, ymax: number): Point[] => {
  if (!polygon || polygon.length === 0) {
    return [];
  }
  let clippedPolygon = clip(polygon, 'top', xmin, ymin, xmax, ymax);
  clippedPolygon = clip(clippedPolygon, 'bottom', xmin, ymin, xmax, ymax);
  clippedPolygon = clip(clippedPolygon, 'left', xmin, ymin, xmax, ymax);
  clippedPolygon = clip(clippedPolygon, 'right', xmin, ymin, xmax, ymax);
  return clippedPolygon;
};
