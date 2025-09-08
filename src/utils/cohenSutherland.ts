const INSIDE = 0; // 0000
const LEFT = 1;   // 0001
const RIGHT = 2;  // 0010
const BOTTOM = 4; // 0100
const TOP = 8;    // 1000

const computeCode = (x: number, y: number, xmin: number, ymin: number, xmax: number, ymax: number): number => {
  let code = INSIDE;
  if (x < xmin) {
    code |= LEFT;
  } else if (x > xmax) {
    code |= RIGHT;
  }
  if (y < ymin) {
    code |= BOTTOM;
  } else if (y > ymax) {
    code |= TOP;
  }
  return code;
};

export const cohenSutherland = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number
): { x1: number, y1: number, x2: number, y2: number } | null => {
  let code1 = computeCode(x1, y1, xmin, ymin, xmax, ymax);
  let code2 = computeCode(x2, y2, xmin, ymin, xmax, ymax);
  let accept = false;

  while (true) {
    if ((code1 === 0) && (code2 === 0)) {
      // Both endpoints are inside the window
      accept = true;
      break;
    } else if ((code1 & code2) !== 0) {
      // Both endpoints are outside the window, in the same region
      break;
    } else {
      // One endpoint is outside the window
      let x = 0;
      let y = 0;
      const codeOut = code1 !== 0 ? code1 : code2;

      // Find intersection point
      if ((codeOut & TOP) !== 0) {
        x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
        y = ymax;
      } else if ((codeOut & BOTTOM) !== 0) {
        x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
        y = ymin;
      } else if ((codeOut & RIGHT) !== 0) {
        y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
        x = xmax;
      } else if ((codeOut & LEFT) !== 0) {
        y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
        x = xmin;
      }

      // Replace outside point with intersection point
      if (codeOut === code1) {
        x1 = x;
        y1 = y;
        code1 = computeCode(x1, y1, xmin, ymin, xmax, ymax);
      } else {
        x2 = x;
        y2 = y;
        code2 = computeCode(x2, y2, xmin, ymin, xmax, ymax);
      }
    }
  }

  if (accept) {
    return { x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2) };
  }

  return null;
};
