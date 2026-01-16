import { ToolType, GeoType, ConnectorType } from './types';
import { MousePointer2, Hand, Pencil, StickyNote, Shapes, Spline, Square, Circle, Triangle, Star, MessageSquare, Diamond, ArrowRight, CornerDownRight, MoveRight, Type } from 'lucide-react';

export const TOOLS: { 
  id: ToolType; 
  icon: any; 
  label: string;
  hasSubMenu?: boolean; 
}[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'hand', icon: Hand, label: 'Pan Tool' },
  { id: 'pen', icon: Pencil, label: 'Draw' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'geo', icon: Shapes, label: 'Shapes', hasSubMenu: true },
  { id: 'connector', icon: Spline, label: 'Connectors', hasSubMenu: true },
  { id: 'sticky', icon: StickyNote, label: 'Note' },
];

export const GEO_SHAPES: { id: GeoType; icon: any; label: string }[] = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'diamond', icon: Diamond, label: 'Diamond' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'bubble', icon: MessageSquare, label: 'Bubble' },
  { id: 'arrow_shape', icon: ArrowRight, label: 'Arrow' },
];

export const CONNECTORS: { id: ConnectorType; icon: any; label: string }[] = [
  { id: 'straight', icon: MoveRight, label: 'Straight' },
  { id: 'curved', icon: Spline, label: 'Curved' },
  { id: 'elbow', icon: CornerDownRight, label: 'Squared' },
];

export const COLORS = [
  '#000000', // Black
  '#343a40', // Dark Gray
  '#495057', // Gray
  '#c92a2a', // Red
  '#a61e4d', // Pink
  '#862e9c', // Grape
  '#5f3dc4', // Violet
  '#364fc7', // Indigo
  '#1864ab', // Blue
  '#0b7285', // Cyan
  '#087f5b', // Teal
  '#2b8a3e', // Green
  '#5c940d', // Lime
  '#e67700', // Yellow
  '#d9480f', // Orange
];

export const BACKGROUND_COLORS = [
  'transparent',
  '#f8f9fa',
  '#fff5f5',
  '#fff0f6',
  '#f3f0ff',
  '#edf2ff',
  '#e7f5ff',
  '#e6fcf5',
  '#ebfbee',
  '#fff9db',
  '#fff4e6',
];

export const STROKE_WIDTHS = [
  { value: 2, label: 'Thin' },
  { value: 4, label: 'Bold' },
  { value: 6, label: 'Extra' },
];

export const STROKE_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

export const MOCK_USERS = [
  { id: '1', name: 'Alice', avatar: 'https://picsum.photos/32/32?random=1', color: '#F59E0B' },
  { id: '2', name: 'Bob', avatar: 'https://picsum.photos/32/32?random=2', color: '#3B82F6' },
  { id: '3', name: 'Charlie', avatar: 'https://picsum.photos/32/32?random=3', color: '#10B981' },
];
