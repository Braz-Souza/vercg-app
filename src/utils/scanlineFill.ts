export const scanlineFill = (
  x: number,
  y: number,
  pixels: Set<string>,
  gridSize: number
): Set<string> => {
  const newPixels = new Set(pixels);
  const key = `${x},${y}`;
  const targetColor = newPixels.has(key);
  const fillColor = !targetColor;

  if (newPixels.has(key) === fillColor) {
    return newPixels;
  }

  const stack: [number, number][] = [[x, y]];

  while (stack.length > 0) {
    const [startX, startY] = stack.pop()!;

    let left = startX;
    while (left >= 0 && newPixels.has(`${left},${startY}`) === targetColor) {
      left--;
    }
    left++;

    let right = startX;
    while (right < gridSize && newPixels.has(`${right},${startY}`) === targetColor) {
      right++;
    }
    right--;

    for (let i = left; i <= right; i++) {
      const currentKey = `${i},${startY}`;
      if (fillColor) {
        newPixels.add(currentKey);
      } else {
        newPixels.delete(currentKey);
      }
    }

    const checkLine = (y: number) => {
      let inSpan = false;
      for (let i = left; i <= right; i++) {
        const currentKey = `${i},${y}`;
        if (y >= 0 && y < gridSize && newPixels.has(currentKey) === targetColor) {
          if (!inSpan) {
            stack.push([i, y]);
            inSpan = true;
          }
        } else {
          inSpan = false;
        }
      }
    };

    checkLine(startY - 1);
    checkLine(startY + 1);
  }

  return newPixels;
};
