export const bresenhamEllipse = (centerX: number, centerY: number, radiusX: number, radiusY: number): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  if (radiusX <= 0 || radiusY <= 0) return points;
  
  let x = 0;
  let y = radiusY;
  let dx = 2 * radiusY * radiusY * x;
  let dy = 2 * radiusX * radiusX * y;
  
  // Região 1
  let d1 = radiusY * radiusY - radiusX * radiusX * radiusY + 0.25 * radiusX * radiusX;
  
  // Função auxiliar para adicionar os 4 pontos simétricos
  const addSymmetricPoints = (cx: number, cy: number, x: number, y: number) => {
    points.push({ x: cx + x, y: cy + y });
    points.push({ x: cx - x, y: cy + y });
    points.push({ x: cx + x, y: cy - y });
    points.push({ x: cx - x, y: cy - y });
  };
  
  addSymmetricPoints(centerX, centerY, x, y);
  
  // Região 1 - até dx >= dy
  while (dx < dy) {
    x++;
    dx = dx + 2 * radiusY * radiusY;
    
    if (d1 < 0) {
      d1 = d1 + dx + radiusY * radiusY;
    } else {
      y--;
      dy = dy - 2 * radiusX * radiusX;
      d1 = d1 + dx - dy + radiusY * radiusY;
    }
    
    addSymmetricPoints(centerX, centerY, x, y);
  }
  
  // Região 2
  let d2 = radiusY * radiusY * (x + 0.5) * (x + 0.5) + radiusX * radiusX * (y - 1) * (y - 1) - radiusX * radiusX * radiusY * radiusY;
  
  while (y >= 0) {
    y--;
    dy = dy - 2 * radiusX * radiusX;
    
    if (d2 > 0) {
      d2 = d2 + radiusX * radiusX - dy;
    } else {
      x++;
      dx = dx + 2 * radiusY * radiusY;
      d2 = d2 + dx - dy + radiusX * radiusX;
    }
    
    addSymmetricPoints(centerX, centerY, x, y);
  }
  
  // Remover pontos duplicados e fora dos limites
  const uniquePoints = new Map<string, {x: number, y: number}>();
  points.forEach(point => {
    const key = `${point.x},${point.y}`;
    if (point.x >= 0 && point.x < 20 && point.y >= 0 && point.y < 20) {
      uniquePoints.set(key, point);
    }
  });
  
  return Array.from(uniquePoints.values());
};