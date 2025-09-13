import { Point } from './transformations';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PerspectiveProjectionParams {
  fov: number;
  near: number;
  far: number;
  viewerDistance: number;
}

export enum PerspectiveType {
  ONE_POINT = 'one_point',
  TWO_POINT = 'two_point',
  THREE_POINT = 'three_point'
}

export function perspectiveProjection(
  point3D: Point3D, 
  params: PerspectiveProjectionParams,
  type: PerspectiveType = PerspectiveType.ONE_POINT
): Point {
  const { fov, viewerDistance } = params;
  
  switch (type) {
    case PerspectiveType.ONE_POINT:
      return onePointPerspective(point3D, viewerDistance);
    
    case PerspectiveType.TWO_POINT:
      return twoPointPerspective(point3D, viewerDistance);
    
    case PerspectiveType.THREE_POINT:
      return threePointPerspective(point3D, viewerDistance, fov);
    
    default:
      return { x: 0, y: 0 };
  }
}

function onePointPerspective(point3D: Point3D, viewerDistance: number): Point {
  const scale = viewerDistance / (viewerDistance + point3D.z);
  return {
    x: Math.round(point3D.x * scale),
    y: Math.round(point3D.y * scale)
  };
}

function twoPointPerspective(point3D: Point3D, viewerDistance: number): Point {
  // Dois pontos de fuga: um para X e outro para Z
  const vanishingPointDistance = viewerDistance * 2;
  
  // Aplicar perspectiva em X (ponto de fuga à direita)
  const scaleX = vanishingPointDistance / (vanishingPointDistance + point3D.z + point3D.x * 0.3);
  
  // Aplicar perspectiva em Z (ponto de fuga no fundo)
  const scaleZ = viewerDistance / (viewerDistance + point3D.z);
  
  // Y mantém a escala básica da perspectiva
  const scaleY = viewerDistance / (viewerDistance + point3D.z);
  
  const perspectiveX = point3D.x * scaleX + point3D.z * Math.cos(Math.PI / 4) * 0.5;
  const perspectiveY = point3D.y * scaleY;
  
  return {
    x: Math.round(perspectiveX),
    y: Math.round(perspectiveY)
  };
}

function threePointPerspective(point3D: Point3D, viewerDistance: number, fov: number): Point {
  const fovRad = (fov * Math.PI) / 180;
  
  // Três pontos de fuga: X (horizontal), Y (vertical), Z (profundidade)
  const vanishingDistanceH = viewerDistance * 1.5; // Ponto de fuga horizontal
  const vanishingDistanceV = viewerDistance * 2.0; // Ponto de fuga vertical
  const vanishingDistanceD = viewerDistance;       // Ponto de fuga de profundidade
  
  // Aplicar perspectiva para cada eixo com seu próprio ponto de fuga
  const scaleX = vanishingDistanceH / (vanishingDistanceH + point3D.z + point3D.x * 0.2);
  const scaleY = vanishingDistanceV / (vanishingDistanceV + point3D.z + Math.abs(point3D.y) * 0.3);
  const scaleZ = vanishingDistanceD / (vanishingDistanceD + point3D.z);
  
  // Aplicar transformações com influência dos três eixos
  const perspectiveX = point3D.x * scaleX + point3D.z * Math.cos(fovRad) * 0.3;
  const perspectiveY = point3D.y * scaleY + point3D.z * Math.sin(fovRad) * 0.2 + 
                       (point3D.y > 10 ? -point3D.y * 0.1 : point3D.y * 0.1);
  
  return {
    x: Math.round(perspectiveX),
    y: Math.round(perspectiveY)
  };
}

export function projectPoint3DArray(
  points3D: Point3D[], 
  params: PerspectiveProjectionParams,
  type: PerspectiveType = PerspectiveType.ONE_POINT
): Point[] {
  return points3D.map(point => perspectiveProjection(point, params, type));
}

export interface Cube3D {
  center: Point3D;
  size: number;
}

export function generateCubeVertices(cube: Cube3D): Point3D[] {
  const { center, size } = cube;
  const half = size / 2;
  
  return [
    { x: center.x - half, y: center.y - half, z: center.z - half },
    { x: center.x + half, y: center.y - half, z: center.z - half },
    { x: center.x + half, y: center.y + half, z: center.z - half },
    { x: center.x - half, y: center.y + half, z: center.z - half },
    { x: center.x - half, y: center.y - half, z: center.z + half },
    { x: center.x + half, y: center.y - half, z: center.z + half },
    { x: center.x + half, y: center.y + half, z: center.z + half },
    { x: center.x - half, y: center.y + half, z: center.z + half }
  ];
}

export function projectCube(
  cube: Cube3D, 
  params: PerspectiveProjectionParams,
  type: PerspectiveType = PerspectiveType.ONE_POINT
): Point[] {
  const vertices3D = generateCubeVertices(cube);
  return projectPoint3DArray(vertices3D, params, type);
}

export interface Pyramid3D {
  base: Point3D[];
  apex: Point3D;
}

export function projectPyramid(
  pyramid: Pyramid3D, 
  params: PerspectiveProjectionParams,
  type: PerspectiveType = PerspectiveType.ONE_POINT
): Point[] {
  const allVertices = [...pyramid.base, pyramid.apex];
  return projectPoint3DArray(allVertices, params, type);
}

export function getCubeEdges(): number[][] {
  return [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
}

export interface Line {
  p1: Point;
  p2: Point;
}

export function getProjectedCubeLines(
  cube: Cube3D, 
  params: PerspectiveProjectionParams,
  type: PerspectiveType = PerspectiveType.ONE_POINT
): Line[] {
  const projectedVertices = projectCube(cube, params, type);
  const edges = getCubeEdges();
  
  return edges.map(([start, end]) => ({
    p1: projectedVertices[start],
    p2: projectedVertices[end]
  }));
}