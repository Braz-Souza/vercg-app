// Bézier quadrático (1 ponto de controle)
export const bezierQuadratic = (
  startX: number, 
  startY: number, 
  controlX: number, 
  controlY: number, 
  endX: number, 
  endY: number,
  steps: number = 100
): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Fórmula da curva de Bézier quadrática
    // B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = Math.round(
      Math.pow(1 - t, 2) * startX + 
      2 * (1 - t) * t * controlX + 
      Math.pow(t, 2) * endX
    );
    
    const y = Math.round(
      Math.pow(1 - t, 2) * startY + 
      2 * (1 - t) * t * controlY + 
      Math.pow(t, 2) * endY
    );
    
    // Verificar se está dentro dos limites do grid
    if (x >= 0 && x < 20 && y >= 0 && y < 20) {
      points.push({ x, y });
    }
  }
  
  // Remover pontos duplicados
  const uniquePoints = new Map<string, {x: number, y: number}>();
  points.forEach(point => {
    const key = `${point.x},${point.y}`;
    uniquePoints.set(key, point);
  });
  
  return Array.from(uniquePoints.values());
};

// Bézier cúbico (2 pontos de controle)
export const bezierCubic = (
  startX: number, 
  startY: number, 
  control1X: number, 
  control1Y: number,
  control2X: number, 
  control2Y: number, 
  endX: number, 
  endY: number,
  steps: number = 100
): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Fórmula da curva de Bézier cúbica
    // B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
    const x = Math.round(
      Math.pow(1 - t, 3) * startX + 
      3 * Math.pow(1 - t, 2) * t * control1X + 
      3 * (1 - t) * Math.pow(t, 2) * control2X +
      Math.pow(t, 3) * endX
    );
    
    const y = Math.round(
      Math.pow(1 - t, 3) * startY + 
      3 * Math.pow(1 - t, 2) * t * control1Y + 
      3 * (1 - t) * Math.pow(t, 2) * control2Y +
      Math.pow(t, 3) * endY
    );
    
    // Verificar se está dentro dos limites do grid
    if (x >= 0 && x < 20 && y >= 0 && y < 20) {
      points.push({ x, y });
    }
  }
  
  // Remover pontos duplicados
  const uniquePoints = new Map<string, {x: number, y: number}>();
  points.forEach(point => {
    const key = `${point.x},${point.y}`;
    uniquePoints.set(key, point);
  });
  
  return Array.from(uniquePoints.values());
};

// Bézier quártico (3 pontos de controle)
export const bezierQuartic = (
  startX: number, 
  startY: number, 
  control1X: number, 
  control1Y: number,
  control2X: number, 
  control2Y: number,
  control3X: number, 
  control3Y: number, 
  endX: number, 
  endY: number,
  steps: number = 100
): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Fórmula da curva de Bézier quártica
    // B(t) = (1-t)⁴P₀ + 4(1-t)³tP₁ + 6(1-t)²t²P₂ + 4(1-t)t³P₃ + t⁴P₄
    const x = Math.round(
      Math.pow(1 - t, 4) * startX + 
      4 * Math.pow(1 - t, 3) * t * control1X + 
      6 * Math.pow(1 - t, 2) * Math.pow(t, 2) * control2X +
      4 * (1 - t) * Math.pow(t, 3) * control3X +
      Math.pow(t, 4) * endX
    );
    
    const y = Math.round(
      Math.pow(1 - t, 4) * startY + 
      4 * Math.pow(1 - t, 3) * t * control1Y + 
      6 * Math.pow(1 - t, 2) * Math.pow(t, 2) * control2Y +
      4 * (1 - t) * Math.pow(t, 3) * control3Y +
      Math.pow(t, 4) * endY
    );
    
    // Verificar se está dentro dos limites do grid
    if (x >= 0 && x < 20 && y >= 0 && y < 20) {
      points.push({ x, y });
    }
  }
  
  // Remover pontos duplicados
  const uniquePoints = new Map<string, {x: number, y: number}>();
  points.forEach(point => {
    const key = `${point.x},${point.y}`;
    uniquePoints.set(key, point);
  });
  
  return Array.from(uniquePoints.values());
};

// Função para calcular coeficiente binomial
const binomialCoefficient = (n: number, k: number): number => {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = result * (n - i + 1) / i;
  }
  return result;
};

// Bézier genérico para N pontos usando a fórmula de De Casteljau
export const bezierGeneric = (
  points: Array<{x: number, y: number}>,
  steps: number = 100
): Array<{x: number, y: number}> => {
  if (points.length < 2) return [];
  
  const resultPoints: Array<{x: number, y: number}> = [];
  const n = points.length - 1; // grau da curva
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let x = 0;
    let y = 0;
    
    // Fórmula de Bézier: B(t) = Σ(i=0 to n) [C(n,i) * (1-t)^(n-i) * t^i * Pi]
    for (let j = 0; j <= n; j++) {
      const coefficient = binomialCoefficient(n, j);
      const basis = coefficient * Math.pow(1 - t, n - j) * Math.pow(t, j);
      
      x += basis * points[j].x;
      y += basis * points[j].y;
    }
    
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    
    // Verificar se está dentro dos limites do grid
    if (roundedX >= 0 && roundedX < 20 && roundedY >= 0 && roundedY < 20) {
      resultPoints.push({ x: roundedX, y: roundedY });
    }
  }
  
  // Remover pontos duplicados
  const uniquePoints = new Map<string, {x: number, y: number}>();
  resultPoints.forEach(point => {
    const key = `${point.x},${point.y}`;
    uniquePoints.set(key, point);
  });
  
  return Array.from(uniquePoints.values());
};

// Manter compatibilidade com o nome antigo
export const bezierCurve = bezierGeneric;