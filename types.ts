export type Theme = 'light' | 'dark';

export type ToolType = 'select' | 'hand' | 'pen' | 'text' | 'sticky' | 'geo' | 'connector';

export type GeoType = 'rectangle' | 'rounded_rect' | 'circle' | 'diamond' | 'triangle' | 'star' | 'bubble' | 'arrow_shape';
export type ConnectorType = 'straight' | 'elbow' | 'curved';

export type BackgroundType = 'grid' | 'dots' | 'none';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: ToolType;
  color: string; // Stroke Color (or Text Color)
  backgroundColor?: string; // Fill Color
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  rotation?: number; // In degrees
}

export interface PathShape extends BaseShape {
  type: 'pen';
  points: Point[];
}

export interface GeoShape extends BaseShape {
  type: 'geo';
  subType: GeoType;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number; // New property for rounded borders
}

export interface StickyShape extends BaseShape {
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
}

export interface ConnectorShape extends BaseShape {
  type: 'connector';
  subType: ConnectorType;
  startPoint: Point;
  endPoint: Point;
  startBindingId?: string; // ID of shape attached to start
  endBindingId?: string;   // ID of shape attached to end
  startArrowhead?: boolean;
  endArrowhead?: boolean;
}

export type Shape = PathShape | GeoShape | StickyShape | ConnectorShape | TextShape;

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 'e' | 's' | 'w' | 'rotate';
