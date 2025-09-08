export const bresenhamCircle = (centerX: number, centerY: number, radius: number): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  if (radius <= 0) return points;
  
  let x = 0;
  let y = radius;
  let d = 3 - 2 * radius;
  
  // Função auxiliar para adicionar os 8 pontos simétricos
  const addSymmetricPoints = (cx: number, cy: number, x: number, y: number) => {
    points.push({ x: cx + x, y: cy + y });
    points.push({ x: cx - x, y: cy + y });
    points.push({ x: cx + x, y: cy - y });
    points.push({ x: cx - x, y: cy - y });
    points.push({ x: cx + y, y: cy + x });
    points.push({ x: cx - y, y: cy + x });
    points.push({ x: cx + y, y: cy - x });
    points.push({ x: cx - y, y: cy - x });
  };
  
  addSymmetricPoints(centerX, centerY, x, y);
  
  while (y >= x) {
    x++;
    
    if (d > 0) {
      y--;
      d = d + 4 * (x - y) + 10;
    } else {
      d = d + 4 * x + 6;
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