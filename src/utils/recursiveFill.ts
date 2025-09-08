export const recursiveFill = (
  x: number,
  y: number,
  pixels: Set<string>,
  gridSize: number
): Set<string> => {
  const newPixels = new Set(pixels);
  const key = `${x},${y}`;
  const targetColor = newPixels.has(key);

  const fillColor = !targetColor;

  const stack: [number, number][] = [[x, y]];

  while (stack.length > 0) {
    const [curX, curY] = stack.pop()!;

    const currentKey = `${curX},${curY}`;
    if (
      curX < 0 ||
      curX >= gridSize ||
      curY < 0 ||
      curY >= gridSize ||
      newPixels.has(currentKey) !== targetColor
    ) {
      continue;
    }

    if (fillColor) {
      newPixels.add(currentKey);
    } else {
      newPixels.delete(currentKey);
    }

    stack.push([curX + 1, curY]);
    stack.push([curX - 1, curY]);
    stack.push([curX, curY + 1]);
    stack.push([curX, curY - 1]);
  }

  return newPixels;
};
