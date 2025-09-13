import { Point } from './transformations';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CavalierProjectionParams {
  angle: number;
  scaleFactor: number;
}

export enum CavalierType {
  STANDARD = 'standard',
  CABINET = 'cabinet',
  CUSTOM = 'custom'
}

export function cavalierProjection(
  point3D: Point3D, 
  params: CavalierProjectionParams,
  type: CavalierType = CavalierType.STANDARD
): Point {
  const { angle, scaleFactor } = getProjectionParams(type, params);
  
  const angleRad = (angle * Math.PI) / 180;
  
  const x = point3D.x + point3D.z * Math.cos(angleRad) * scaleFactor;
  const y = point3D.y + point3D.z * Math.sin(angleRad) * scaleFactor;
  
  return {
    x: Math.round(x),
    y: Math.round(y)
  };
}

function getProjectionParams(
  type: CavalierType, 
  customParams: CavalierProjectionParams
): CavalierProjectionParams {
  switch (type) {
    case CavalierType.STANDARD:
      return {
        angle: 45,
        scaleFactor: 1.0
      };
    
    case CavalierType.CABINET:
      return {
        angle: 45,
        scaleFactor: 0.5
      };
    
    case CavalierType.CUSTOM:
      return customParams;
    
    default:
      return {
        angle: 45,
        scaleFactor: 1.0
      };
  }
}

export function projectPoint3DArray(
  points3D: Point3D[], 
  params: CavalierProjectionParams,
  type: CavalierType = CavalierType.STANDARD
): Point[] {
  return points3D.map(point => cavalierProjection(point, params, type));
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
  params: CavalierProjectionParams,
  type: CavalierType = CavalierType.STANDARD
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
  params: CavalierProjectionParams,
  type: CavalierType = CavalierType.STANDARD
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
  params: CavalierProjectionParams,
  type: CavalierType = CavalierType.STANDARD
): Line[] {
  const projectedVertices = projectCube(cube, params, type);
  const edges = getCubeEdges();
  
  return edges.map(([start, end]) => ({
    p1: projectedVertices[start],
    p2: projectedVertices[end]
  }));
}