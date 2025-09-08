import { StatusBar } from 'expo-status-bar';
import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Dimensions, Switch } from 'react-native';
import { PaperProvider, Text, Button, TextInput, Menu, Divider } from 'react-native-paper';
import { bresenhamLine } from './src/utils/bresenham';
import { bresenhamCircle } from './src/utils/circle';
import { bezierGeneric } from './src/utils/bezier';
import { recursiveFill } from './src/utils/recursiveFill';
import { scanlineFill } from './src/utils/scanlineFill';
import { cohenSutherland } from './src/utils/cohenSutherland';
import { sutherlandHodgman, Point as SutherlandPoint } from './src/utils/sutherlandHodgman';

const GRID_SIZE = 20;

interface Point {
  x: number;
  y: number;
}

type Shape = 
  | { type: 'line', p1: Point, p2: Point }
  | { type: 'circle', center: Point, radius: number }
  | { type: 'bezier', vertices: Point[] }
  | { type: 'polyline', vertices: Point[] }
  | { type: 'polygon', vertices: Point[] }
  | { type: 'pixel', p: Point };

type Mode = 'pixel' | 'bresenham' | 'circle' | 'bezier' | 'polyline' | 'recursive_fill' | 'scanline_fill' | 'line_clipping' | 'polygon_clipping';

export default function App() {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [pixels, setPixels] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('pixel');
  const [menuVisible, setMenuVisible] = useState(false);
  
  const gridDimensions = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const availableWidth = width - 60;
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
  }, []);
  
  const [xInput, setXInput] = useState('');
  const [yInput, setYInput] = useState('');
  const [x1Input, setX1Input] = useState('');
  const [y1Input, setY1Input] = useState('');
  const [x2Input, setX2Input] = useState('');
  const [y2Input, setY2Input] = useState('');
  const [centerXInput, setCenterXInput] = useState('');
  const [centerYInput, setCenterYInput] = useState('');
  const [radiusInput, setRadiusInput] = useState('');
  const [bezierVertices, setBezierVertices] = useState<Point[]>([]);
  const [polylineVertices, setPolylineVertices] = useState<Point[]>([]);
  const [polygonVertices, setPolygonVertices] = useState<Point[]>([]);
  const [firstPoint, setFirstPoint] = useState<Point | null>(null);

  const [clippingWindow, setClippingWindow] = useState({ xmin: '5', ymin: '5', xmax: '15', ymax: '15' });
  const [clippingEnabled, setClippingEnabled] = useState(false);

  const handleClippingWindowChange = (field: keyof typeof clippingWindow, value: string) => {
    setClippingWindow(prev => ({ ...prev, [field]: value }));
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
        let linePoints;
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
      } else if (shape.type === 'bezier') {
        const curvePoints = bezierGeneric(shape.vertices);
        curvePoints.forEach(p => newPixels.add(`${p.x},${p.y}`));
      } else if (shape.type === 'polyline') {
        for (let i = 0; i < shape.vertices.length; i++) {
          const startVertex = shape.vertices[i];
          const endVertex = shape.vertices[(i + 1) % shape.vertices.length];
          let linePoints;
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
    } else if (mode === 'bezier') {
      setBezierVertices([...bezierVertices, {x, y}]);
    } else if (mode === 'polyline') {
      setPolylineVertices([...polylineVertices, {x, y}]);
    } else if (mode === 'polygon_clipping') {
      setPolygonVertices([...polygonVertices, {x, y}]);
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
      setShapes(newPixelShapes);
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
        
        const bezierVertexIndex = bezierVertices.findIndex(vertex => vertex.x === x && vertex.y === y);
        const isBezierVertex = bezierVertexIndex !== -1;
        
        const polylineVertexIndex = polylineVertices.findIndex(vertex => vertex.x === x && vertex.y === y);
        const isPolylineVertex = polylineVertexIndex !== -1;

        const polygonVertexIndex = polygonVertices.findIndex(vertex => vertex.x === x && vertex.y === y);
        const isPolygonVertex = polygonVertexIndex !== -1;

        let cellStyle: any = styles.inactiveCell;
        if (isActive) cellStyle = styles.activeCell;
        if (isFirstPoint) cellStyle = styles.firstPointCell;
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text variant="headlineMedium">Matrix Grid 20x20</Text>
          
          <View style={styles.modeSelector}>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setMenuVisible(true)} style={styles.modeButton}>
                  {mode === 'pixel' ? 'Adicionar Pixel' : 
                   mode === 'bresenham' ? 'Bresenham' : 
                   mode === 'circle' ? 'Círculo' : 
                   mode === 'bezier' ? 'Curva Bézier' : 
                   mode === 'polyline' ? 'Polilinha' :
                   mode === 'recursive_fill' ? 'Preenchimento Recursivo' :
                   mode === 'scanline_fill' ? 'Preenchimento Varredura' :
                   mode === 'line_clipping' ? 'Recorte de Linha' :
                   'Recorte de Polígono'}
                </Button>
              }
            >
              <Menu.Item onPress={() => { setMode('pixel'); setMenuVisible(false); }} title="Adicionar Pixel" />
              <Divider />
              <Menu.Item onPress={() => { setMode('bresenham'); setMenuVisible(false); }} title="Bresenham" />
              <Divider />
              <Menu.Item onPress={() => { setMode('circle'); setMenuVisible(false); }} title="Círculo" />
              <Divider />
              <Menu.Item onPress={() => { setMode('bezier'); setMenuVisible(false); }} title="Curva Bézier" />
              <Divider />
              <Menu.Item onPress={() => { setMode('polyline'); setMenuVisible(false); }} title="Polilinha" />
              <Divider />
              <Menu.Item onPress={() => { setMode('recursive_fill'); setMenuVisible(false); }} title="Preenchimento Recursivo" />
              <Divider />
              <Menu.Item onPress={() => { setMode('scanline_fill'); setMenuVisible(false); }} title="Preenchimento Varredura" />
              <Divider />
              <Menu.Item onPress={() => { setMode('line_clipping'); setMenuVisible(false); }} title="Recorte de Linha" />
              <Divider />
              <Menu.Item onPress={() => { setMode('polygon_clipping'); setMenuVisible(false); }} title="Recorte de Polígono" />
            </Menu>
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
            
            {mode === 'bezier' && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Curva de Bézier ({bezierVertices.length} pontos)</Text>
                <Text variant="bodySmall" style={styles.instructionText}>Clique no grid para adicionar vértices.</Text>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={drawBezierCurve} style={styles.button} disabled={bezierVertices.length < 2}>Desenhar</Button>
                  <Button mode="outlined" onPress={() => setBezierVertices([])} style={styles.button}>Limpar Vértices</Button>
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
              </>
            )}

            {mode === 'polygon_clipping' && (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>Recorte de Polígono ({polygonVertices.length} pontos)</Text>
                <Text variant="bodySmall" style={styles.instructionText}>Clique no grid para adicionar vértices.</Text>
                <View style={styles.buttonRow}>
                  <Button mode="contained" onPress={drawPolygon} style={styles.button} disabled={polygonVertices.length < 3}>Desenhar Polígono</Button>
                  <Button mode="outlined" onPress={() => setPolygonVertices([])} style={styles.button}>Limpar Vértices</Button>
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
          </View>

          <Text variant="bodyMedium">
            Pixels ativos: {pixels.size}
          </Text>
          
          <StatusBar style="auto" />
        </View>
      </ScrollView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 50, paddingHorizontal: 16, gap: 20 },
  modeSelector: { width: '100%', maxWidth: 400, alignItems: 'center' },
  modeButton: { width: 200 },
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
  bezierStartCell: { backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#388E3C' },
  bezierControlCell: { backgroundColor: '#FF9800', borderWidth: 2, borderColor: '#F57C00' },
  bezierEndCell: { backgroundColor: '#F44336', borderWidth: 2, borderColor: '#D32F2F' },
  polylineStartCell: { backgroundColor: '#00BCD4', borderWidth: 2, borderColor: '#0097A7' },
  polylineVertexCell: { backgroundColor: '#607D8B', borderWidth: 2, borderColor: '#455A64' },
  polygonVertexCell: { backgroundColor: '#9C27B0', borderWidth: 2, borderColor: '#7B1FA2' },
  polylineEndCell: { backgroundColor: '#795548', borderWidth: 2, borderColor: '#5D4037' },
  inactiveCell: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  clippingBorder: { borderColor: 'red', borderWidth: 2 },
  statusText: { textAlign: 'center', color: '#666', fontStyle: 'italic' },
  verticesContainer: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 4, marginBottom: 8 },
  vertexText: { color: '#333', marginBottom: 2 },
  instructionText: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginBottom: 12 },
});