export interface Point {
  x: number;
  y: number;
}

export function rotatePoint(point: Point, angle: number, pivot: Point): Point {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  const translatedX = point.x - pivot.x;
  const translatedY = point.y - pivot.y;
  
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;
  
  return {
    x: Math.round(rotatedX + pivot.x),
    y: Math.round(rotatedY + pivot.y)
  };
}

export function rotatePolygon(vertices: Point[], angle: number, pivot: Point): Point[] {
  return vertices.map(vertex => rotatePoint(vertex, angle, pivot));
}

export function translatePoint(point: Point, dx: number, dy: number): Point {
  return {
    x: Math.round(point.x + dx),
    y: Math.round(point.y + dy)
  };
}

export function translatePolygon(vertices: Point[], dx: number, dy: number): Point[] {
  return vertices.map(vertex => translatePoint(vertex, dx, dy));
}

export function scalePoint(point: Point, scaleX: number, scaleY: number, fixedPoint: Point): Point {
  const translatedX = point.x - fixedPoint.x;
  const translatedY = point.y - fixedPoint.y;
  
  const scaledX = translatedX * scaleX;
  const scaledY = translatedY * scaleY;
  
  return {
    x: Math.round(scaledX + fixedPoint.x),
    y: Math.round(scaledY + fixedPoint.y)
  };
}

export function scalePolygon(vertices: Point[], scaleX: number, scaleY: number, fixedPoint?: Point): Point[] {
  if (!fixedPoint) {
    // Calculate centroid as fixed point
    const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    fixedPoint = { x: Math.round(centerX), y: Math.round(centerY) };
  }
  return vertices.map(vertex => scalePoint(vertex, scaleX, scaleY, fixedPoint));
}

export interface Circle {
  center: Point;
  radius: number;
}

export function rotateCircle(circle: Circle, angle: number, pivot: Point): Circle {
  const rotatedCenter = rotatePoint(circle.center, angle, pivot);
  return {
    center: rotatedCenter,
    radius: circle.radius
  };
}

export function translateCircle(circle: Circle, dx: number, dy: number): Circle {
  const translatedCenter = translatePoint(circle.center, dx, dy);
  return {
    center: translatedCenter,
    radius: circle.radius
  };
}

export function scaleCircle(circle: Circle, scaleX: number, scaleY: number, fixedPoint?: Point): Circle {
  if (!fixedPoint) {
    fixedPoint = circle.center; // Use center as fixed point
  }
  const scaledCenter = scalePoint(circle.center, scaleX, scaleY, fixedPoint);
  const avgScale = (scaleX + scaleY) / 2;
  return {
    center: scaledCenter,
    radius: Math.round(circle.radius * avgScale)
  };
}

export interface Line {
  p1: Point;
  p2: Point;
}

export function rotateLine(line: Line, angle: number, pivot: Point): Line {
  return {
    p1: rotatePoint(line.p1, angle, pivot),
    p2: rotatePoint(line.p2, angle, pivot)
  };
}

export function translateLine(line: Line, dx: number, dy: number): Line {
  return {
    p1: translatePoint(line.p1, dx, dy),
    p2: translatePoint(line.p2, dx, dy)
  };
}

export function scaleLine(line: Line, scaleX: number, scaleY: number, fixedPoint?: Point): Line {
  if (!fixedPoint) {
    // Use midpoint as fixed point
    fixedPoint = {
      x: Math.round((line.p1.x + line.p2.x) / 2),
      y: Math.round((line.p1.y + line.p2.y) / 2)
    };
  }
  return {
    p1: scalePoint(line.p1, scaleX, scaleY, fixedPoint),
    p2: scalePoint(line.p2, scaleX, scaleY, fixedPoint)
  };
}

export function rotateBezier(vertices: Point[], angle: number, pivot: Point): Point[] {
  return vertices.map(vertex => rotatePoint(vertex, angle, pivot));
}

export function translateBezier(vertices: Point[], dx: number, dy: number): Point[] {
  return vertices.map(vertex => translatePoint(vertex, dx, dy));
}

export function scaleBezier(vertices: Point[], scaleX: number, scaleY: number, fixedPoint?: Point): Point[] {
  if (!fixedPoint) {
    // Calculate centroid as fixed point
    const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    fixedPoint = { x: Math.round(centerX), y: Math.round(centerY) };
  }
  return vertices.map(vertex => scalePoint(vertex, scaleX, scaleY, fixedPoint));
}

export function isPointInsideCircle(point: Point, circle: Circle): boolean {
  const distance = Math.sqrt(
    Math.pow(point.x - circle.center.x, 2) + Math.pow(point.y - circle.center.y, 2)
  );
  return distance <= circle.radius;
}

export function isPointInsidePolygon(point: Point, vertices: Point[]): boolean {
  if (vertices.length < 3) return false;
  
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export function isPointNearLine(point: Point, line: Line, tolerance: number = 1): boolean {
  const A = point.x - line.p1.x;
  const B = point.y - line.p1.y;
  const C = line.p2.x - line.p1.x;
  const D = line.p2.y - line.p1.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B) <= tolerance;

  let param = dot / lenSq;
  param = Math.max(0, Math.min(1, param));

  const xx = line.p1.x + param * C;
  const yy = line.p1.y + param * D;

  const dx = point.x - xx;
  const dy = point.y - yy;
  
  return Math.sqrt(dx * dx + dy * dy) <= tolerance;
}