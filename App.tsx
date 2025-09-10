import { StatusBar } from 'expo-status-bar';
import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Dimensions, Switch, Animated } from 'react-native';
import { PaperProvider, Text, Button, TextInput, IconButton, Divider } from 'react-native-paper';
import { bresenhamLine } from './src/utils/bresenham';
import { bresenhamCircle } from './src/utils/circle';
import { bresenhamEllipse } from './src/utils/ellipse';
import { bezierGeneric } from './src/utils/bezier';
import { recursiveFill } from './src/utils/recursiveFill';
import { scanlineFill } from './src/utils/scanlineFill';
import { cohenSutherland } from './src/utils/cohenSutherland';
import { sutherlandHodgman, Point as SutherlandPoint } from './src/utils/sutherlandHodgman';
import { 
  rotatePolygon, 
  translatePolygon, 
  scalePolygon, 
  rotateCircle, 
  translateCircle, 
  scaleCircle, 
  rotatePoint, 
  translatePoint, 
  scalePoint, 
  rotateLine, 
  translateLine, 
  scaleLine, 
  rotateBezier, 
  translateBezier, 
  scaleBezier, 
  isPointInsideCircle, 
  isPointInsidePolygon, 
  isPointNearLine 
} from './src/utils/transformations';

const GRID_SIZE = 20;

interface Point {
  x: number;
  y: number;
}

type Shape = 
  | { type: 'line', p1: Point, p2: Point }
  | { type: 'circle', center: Point, radius: number }
  | { type: 'ellipse', center: Point, radiusX: number, radiusY: number }
  | { type: 'bezier', vertices: Point[] }
  | { type: 'polyline', vertices: Point[] }
  | { type: 'polygon', vertices: Point[] }
  | { type: 'pixel', p: Point };

type Mode = 'pixel' | 'bresenham' | 'circle' | 'ellipse' | 'bezier' | 'polyline' | 'recursive_fill' | 'scanline_fill' | 'line_clipping' | 'polygon_clipping' | 'transformations';

export default function App() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [pixels, setPixels] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('pixel');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(0));
  
  const gridDimensions = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const sidebarWidth = sidebarVisible ? 240 : 0;
    const availableWidth = width - 60 - sidebarWidth;
    const availableHeight = height - 400;
    const gridWidth = availableWidth - 20;
    const gridHeight = availableHeight - 16;
    const maxCellWidth = Math.floor(gridWidth / GRID_SIZE);
    const maxCellHeight = Math.floor(gridHeight / GRID_SIZE);
    const cellSize = Math.min(maxCellWidth, maxCellHeight, 25);
    const minCellSize = 8;
    const finalCellSize = Math.max(cellSize, minCellSize);
    return {
      cellSize: finalCellSize,
      labelSize: Math.max(finalCellSize * 0.6, 8),
    };
  }, [sidebarVisible]);
  
  const [xInput, setXInput] = useState('');
  const [yInput, setYInput] = useState('');
  const [x1Input, setX1Input] = useState('');
  const [y1Input, setY1Input] = useState('');
  const [x2Input, setX2Input] = useState('');
  const [y2Input, setY2Input] = useState('');
  const [centerXInput, setCenterXInput] = useState('');
  const [centerYInput, setCenterYInput] = useState('');
  const [radiusInput, setRadiusInput] = useState('');
  const [ellipseCenterXInput, setEllipseCenterXInput] = useState('');
  const [ellipseCenterYInput, setEllipseCenterYInput] = useState('');
  const [ellipseRadiusXInput, setEllipseRadiusXInput] = useState('');
  const [ellipseRadiusYInput, setEllipseRadiusYInput] = useState('');
  const [bezierVertices, setBezierVertices] = useState<Point[]>([]);
  const [polylineVertices, setPolylineVertices] = useState<Point[]>([]);
  const [polygonVertices, setPolygonVertices] = useState<Point[]>([]);
  const [firstPoint, setFirstPoint] = useState<Point | null>(null);
  const [secondPoint, setSecondPoint] = useState<Point | null>(null);

  const [clippingWindow, setClippingWindow] = useState({ xmin: '5', ymin: '5', xmax: '15', ymax: '15' });
  const [clippingEnabled, setClippingEnabled] = useState(false);

  const [transformationInputs, setTransformationInputs] = useState({
    rotationAngle: '',
    rotationPivotX: '',
    rotationPivotY: '',
    translationDx: '',
    translationDy: '',
    scaleX: '',
    scaleY: ''
  });
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);

  const handleClippingWindowChange = (field: keyof typeof clippingWindow, value: string) => {
    setClippingWindow(prev => ({ ...prev, [field]: value }));
  };

  const handleTransformationInputChange = (field: keyof typeof transformationInputs, value: string) => {
    setTransformationInputs(prev => ({ ...prev, [field]: value }));
  };

  const applyRotation = () => {
    if (selectedShapeIndex === null) return;
    
    const angle = parseFloat(transformationInputs.rotationAngle);
    const pivotX = parseFloat(transformationInputs.rotationPivotX);
    const pivotY = parseFloat(transformationInputs.rotationPivotY);
    
    if (isNaN(angle) || isNaN(pivotX) || isNaN(pivotY)) return;
    
    const pivot = { x: pivotX, y: GRID_SIZE - 1 - pivotY };
    applyTransformationToShapeAndRelatedPixels('rotate', { angle, pivot });
  };

  const applyTranslation = () => {
    if (selectedShapeIndex === null) return;
    
    const dx = parseFloat(transformationInputs.translationDx);
    const dy = parseFloat(transformationInputs.translationDy);
    
    if (isNaN(dx) || isNaN(dy)) return;
    
    applyTransformationToShapeAndRelatedPixels('translate', { dx, dy: -dy });
  };

  const applyScale = () => {
    if (selectedShapeIndex === null) return;
    
    const scaleX = parseFloat(transformationInputs.scaleX);
    const scaleY = parseFloat(transformationInputs.scaleY);
    
    if (isNaN(scaleX) || isNaN(scaleY)) return;
    
    applyTransformationToShapeAndRelatedPixels('scale', { scaleX, scaleY });
  };

  const findPixelsRelatedToShape = (selectedShape: any, allShapes: any[]): number[] => {
    const relatedIndices: number[] = [];
    
    allShapes.forEach((shape, index) => {
      if (shape.type === 'pixel' && index !== selectedShapeIndex) {
        let isRelated = false;
        
        // Check if pixel is inside or near the selected shape
        if (selectedShape.type === 'circle') {
          isRelated = isPointInsideCircle(shape.p, { center: selectedShape.center, radius: selectedShape.radius });
        } else if (selectedShape.type === 'polygon') {
          isRelated = isPointInsidePolygon(shape.p, selectedShape.vertices);
        } else if (selectedShape.type === 'polyline') {
          // More sophisticated detection for polylines
          if (selectedShape.vertices.length > 0) {
            // Get bounding box with some padding
            const minX = Math.min(...selectedShape.vertices.map((v: Point) => v.x)) - 3;
            const maxX = Math.max(...selectedShape.vertices.map((v: Point) => v.x)) + 3;
            const minY = Math.min(...selectedShape.vertices.map((v: Point) => v.y)) - 3;
            const maxY = Math.max(...selectedShape.vertices.map((v: Point) => v.y)) + 3;
            
            // If pixel is within expanded bounding box, consider it related
            if (shape.p.x >= minX && shape.p.x <= maxX && shape.p.y >= minY && shape.p.y <= maxY) {
              isRelated = true;
            }
          }
        } else if (selectedShape.type === 'line') {
          isRelated = isPointNearLine(shape.p, { p1: selectedShape.p1, p2: selectedShape.p2 }, 3);
        } else if (selectedShape.type === 'bezier') {
          if (selectedShape.vertices.length > 0) {
            const minX = Math.min(...selectedShape.vertices.map((v: Point) => v.x)) - 2;
            const maxX = Math.max(...selectedShape.vertices.map((v: Point) => v.x)) + 2;
            const minY = Math.min(...selectedShape.vertices.map((v: Point) => v.y)) - 2;
            const maxY = Math.max(...selectedShape.vertices.map((v: Point) => v.y)) + 2;
            
            isRelated = shape.p.x >= minX && shape.p.x <= maxX && shape.p.y >= minY && shape.p.y <= maxY;
          }
        }
        
        if (isRelated) {
          relatedIndices.push(index);
        }
      }
    });
    
    return relatedIndices;
  };

  const applyTransformationToShapeAndRelatedPixels = (
    type: 'rotate' | 'translate' | 'scale',
    params: any
  ) => {
    if (selectedShapeIndex === null) return;
    const selectedShape = shapes[selectedShapeIndex];
    const newShapes = [...shapes];
    
    // Transform the main shape
    if (selectedShape.type === 'polygon' || selectedShape.type === 'polyline') {
      if (type === 'rotate') {
        const rotatedVertices = rotatePolygon(selectedShape.vertices, params.angle, params.pivot);
        newShapes[selectedShapeIndex] = { ...selectedShape, vertices: rotatedVertices };
      } else if (type === 'translate') {
        const translatedVertices = translatePolygon(selectedShape.vertices, params.dx, params.dy);
        newShapes[selectedShapeIndex] = { ...selectedShape, vertices: translatedVertices };
      } else if (type === 'scale') {
        const scaledVertices = scalePolygon(selectedShape.vertices, params.scaleX, params.scaleY);
        newShapes[selectedShapeIndex] = { ...selectedShape, vertices: scaledVertices };
      }
    } else if (selectedShape.type === 'circle') {
      if (type === 'rotate') {
        const rotatedCircle = rotateCircle({ center: selectedShape.center, radius: selectedShape.radius }, params.angle, params.pivot);
        newShapes[selectedShapeIndex] = { ...selectedShape, center: rotatedCircle.center };
      } else if (type === 'translate') {
        const translatedCircle = translateCircle({ center: selectedShape.center, radius: selectedShape.radius }, params.dx, params.dy);
        newShapes[selectedShapeIndex] = { ...selectedShape, center: translatedCircle.center };
      } else if (type === 'scale') {
        const scaledCircle = scaleCircle({ center: selectedShape.center, radius: selectedShape.radius }, params.scaleX, params.scaleY);
        newShapes[selectedShapeIndex] = { ...selectedShape, center: scaledCircle.center, radius: scaledCircle.radius };
      }
    } else if (selectedShape.type === 'line') {
      if (type === 'rotate') {
        const rotatedLine = rotateLine({ p1: selectedShape.p1, p2: selectedShape.p2 }, params.angle, params.pivot);
        newShapes[selectedShapeIndex] = { ...selectedShape, p1: rotatedLine.p1, p2: rotatedLine.p2 };
      } else if (type === 'translate') {
        const translatedLine = translateLine({ p1: selectedShape.p1, p2: selectedShape.p2 }, params.dx, params.dy);
        newShapes[selectedShapeIndex] = { ...selectedShape, p1: translatedLine.p1, p2: translatedLine.p2 };
      } else if (type === 'scale') {
        const scaledLine = scaleLine({ p1: selectedShape.p1, p2: selectedShape.p2 }, params.scaleX, params.scaleY);
        newShapes[selectedShapeIndex] = { ...selectedShape, p1: scaledLine.p1, p2: scaledLine.p2 };
      }
    } else if (selectedShape.type === 'bezier') {
      if (type === 'rotate') {
        const rotatedVertices = rotateBezier(selectedShape.vertices, params.angle, params.pivot);
        newShapes[selectedShapeIndex] = { ...selectedShape, vertices: rotatedVertices };
      } else if (type === 'translate') {
        const translatedVertices = translateBezier(selectedShape.vertices, params.dx, params.dy);
        newShapes[selectedShapeIndex] = { ...selectedShape, vertices: translatedVertices };
      } else if (type === 'scale') {
        const scaledVertices = scaleBezier(selectedShape.vertices, params.scaleX, params.scaleY);
        newShapes[selectedShapeIndex] = { ...selectedShape, vertices: scaledVertices };
      }
    } else if (selectedShape.type === 'pixel') {
      if (type === 'rotate') {
        const rotatedPoint = rotatePoint(selectedShape.p, params.angle, params.pivot);
        newShapes[selectedShapeIndex] = { ...selectedShape, p: rotatedPoint };
      } else if (type === 'translate') {
        const translatedPoint = translatePoint(selectedShape.p, params.dx, params.dy);
        newShapes[selectedShapeIndex] = { ...selectedShape, p: translatedPoint };
      } else if (type === 'scale') {
        const scaledPoint = scalePoint(selectedShape.p, params.scaleX, params.scaleY, { x: 0, y: 0 });
        newShapes[selectedShapeIndex] = { ...selectedShape, p: scaledPoint };
      }
    }

    // Find all pixels related to the selected shape
    const relatedPixelIndices = findPixelsRelatedToShape(selectedShape, shapes);

    // Transform related pixels
    relatedPixelIndices.forEach(index => {
      const pixelShape = shapes[index];
      if (pixelShape.type === 'pixel') {
        if (type === 'rotate') {
          const rotatedPoint = rotatePoint(pixelShape.p, params.angle, params.pivot);
          newShapes[index] = { ...pixelShape, p: rotatedPoint };
        } else if (type === 'translate') {
          const translatedPoint = translatePoint(pixelShape.p, params.dx, params.dy);
          newShapes[index] = { ...pixelShape, p: translatedPoint };
        } else if (type === 'scale') {
          // For related pixels, use the same fixed point as the parent shape
          let fixedPoint: Point;
          if (selectedShape.type === 'circle') {
            fixedPoint = selectedShape.center;
          } else if (selectedShape.type === 'polygon' || selectedShape.type === 'polyline' || selectedShape.type === 'bezier') {
            const centerX = selectedShape.vertices.reduce((sum, v) => sum + v.x, 0) / selectedShape.vertices.length;
            const centerY = selectedShape.vertices.reduce((sum, v) => sum + v.y, 0) / selectedShape.vertices.length;
            fixedPoint = { x: Math.round(centerX), y: Math.round(centerY) };
          } else if (selectedShape.type === 'line') {
            fixedPoint = {
              x: Math.round((selectedShape.p1.x + selectedShape.p2.x) / 2),
              y: Math.round((selectedShape.p1.y + selectedShape.p2.y) / 2)
            };
          } else {
            fixedPoint = { x: 0, y: 0 };
          }
          const scaledPoint = scalePoint(pixelShape.p, params.scaleX, params.scaleY, fixedPoint);
          newShapes[index] = { ...pixelShape, p: scaledPoint };
        }
      }
    });

    setShapes(newShapes);
  };

  const toggleSidebar = () => {
    const toValue = sidebarVisible ? 0 : 1;
    setSidebarVisible(!sidebarVisible);
    Animated.timing(sidebarAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const selectMode = (newMode: Mode) => {
    setMode(newMode);
    toggleSidebar();
  };

  const renderShapes = () => {
    const newPixels = new Set<string>();
    const clipRect = clippingEnabled ? {
      xmin: parseInt(clippingWindow.xmin),
      ymin: GRID_SIZE - 1 - parseInt(clippingWindow.ymax),
      xmax: parseInt(clippingWindow.xmax),
      ymax: GRID_SIZE - 1 - parseInt(clippingWindow.ymin)
    } : null;

    shapes.forEach(shape => {
      if (shape.type === 'pixel') {
        newPixels.add(`${shape.p.x},${shape.p.y}`);
      } else if (shape.type === 'line') {
        let linePoints: Point[];
        if (clipRect) {
          const clipped = cohenSutherland(shape.p1.x, shape.p1.y, shape.p2.x, shape.p2.y, clipRect.xmin, clipRect.ymin, clipRect.xmax, clipRect.ymax);
          if (clipped) {
            linePoints = bresenhamLine(clipped.x1, clipped.y1, clipped.x2, clipped.y2);
          } else {
            linePoints = [];
          }
        } else {
          linePoints = bresenhamLine(shape.p1.x, shape.p1.y, shape.p2.x, shape.p2.y);
        }
        linePoints.forEach(p => newPixels.add(`${p.x},${p.y}`));
      } else if (shape.type === 'circle') {
        const circlePoints = bresenhamCircle(shape.center.x, shape.center.y, shape.radius);
        circlePoints.forEach(p => newPixels.add(`${p.x},${p.y}`));
      } else if (shape.type === 'ellipse') {
        const ellipsePoints = bresenhamEllipse(shape.center.x, shape.center.y, shape.radiusX, shape.radiusY);
        ellipsePoints.forEach(p => newPixels.add(`${p.x},${p.y}`));
      } else if (shape.type === 'bezier') {
        const curvePoints = bezierGeneric(shape.vertices);
        curvePoints.forEach(p => newPixels.add(`${p.x},${p.y}`));
      } else if (shape.type === 'polyline') {
        for (let i = 0; i < shape.vertices.length; i++) {
          const startVertex = shape.vertices[i];
          const endVertex = shape.vertices[(i + 1) % shape.vertices.length];
          let linePoints: Point[];
          if (clipRect) {
            const clipped = cohenSutherland(startVertex.x, startVertex.y, endVertex.x, endVertex.y, clipRect.xmin, clipRect.ymin, clipRect.xmax, clipRect.ymax);
            if (clipped) {
              linePoints = bresenhamLine(clipped.x1, clipped.y1, clipped.x2, clipped.y2);
            } else {
              linePoints = [];
            }
          } else {
            linePoints = bresenhamLine(startVertex.x, startVertex.y, endVertex.x, endVertex.y);
          }
          linePoints.forEach(p => newPixels.add(`${p.x},${p.y}`));
        }
      } else if (shape.type === 'polygon') {
        let vertices = shape.vertices;
        if (clipRect) {
          vertices = sutherlandHodgman(vertices, clipRect.xmin, clipRect.ymin, clipRect.xmax, clipRect.ymax);
        }
        for (let i = 0; i < vertices.length; i++) {
          const startVertex = vertices[i];
          const endVertex = vertices[(i + 1) % vertices.length];
          const linePoints = bresenhamLine(startVertex.x, startVertex.y, endVertex.x, endVertex.y);
          linePoints.forEach(p => newPixels.add(`${p.x},${p.y}`));
        }
      }
    });
    setPixels(newPixels);
  };

  useEffect(() => {
    renderShapes();
  }, [shapes, clippingEnabled, clippingWindow]);

  useEffect(() => {
    setFirstPoint(null);
    setSecondPoint(null);
    setBezierVertices([]);
    setPolylineVertices([]);
    setPolygonVertices([]);
    setXInput('');
    setYInput('');
    setX1Input('');
    setY1Input('');
    setX2Input('');
    setY2Input('');
    setCenterXInput('');
    setCenterYInput('');
    setRadiusInput('');
    setEllipseCenterXInput('');
    setEllipseCenterYInput('');
    setEllipseRadiusXInput('');
    setEllipseRadiusYInput('');
  }, [mode]);

  const addShape = (shape: Shape) => {
    setShapes(prev => [...prev, shape]);
  };

  const addPixel = () => {
    const x = parseInt(xInput);
    const y = parseInt(yInput);
    if (isNaN(x) || isNaN(y)) return;
    addShape({ type: 'pixel', p: { x: x, y: GRID_SIZE - 1 - y } });
    setXInput('');
    setYInput('');
  };
  
  const drawBresenhamLine = () => {
    const x1 = parseInt(x1Input);
    const y1 = parseInt(y1Input);
    const x2 = parseInt(x2Input);
    const y2 = parseInt(y2Input);
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;
    addShape({ type: 'line', p1: { x: x1, y: GRID_SIZE - 1 - y1 }, p2: { x: x2, y: GRID_SIZE - 1 - y2 } });
  };

  const drawCircle = () => {
    const centerX = parseInt(centerXInput);
    const centerY = parseInt(centerYInput);
    const radius = parseInt(radiusInput);
    if (isNaN(centerX) || isNaN(centerY) || isNaN(radius) || radius < 0) return;
    addShape({ type: 'circle', center: { x: centerX, y: GRID_SIZE - 1 - centerY }, radius });
  };

  const drawEllipse = () => {
    const centerX = parseInt(ellipseCenterXInput);
    const centerY = parseInt(ellipseCenterYInput);
    const radiusX = parseInt(ellipseRadiusXInput);
    const radiusY = parseInt(ellipseRadiusYInput);
    if (isNaN(centerX) || isNaN(centerY) || isNaN(radiusX) || isNaN(radiusY) || radiusX < 0 || radiusY < 0) return;
    addShape({ type: 'ellipse', center: { x: centerX, y: GRID_SIZE - 1 - centerY }, radiusX, radiusY });
  };

  const drawBezierCurve = () => {
    if (bezierVertices.length < 2) return;
    addShape({ type: 'bezier', vertices: bezierVertices });
    setBezierVertices([]);
  };

  const drawPolyline = () => {
    if (polylineVertices.length < 2) return;
    addShape({ type: 'polyline', vertices: polylineVertices });
    setPolylineVertices([]);
  };

  const drawPolygon = () => {
    if (polygonVertices.length < 3) return;
    addShape({ type: 'polygon', vertices: polygonVertices });
    setPolygonVertices([]);
  };

  const clearGrid = () => {
    setShapes([]);
    setPixels(new Set());
    setFirstPoint(null);
    setSecondPoint(null);
    setBezierVertices([]);
    setPolylineVertices([]);
    setPolygonVertices([]);
  };

  const handleCellClick = (x: number, y: number) => {
    if (mode === 'pixel') {
      const pixelExists = shapes.some(shape => shape.type === 'pixel' && shape.p.x === x && shape.p.y === y);
      if (pixelExists) {
        setShapes(prev => prev.filter(shape => !(shape.type === 'pixel' && shape.p.x === x && shape.p.y === y)));
      } else {
        addShape({ type: 'pixel', p: { x, y } });
      }
    } else if (mode === 'bresenham') {
      if (!firstPoint) {
        setFirstPoint({x, y});
      } else {
        addShape({ type: 'line', p1: firstPoint, p2: { x, y } });
        setFirstPoint(null);
      }
    } else if (mode === 'circle') {
      if (!firstPoint) {
        setFirstPoint({x, y});
      } else {
        const radius = Math.round(Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)));
        addShape({ type: 'circle', center: firstPoint, radius });
        setFirstPoint(null);
      }
    } else if (mode === 'ellipse') {
      if (!firstPoint) {
        setFirstPoint({x, y});
      } else if (!secondPoint) {
        setSecondPoint({x, y});
      } else {
        const radiusX = Math.abs(x - firstPoint.x);
        const radiusY = Math.abs(y - firstPoint.y);
        addShape({ type: 'ellipse', center: firstPoint, radiusX, radiusY });
        setFirstPoint(null);
        setSecondPoint(null);
      }
    } else if (mode === 'bezier') {
      setBezierVertices([...bezierVertices, {x, y}]);
    } else if (mode === 'polyline') {
      setPolylineVertices([...polylineVertices, {x, y}]);
    } else if (mode === 'polygon_clipping') {
      setPolygonVertices([...polygonVertices, {x, y}]);
    } else if (mode === 'transformations') {
      // Check if clicking on an existing shape to select it
      // Process in priority order: complex shapes first, pixels last
      const shapePriorities = ['polygon', 'polyline', 'circle', 'line', 'bezier', 'pixel'];
      
      for (const shapeType of shapePriorities) {
        for (let i = shapes.length - 1; i >= 0; i--) {
          const shape = shapes[i];
          if (shape.type !== shapeType) continue;
          
          let isNearShape = false;
          
          if (shape.type === 'polygon' || shape.type === 'polyline') {
            // For polylines/polygons, check if click is on any vertex OR if there's a filled pixel at this location
            // that could be part of this shape
            const nearVertex = shape.vertices.some(vertex => 
              Math.abs(vertex.x - x) <= 1 && Math.abs(vertex.y - y) <= 1
            );
            
            // Also check if clicking on a filled area inside the shape
            const isInsideShape = shape.type === 'polygon' ? 
              isPointInsidePolygon({ x, y }, shape.vertices) : false;
              
            // For polylines, check if near the outline or if we're clicking on a filled area
            let nearPolylineArea = false;
            
            if (shape.type === 'polyline') {
              // Check if near any edge of the polyline
              const nearEdge = shape.vertices.some((vertex, idx) => {
                const nextVertex = shape.vertices[(idx + 1) % shape.vertices.length];
                return isPointNearLine({ x, y }, { p1: vertex, p2: nextVertex }, 2);
              });
              
              // For polylines, be more permissive - if there's ANY pixel at this location
              // and the click is reasonably close to the polyline area, consider it part of the polyline
              const hasPixelHere = shapes.some(otherShape => 
                otherShape.type === 'pixel' && 
                otherShape.p.x === x && 
                otherShape.p.y === y
              );
              
              // Check if the click is within the bounding area of the polyline
              if (hasPixelHere && shape.vertices.length > 0) {
                const minX = Math.min(...shape.vertices.map(v => v.x));
                const maxX = Math.max(...shape.vertices.map(v => v.x));
                const minY = Math.min(...shape.vertices.map(v => v.y));
                const maxY = Math.max(...shape.vertices.map(v => v.y));
                
                const withinBounds = x >= minX - 2 && x <= maxX + 2 && y >= minY - 2 && y <= maxY + 2;
                nearPolylineArea = withinBounds;
              } else {
                nearPolylineArea = nearEdge;
              }
            }
            
            isNearShape = nearVertex || isInsideShape || nearPolylineArea;
            
          } else if (shape.type === 'circle') {
            // Check if click is near the center, on perimeter, or inside the circle
            const distanceFromCenter = Math.sqrt(
              Math.pow(shape.center.x - x, 2) + Math.pow(shape.center.y - y, 2)
            );
            isNearShape = distanceFromCenter <= shape.radius + 1;
            
          } else if (shape.type === 'line') {
            // Check if click is near the line
            isNearShape = isPointNearLine({ x, y }, { p1: shape.p1, p2: shape.p2 }, 1);
            
          } else if (shape.type === 'bezier') {
            // Check if click is near any vertex of the bezier curve
            isNearShape = shape.vertices.some(vertex => 
              Math.abs(vertex.x - x) <= 1 && Math.abs(vertex.y - y) <= 1
            );
            
          } else if (shape.type === 'pixel') {
            // Check if click is exactly on the pixel (lowest priority)
            isNearShape = shape.p.x === x && shape.p.y === y;
          }
          
          if (isNearShape) {
            setSelectedShapeIndex(i);
            return;
          }
        }
      }
      setSelectedShapeIndex(null);
    } else if (mode === 'recursive_fill' || mode === 'scanline_fill') {
      const fillFn = mode === 'recursive_fill' ? recursiveFill : scanlineFill;
      const currentPixels = new Set<string>();
      shapes.forEach(shape => {
        if (shape.type === 'pixel') {
          currentPixels.add(`${shape.p.x},${shape.p.y}`);
        } else if (shape.type === 'line') {
          const linePoints = bresenhamLine(shape.p1.x, shape.p1.y, shape.p2.x, shape.p2.y);
          linePoints.forEach(p => currentPixels.add(`${p.x},${p.y}`));
        } else if (shape.type === 'circle') {
          const circlePoints = bresenhamCircle(shape.center.x, shape.center.y, shape.radius);
          circlePoints.forEach(p => currentPixels.add(`${p.x},${p.y}`));
        } else if (shape.type === 'ellipse') {
          const ellipsePoints = bresenhamEllipse(shape.center.x, shape.center.y, shape.radiusX, shape.radiusY);
          ellipsePoints.forEach(p => currentPixels.add(`${p.x},${p.y}`));
        } else if (shape.type === 'bezier') {
          const curvePoints = bezierGeneric(shape.vertices);
          curvePoints.forEach(p => currentPixels.add(`${p.x},${p.y}`));
        } else if (shape.type === 'polyline') {
          for (let i = 0; i < shape.vertices.length; i++) {
            const startVertex = shape.vertices[i];
            const endVertex = shape.vertices[(i + 1) % shape.vertices.length];
            const linePoints = bresenhamLine(startVertex.x, startVertex.y, endVertex.x, endVertex.y);
            linePoints.forEach(p => currentPixels.add(`${p.x},${p.y}`));
          }
        }
      });
      const filledPixels = fillFn(x, y, currentPixels, GRID_SIZE);
      const newPixelShapes = Array.from(filledPixels).map(p => {
        const [px, py] = p.split(',').map(Number);
        return { type: 'pixel' as const, p: { x: px, y: py } };
      });
      
      // Keep existing shapes and add the filled pixels
      setShapes(prevShapes => [...prevShapes, ...newPixelShapes]);
    }
  };

  const renderXLabels = () => {
    const labels = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      labels.push(
        <View key={x} style={{ width: gridDimensions.cellSize + 1, height: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: Math.max(gridDimensions.labelSize, 8), color: '#666', fontWeight: '500' }}>{x}</Text>
        </View>
      );
    }
    return labels;
  };

  const renderGrid = () => {
    const grid = [];
    const { xmin, ymin, xmax, ymax } = clippingWindow;
    const clipRect = clippingEnabled ? {
      xmin: parseInt(xmin),
      ymin: GRID_SIZE - 1 - parseInt(ymax),
      xmax: parseInt(xmax),
      ymax: GRID_SIZE - 1 - parseInt(ymin)
    } : null;

    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const key = `${x},${y}`;
        const isActive = pixels.has(key);
        const isFirstPoint = firstPoint && firstPoint.x === x && firstPoint.y === y;
        const isSecondPoint = secondPoint && secondPoint.x === x && secondPoint.y === y;
        
        const bezierVertexIndex = bezierVertices.findIndex(vertex => vertex.x === x && vertex.y === y);
        const isBezierVertex = bezierVertexIndex !== -1;
        
        const polylineVertexIndex = polylineVertices.findIndex(vertex => vertex.x === x && vertex.y === y);
        const isPolylineVertex = polylineVertexIndex !== -1;

        const polygonVertexIndex = polygonVertices.findIndex(vertex => vertex.x === x && vertex.y === y);
        const isPolygonVertex = polygonVertexIndex !== -1;

        let isSelectedShape = false;
        let isRelatedToSelected = false;
        
        if (selectedShapeIndex !== null && shapes[selectedShapeIndex]) {
          const selectedShape = shapes[selectedShapeIndex];
          if (selectedShape.type === 'polygon' || selectedShape.type === 'polyline') {
            isSelectedShape = selectedShape.vertices.some(vertex => vertex.x === x && vertex.y === y);
          } else if (selectedShape.type === 'bezier') {
            isSelectedShape = selectedShape.vertices.some(vertex => vertex.x === x && vertex.y === y);
          } else if (selectedShape.type === 'line') {
            isSelectedShape = (selectedShape.p1.x === x && selectedShape.p1.y === y) ||
                             (selectedShape.p2.x === x && selectedShape.p2.y === y) ||
                             isPointNearLine({ x, y }, { p1: selectedShape.p1, p2: selectedShape.p2 }, 0.5);
          } else if (selectedShape.type === 'pixel') {
            isSelectedShape = selectedShape.p.x === x && selectedShape.p.y === y;
          } else if (selectedShape.type === 'circle') {
            // Highlight center and perimeter of selected circle
            const distanceFromCenter = Math.sqrt(
              Math.pow(selectedShape.center.x - x, 2) + Math.pow(selectedShape.center.y - y, 2)
            );
            isSelectedShape = (Math.abs(selectedShape.center.x - x) <= 0 && Math.abs(selectedShape.center.y - y) <= 0) ||
                             (Math.abs(distanceFromCenter - selectedShape.radius) <= 0.5);
          }

          // Check if current position has a pixel that would be transformed with the selected shape
          if (!isSelectedShape) {
            const currentPixelShape = shapes.find(shape => 
              shape.type === 'pixel' && shape.p.x === x && shape.p.y === y
            );
            
            if (currentPixelShape) {
              // Use the same logic as the transformation to detect related pixels
              if (selectedShape.type === 'circle') {
                isRelatedToSelected = isPointInsideCircle({ x, y }, { center: selectedShape.center, radius: selectedShape.radius });
              } else if (selectedShape.type === 'polygon') {
                isRelatedToSelected = isPointInsidePolygon({ x, y }, selectedShape.vertices);
              } else if (selectedShape.type === 'polyline') {
                if (selectedShape.vertices.length > 0) {
                  const minX = Math.min(...selectedShape.vertices.map((v: Point) => v.x)) - 3;
                  const maxX = Math.max(...selectedShape.vertices.map((v: Point) => v.x)) + 3;
                  const minY = Math.min(...selectedShape.vertices.map((v: Point) => v.y)) - 3;
                  const maxY = Math.max(...selectedShape.vertices.map((v: Point) => v.y)) + 3;
                  
                  isRelatedToSelected = x >= minX && x <= maxX && y >= minY && y <= maxY;
                }
              } else if (selectedShape.type === 'line') {
                isRelatedToSelected = isPointNearLine({ x, y }, { p1: selectedShape.p1, p2: selectedShape.p2 }, 3);
              } else if (selectedShape.type === 'bezier') {
                if (selectedShape.vertices.length > 0) {
                  const minX = Math.min(...selectedShape.vertices.map((v: Point) => v.x)) - 2;
                  const maxX = Math.max(...selectedShape.vertices.map((v: Point) => v.x)) + 2;
                  const minY = Math.min(...selectedShape.vertices.map((v: Point) => v.y)) - 2;
                  const maxY = Math.max(...selectedShape.vertices.map((v: Point) => v.y)) + 2;
                  
                  isRelatedToSelected = x >= minX && x <= maxX && y >= minY && y <= maxY;
                }
              }
            }
          }
        }

        let cellStyle: any = styles.inactiveCell;
        if (isActive) cellStyle = styles.activeCell;
        if (isFirstPoint) cellStyle = styles.firstPointCell;
        if (isSecondPoint) cellStyle = styles.secondPointCell;
        if (isBezierVertex) {
            if (bezierVertexIndex === 0) cellStyle = styles.bezierStartCell;
            else if (bezierVertexIndex === bezierVertices.length - 1) cellStyle = styles.bezierEndCell;
            else cellStyle = styles.bezierControlCell;
        }
        if (isPolylineVertex) {
            if (polylineVertexIndex === 0) cellStyle = styles.polylineStartCell;
            else if (polylineVertexIndex === polylineVertices.length - 1) cellStyle = styles.polylineEndCell;
            else cellStyle = styles.polylineVertexCell;
        }
        if (isPolygonVertex) {
            cellStyle = styles.polygonVertexCell;
        }
        if (isSelectedShape) {
            cellStyle = styles.selectedShapeVertex;
        } else if (isRelatedToSelected) {
            cellStyle = styles.relatedPixel;
        }

        const isClippingBorder = clipRect && 
          (x === clipRect.xmin || x === clipRect.xmax || y === clipRect.ymin || y === clipRect.ymax) &&
          (x >= clipRect.xmin && x <= clipRect.xmax && y >= clipRect.ymin && y <= clipRect.ymax);

        row.push(
          <TouchableOpacity
            key={key}
            style={[
              { width: gridDimensions.cellSize, height: gridDimensions.cellSize, margin: 0.5, borderRadius: Math.max(gridDimensions.cellSize * 0.1, 2) },
              cellStyle,
              isClippingBorder && styles.clippingBorder
            ]}
            onPress={() => handleCellClick(x, y)}
          />
        );
      }
      grid.push(
        <View key={y} style={styles.gridRow}>
          <View style={{ width: 20, height: gridDimensions.cellSize + 1, alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
            <Text style={{ fontSize: Math.max(gridDimensions.labelSize, 8), color: '#666', fontWeight: '500' }}>{GRID_SIZE - 1 - y}</Text>
          </View>
          <View style={styles.rowCells}>{row}</View>
        </View>
      );
    }
    return grid;
  };

  return (
    <PaperProvider>
      <View style={styles.mainContainer}>
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [
                {
                  translateX: sidebarAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-240, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sidebarHeader}>
            <Text variant="titleLarge" style={styles.sidebarTitle}>Modos</Text>
            <IconButton icon="close" onPress={toggleSidebar} />
          </View>
          <Divider />
          <ScrollView style={styles.sidebarContent}>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'pixel' && styles.sidebarItemActive]} onPress={() => selectMode('pixel')}>
              <Text style={[styles.sidebarItemText, mode === 'pixel' && styles.sidebarItemTextActive]}>Adicionar Pixel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'bresenham' && styles.sidebarItemActive]} onPress={() => selectMode('bresenham')}>
              <Text style={[styles.sidebarItemText, mode === 'bresenham' && styles.sidebarItemTextActive]}>Bresenham</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'circle' && styles.sidebarItemActive]} onPress={() => selectMode('circle')}>
              <Text style={[styles.sidebarItemText, mode === 'circle' && styles.sidebarItemTextActive]}>Círculo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'ellipse' && styles.sidebarItemActive]} onPress={() => selectMode('ellipse')}>
              <Text style={[styles.sidebarItemText, mode === 'ellipse' && styles.sidebarItemTextActive]}>Elipse</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'bezier' && styles.sidebarItemActive]} onPress={() => selectMode('bezier')}>
              <Text style={[styles.sidebarItemText, mode === 'bezier' && styles.sidebarItemTextActive]}>Curva Bézier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'polyline' && styles.sidebarItemActive]} onPress={() => selectMode('polyline')}>
              <Text style={[styles.sidebarItemText, mode === 'polyline' && styles.sidebarItemTextActive]}>Polilinha</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'recursive_fill' && styles.sidebarItemActive]} onPress={() => selectMode('recursive_fill')}>
              <Text style={[styles.sidebarItemText, mode === 'recursive_fill' && styles.sidebarItemTextActive]}>Preenchimento Recursivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'scanline_fill' && styles.sidebarItemActive]} onPress={() => selectMode('scanline_fill')}>
              <Text style={[styles.sidebarItemText, mode === 'scanline_fill' && styles.sidebarItemTextActive]}>Preenchimento Varredura</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'line_clipping' && styles.sidebarItemActive]} onPress={() => selectMode('line_clipping')}>
              <Text style={[styles.sidebarItemText, mode === 'line_clipping' && styles.sidebarItemTextActive]}>Recorte de Linha</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'polygon_clipping' && styles.sidebarItemActive]} onPress={() => selectMode('polygon_clipping')}>
              <Text style={[styles.sidebarItemText, mode === 'polygon_clipping' && styles.sidebarItemTextActive]}>Recorte de Polígono</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sidebarItem, mode === 'transformations' && styles.sidebarItemActive]} onPress={() => selectMode('transformations')}>
              <Text style={[styles.sidebarItemText, mode === 'transformations' && styles.sidebarItemTextActive]}>Transformações</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.contentArea}>
          <View style={styles.container}>
            <View style={styles.header}>
              <IconButton icon="menu" onPress={toggleSidebar} />
              <Text variant="headlineMedium">Matrix Grid 20x20</Text>
              <View style={{ width: 48 }} />
            </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridWithYLabels}>{renderGrid()}</View>
            <View style={styles.xLabelsRow}>
              <View style={styles.cornerSpace} />
              <View style={styles.xLabelsContainer}>{renderXLabels()}</View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            {mode === 'pixel' && (
              <>
                <Text variant="bodySmall" style={styles.instructionText}>
                  Clique no grid para adicionar ou remover um pixel.
                </Text>
                <View style={styles.inputRow}>
                  <TextInput label="X" value={xInput} onChangeText={setXInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                  <TextInput label="Y" value={yInput} onChangeText={setYInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                </View>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={addPixel} style={styles.button}>Adicionar Pixel</Button>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </>
            )}
            
            {mode === 'line_clipping' && (
              <View style={{gap: 12}}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                  <Text variant="titleMedium">Ativar Recorte</Text>
                  <Switch value={clippingEnabled} onValueChange={setClippingEnabled} />
                </View>
                <Text variant="bodySmall" style={styles.instructionText}>
                  A janela de recorte será aplicada a todas as formas.
                </Text>
                <View style={{gap: 12}}>
                  <View style={styles.inputRow}>
                    <TextInput label="Xmin" value={clippingWindow.xmin} onChangeText={v => handleClippingWindowChange('xmin', v)} keyboardType="numeric" style={styles.input} mode="outlined" />
                    <TextInput label="Ymin" value={clippingWindow.ymin} onChangeText={v => handleClippingWindowChange('ymin', v)} keyboardType="numeric" style={styles.input} mode="outlined" />
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput label="Xmax" value={clippingWindow.xmax} onChangeText={v => handleClippingWindowChange('xmax', v)} keyboardType="numeric" style={styles.input} mode="outlined" />
                    <TextInput label="Ymax" value={clippingWindow.ymax} onChangeText={v => handleClippingWindowChange('ymax', v)} keyboardType="numeric" style={styles.input} mode="outlined" />
                  </View>
                </View>
                <View style={styles.buttonRow}>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </View>
            )}

            {mode === 'bresenham' && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Desenhar Linha (Bresenham)</Text>
                <Text variant="bodySmall" style={styles.instructionText}>
                  {firstPoint ? `Primeiro ponto: (${firstPoint.x}, ${GRID_SIZE - 1 - firstPoint.y}). Clique no segundo.` : 'Clique no grid para o primeiro ponto.'}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput label="X1" value={x1Input} onChangeText={setX1Input} keyboardType="numeric" style={styles.input} mode="outlined" />
                  <TextInput label="Y1" value={y1Input} onChangeText={setY1Input} keyboardType="numeric" style={styles.input} mode="outlined" />
                </View>
                <View style={styles.inputRow}>
                  <TextInput label="X2" value={x2Input} onChangeText={setX2Input} keyboardType="numeric" style={styles.input} mode="outlined" />
                  <TextInput label="Y2" value={y2Input} onChangeText={setY2Input} keyboardType="numeric" style={styles.input} mode="outlined" />
                </View>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={drawBresenhamLine} style={styles.button}>Desenhar</Button>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </>
            )}
            
            {mode === 'circle' && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Desenhar Círculo</Text>
                <Text variant="bodySmall" style={styles.instructionText}>
                  {firstPoint ? `Centro: (${firstPoint.x}, ${GRID_SIZE - 1 - firstPoint.y}). Clique para definir o raio.` : 'Clique no grid para definir o centro.'}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput label="Centro X" value={centerXInput} onChangeText={setCenterXInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                  <TextInput label="Centro Y" value={centerYInput} onChangeText={setCenterYInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                </View>
                <View style={styles.inputRow}>
                  <TextInput label="Raio" value={radiusInput} onChangeText={setRadiusInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                  <View style={{flex:1}}/>
                </View>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={drawCircle} style={styles.button}>Desenhar</Button>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </>
            )}
            
            {mode === 'ellipse' && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Desenhar Elipse</Text>
                <Text variant="bodySmall" style={styles.instructionText}>
                  {!firstPoint ? 'Clique no grid para definir o centro.' : 
                   !secondPoint ? `Centro: (${firstPoint.x}, ${GRID_SIZE - 1 - firstPoint.y}). Clique para definir o raio X.` :
                   `Centro: (${firstPoint.x}, ${GRID_SIZE - 1 - firstPoint.y}). Clique para definir o raio Y.`}
                </Text>
                <View style={styles.inputRow}>
                  <TextInput label="Centro X" value={ellipseCenterXInput} onChangeText={setEllipseCenterXInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                  <TextInput label="Centro Y" value={ellipseCenterYInput} onChangeText={setEllipseCenterYInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                </View>
                <View style={styles.inputRow}>
                  <TextInput label="Raio X" value={ellipseRadiusXInput} onChangeText={setEllipseRadiusXInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                  <TextInput label="Raio Y" value={ellipseRadiusYInput} onChangeText={setEllipseRadiusYInput} keyboardType="numeric" style={styles.input} mode="outlined" />
                </View>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={drawEllipse} style={styles.button}>Desenhar</Button>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </>
            )}
            
            {mode === 'bezier' && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Curva de Bézier ({bezierVertices.length} pontos)</Text>
                <Text variant="bodySmall" style={styles.instructionText}>Clique no grid para adicionar vértices.</Text>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={drawBezierCurve} style={styles.button} disabled={bezierVertices.length < 2}>Desenhar</Button>
                  <Button mode="outlined" onPress={() => setBezierVertices([])} style={styles.button}>Limpar Vértices</Button>
                </View>
                <View style={styles.buttonRow}>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </>
            )}
            
            {mode === 'polyline' && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Polilinha ({polylineVertices.length} pontos)</Text>
                <Text variant="bodySmall" style={styles.instructionText}>Clique no grid para adicionar vértices.</Text>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={drawPolyline} style={styles.button} disabled={polylineVertices.length < 2}>Desenhar</Button>
                  <Button mode="outlined" onPress={() => setPolylineVertices([])} style={styles.button}>Limpar Vértices</Button>
                </View>
                <View style={styles.buttonRow}>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </>
            )}

            {mode === 'polygon_clipping' && (
              <>
                <View style={{gap: 12}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Text variant="titleMedium">Ativar Recorte</Text>
                    <Switch value={clippingEnabled} onValueChange={setClippingEnabled} />
                  </View>
                  <Text variant="bodySmall" style={styles.instructionText}>
                    A janela de recorte será aplicada aos polígonos.
                  </Text>
                  <View style={{gap: 12}}>
                    <View style={styles.inputRow}>
                      <TextInput label="Xmin" value={clippingWindow.xmin} onChangeText={v => handleClippingWindowChange('xmin', v)} keyboardType="numeric" style={styles.input} mode="outlined" />
                      <TextInput label="Ymin" value={clippingWindow.ymin} onChangeText={v => handleClippingWindowChange('ymin', v)} keyboardType="numeric" style={styles.input} mode="outlined" />
                    </View>
                    <View style={styles.inputRow}>
                      <TextInput label="Xmax" value={clippingWindow.xmax} onChangeText={v => handleClippingWindowChange('xmax', v)} keyboardType="numeric" style={styles.input} mode="outlined" />
                      <TextInput label="Ymax" value={clippingWindow.ymax} onChangeText={v => handleClippingWindowChange('ymax', v)} keyboardType="numeric" style={styles.input} mode="outlined" />
                    </View>
                  </View>
                </View>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Recorte de Polígono ({polygonVertices.length} pontos)</Text>
                <Text variant="bodySmall" style={styles.instructionText}>Clique no grid para adicionar vértices.</Text>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={drawPolygon} style={styles.button} disabled={polygonVertices.length < 3}>Desenhar Polígono</Button>
                  <Button mode="outlined" onPress={() => setPolygonVertices([])} style={styles.button}>Limpar Vértices</Button>
                </View>
                <View style={styles.buttonRow}>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </>
            )}
            
            {(mode === 'recursive_fill' || mode === 'scanline_fill') && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>
                  {mode === 'recursive_fill' ? 'Preenchimento Recursivo' : 'Preenchimento por Varredura'}
                </Text>
                <Text variant="bodySmall" style={styles.instructionText}>Clique em uma área para preencher.</Text>
                <View style={styles.buttonRow}>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                </View>
              </>
            )}

            {mode === 'transformations' && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Transformações Geométricas</Text>
                <Text variant="bodySmall" style={styles.instructionText}>
                  Selecione uma forma (ponto, linha, círculo, polígono, polilinha ou curva de Bézier) clicando nela no grid. Pixels preenchidos dentro da forma se moverão junto!
                </Text>
                
                {selectedShapeIndex !== null && (
                  <Text variant="bodySmall" style={{...styles.instructionText, color: '#2196F3'}}>
                    Forma selecionada: {
                      shapes[selectedShapeIndex].type === 'polygon' ? 'Polígono' :
                      shapes[selectedShapeIndex].type === 'polyline' ? 'Polilinha' :
                      shapes[selectedShapeIndex].type === 'circle' ? 'Círculo' :
                      shapes[selectedShapeIndex].type === 'line' ? 'Linha' :
                      shapes[selectedShapeIndex].type === 'bezier' ? 'Curva de Bézier' :
                      shapes[selectedShapeIndex].type === 'pixel' ? 'Ponto' : 'Forma'
                    } #{selectedShapeIndex + 1}
                  </Text>
                )}

                <Text variant="bodyMedium" style={styles.sectionTitle}>Rotação</Text>
                <View style={styles.inputRow}>
                  <TextInput 
                    label="Ângulo (graus)" 
                    value={transformationInputs.rotationAngle} 
                    onChangeText={v => handleTransformationInputChange('rotationAngle', v)} 
                    keyboardType="numeric" 
                    style={styles.input} 
                    mode="outlined" 
                  />
                </View>
                <View style={styles.inputRow}>
                  <TextInput 
                    label="Pivô X" 
                    value={transformationInputs.rotationPivotX} 
                    onChangeText={v => handleTransformationInputChange('rotationPivotX', v)} 
                    keyboardType="numeric" 
                    style={styles.input} 
                    mode="outlined" 
                  />
                  <TextInput 
                    label="Pivô Y" 
                    value={transformationInputs.rotationPivotY} 
                    onChangeText={v => handleTransformationInputChange('rotationPivotY', v)} 
                    keyboardType="numeric" 
                    style={styles.input} 
                    mode="outlined" 
                  />
                </View>
                <View style={styles.buttonRow}>
                  <Button 
                    mode="contained" 
                    onPress={applyRotation} 
                    style={styles.button}
                    disabled={selectedShapeIndex === null}
                  >
                    Aplicar Rotação
                  </Button>
                </View>

                <Text variant="bodyMedium" style={styles.sectionTitle}>Translação</Text>
                <View style={styles.inputRow}>
                  <TextInput 
                    label="Deslocamento X" 
                    value={transformationInputs.translationDx} 
                    onChangeText={v => handleTransformationInputChange('translationDx', v)} 
                    keyboardType="numeric" 
                    style={styles.input} 
                    mode="outlined" 
                  />
                  <TextInput 
                    label="Deslocamento Y" 
                    value={transformationInputs.translationDy} 
                    onChangeText={v => handleTransformationInputChange('translationDy', v)} 
                    keyboardType="numeric" 
                    style={styles.input} 
                    mode="outlined" 
                  />
                </View>
                <View style={styles.buttonRow}>
                  <Button 
                    mode="contained" 
                    onPress={applyTranslation} 
                    style={styles.button}
                    disabled={selectedShapeIndex === null}
                  >
                    Aplicar Translação
                  </Button>
                </View>

                <Text variant="bodyMedium" style={styles.sectionTitle}>Escala</Text>
                <Text variant="bodySmall" style={styles.instructionText}>
                  A escala será aplicada em relação ao centro da forma.
                </Text>
                <View style={styles.inputRow}>
                  <TextInput 
                    label="Fator X" 
                    value={transformationInputs.scaleX} 
                    onChangeText={v => handleTransformationInputChange('scaleX', v)} 
                    keyboardType="numeric" 
                    style={styles.input} 
                    mode="outlined" 
                  />
                  <TextInput 
                    label="Fator Y" 
                    value={transformationInputs.scaleY} 
                    onChangeText={v => handleTransformationInputChange('scaleY', v)} 
                    keyboardType="numeric" 
                    style={styles.input} 
                    mode="outlined" 
                  />
                </View>
                <View style={styles.buttonRow}>
                  <Button 
                    mode="contained" 
                    onPress={applyScale} 
                    style={styles.button}
                    disabled={selectedShapeIndex === null}
                  >
                    Aplicar Escala
                  </Button>
                </View>

                <View style={styles.buttonRow}>
                  <Button mode="outlined" onPress={clearGrid} style={styles.button}>Limpar Grid</Button>
                  <Button 
                    mode="outlined" 
                    onPress={() => setSelectedShapeIndex(null)} 
                    style={styles.button}
                    disabled={selectedShapeIndex === null}
                  >
                    Deselecionar
                  </Button>
                </View>
              </>
            )}
          </View>

            <Text variant="bodyMedium">
              Pixels ativos: {pixels.size}
            </Text>
            
            <StatusBar style="auto" />
          </View>
        </ScrollView>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff' },
  mainContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 240,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
  },
  sidebarTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sidebarItemActive: {
    backgroundColor: '#e3f2fd',
    borderRightWidth: 3,
    borderRightColor: '#2196F3',
  },
  sidebarItemText: {
    fontSize: 16,
    color: '#666',
  },
  sidebarItemTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
  },
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 50, paddingHorizontal: 16, gap: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  sectionTitle: { fontWeight: '600', color: '#333', marginTop: 8, marginBottom: 4 },
  inputContainer: { width: '100%', maxWidth: 400, gap: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  input: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  button: { flex: 1 },
  gridContainer: { backgroundColor: '#f5f5f5', padding: 4, borderRadius: 8, borderWidth: 2, borderColor: '#ddd' },
  xLabelsRow: { flexDirection: 'row', marginTop: 2 },
  cornerSpace: { width: 20, height: 16 },
  xLabelsContainer: { flexDirection: 'row' },
  gridWithYLabels: { flexDirection: 'column' },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  rowCells: { flexDirection: 'row' },
  activeCell: { backgroundColor: '#2196F3' },
  firstPointCell: { backgroundColor: '#FF9800', borderWidth: 2, borderColor: '#F57C00' },
  secondPointCell: { backgroundColor: '#E91E63', borderWidth: 2, borderColor: '#C2185B' },
  bezierStartCell: { backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#388E3C' },
  bezierControlCell: { backgroundColor: '#FF9800', borderWidth: 2, borderColor: '#F57C00' },
  bezierEndCell: { backgroundColor: '#F44336', borderWidth: 2, borderColor: '#D32F2F' },
  polylineStartCell: { backgroundColor: '#00BCD4', borderWidth: 2, borderColor: '#0097A7' },
  polylineVertexCell: { backgroundColor: '#607D8B', borderWidth: 2, borderColor: '#455A64' },
  polygonVertexCell: { backgroundColor: '#9C27B0', borderWidth: 2, borderColor: '#7B1FA2' },
  polylineEndCell: { backgroundColor: '#795548', borderWidth: 2, borderColor: '#5D4037' },
  inactiveCell: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  clippingBorder: { borderColor: 'red', borderWidth: 2 },
  selectedShapeVertex: { backgroundColor: '#FFD700', borderWidth: 3, borderColor: '#FFA500' },
  relatedPixel: { backgroundColor: '#FFE4B5', borderWidth: 2, borderColor: '#DEB887' },
  statusText: { textAlign: 'center', color: '#666', fontStyle: 'italic' },
  verticesContainer: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 4, marginBottom: 8 },
  vertexText: { color: '#333', marginBottom: 2 },
  instructionText: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginBottom: 12 },
});