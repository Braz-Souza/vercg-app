
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

  if (dx === 0) {
    switch (edge) {
      case 'left':
      case 'right':
        return { x: p1.x, y: p1.y };
      case 'top':
        return { x: p1.x, y: ymin };
      case 'bottom':
        return { x: p1.x, y: ymax };
    }
  }

  if (dy === 0) {
    switch (edge) {
      case 'left':
        return { x: xmin, y: p1.y };
      case 'right':
        return { x: xmax, y: p1.y };
      case 'top':
      case 'bottom':
        return { x: p1.x, y: p1.y };
    }
  }

  switch (edge) {
    case 'left':
      return { x: xmin, y: p1.y + dy * (xmin - p1.x) / dx };
    case 'right':
      return { x: xmax, y: p1.y + dy * (xmax - p1.x) / dx };
    case 'top':
      return { x: p1.x + dx * (ymin - p1.y) / dy, y: ymin };
    case 'bottom':
      return { x: p1.x + dx * (ymax - p1.y) / dy, y: ymax };
  }
};

const clip = (polygon: Point[], edge: 'left' | 'right' | 'top' | 'bottom', xmin: number, ymin: number, xmax: number, ymax: number): Point[] => {
  const newPolygon: Point[] = [];
  
  if (polygon.length === 0) return [];

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const isP1Inside = isInside(p1, edge, xmin, ymin, xmax, ymax);
    const isP2Inside = isInside(p2, edge, xmin, ymin, xmax, ymax);

    if (isP1Inside && isP2Inside) {
      newPolygon.push(p2);
    } else if (isP1Inside && !isP2Inside) {
      newPolygon.push(getIntersection(p1, p2, edge, xmin, ymin, xmax, ymax));
    } else if (!isP1Inside && isP2Inside) {
      newPolygon.push(getIntersection(p1, p2, edge, xmin, ymin, xmax, ymax));
      newPolygon.push(p2);
    }
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
