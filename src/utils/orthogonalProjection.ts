import { Point, Line } from './transformations';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export enum ProjectionType {
  FRONT = 'front',
  TOP = 'top',
  SIDE = 'side',
  ISOMETRIC = 'isometric'
}

export function orthogonalProjection(point3D: Point3D, type: ProjectionType): Point {
  switch (type) {
    case ProjectionType.FRONT:
      return {
        x: Math.round(point3D.x),
        y: Math.round(point3D.y)
      };
    
    case ProjectionType.TOP:
      return {
        x: Math.round(point3D.x),
        y: Math.round(point3D.z)
      };
    
    case ProjectionType.SIDE:
      return {
        x: Math.round(point3D.z),
        y: Math.round(point3D.y)
      };
    
    case ProjectionType.ISOMETRIC:
      const isoX = (point3D.x - point3D.z) * Math.cos(Math.PI / 6);
      const isoY = point3D.y + (point3D.x + point3D.z) * Math.sin(Math.PI / 6);
      return {
        x: Math.round(isoX),
        y: Math.round(isoY)
      };
    
    default:
      return { x: 0, y: 0 };
  }
}

export function projectPoint3DArray(points3D: Point3D[], type: ProjectionType): Point[] {
  return points3D.map(point => orthogonalProjection(point, type));
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

export function projectCube(cube: Cube3D, type: ProjectionType): Point[] {
  const vertices3D = generateCubeVertices(cube);
  return projectPoint3DArray(vertices3D, type);
}

export interface Pyramid3D {
  base: Point3D[];
  apex: Point3D;
}

export function projectPyramid(pyramid: Pyramid3D, type: ProjectionType): Point[] {
  const allVertices = [...pyramid.base, pyramid.apex];
  return projectPoint3DArray(allVertices, type);
}

export function getCubeEdges(): number[][] {
  return [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
}

export function getProjectedCubeLines(cube: Cube3D, type: ProjectionType): Line[] {
  const projectedVertices = projectCube(cube, type);
  const edges = getCubeEdges();
  
  return edges.map(([start, end]) => ({
    p1: projectedVertices[start],
    p2: projectedVertices[end]
  }));
}