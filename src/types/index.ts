/**
 * 血缘分析相关的类型定义
 */

// 枚举定义
export enum LineageLevel {
  TABLE = 'table',
  COLUMN = 'column'
}

export enum SqlDialect {
  DEFAULT = 'default',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgres',
  SPARKSQL = 'sparksql',
  HIVE = 'hive',
  SQLITE = 'sqlite',
  ORACLE = 'oracle',
  TSQL = 'tsql'
}

export interface LineageNode {
  id: string;
  name: string;
  type: 'Origin' | 'Middle' | 'RS';
  top: number;
  left: number;
  fields?: Field[];
  layer?: number;
  has_cte?: boolean;
}

export interface Field {
  name: string;
  original?: string;
  transform_type?: string;
}

export interface FieldReference {
  name: string;
  field: string;
}

export interface LineageEdge {
  from: FieldReference;
  to: FieldReference;
  display?: string;
}

export interface LineageData {
  nodes: LineageNode[];
  edges: LineageEdge[];
  layout?: {
    maxLayer: number;
  };
  stats?: {
    tables: number;
    edges: number;
  };
}

export interface HistoryItem {
  id: string;
  sqlQuery: string;
  lineageLevel: 'table' | 'column';
  filterCtes: boolean;
  sqlDialect: string;
  data: LineageData;
  timestamp: number;
  stats: {
    nodes: number;
    edges: number;
  };
}

export interface AuxiliaryLine {
  isShowXLine: boolean;
  isShowYLine: boolean;
}

export interface AuxiliaryLinePosition {
  width: string;
  height: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface ContainerSize {
  width: number;
  height: number;
}

export interface PerformanceConfig {
  highPerformanceMode: boolean;
  virtualizationEnabled: boolean;
  maxNodes: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MiniMapData {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface BatchActionState {
  showOnlyCriticalPath: boolean;
  isShowingCriticalLineage: boolean;
  selectedFields: Set<string>;
  selectedTables: Set<string>;
  highlightedFields: Set<string>;
  highlightedTables: string[];
}

export interface ConnectionState {
  hiddenNodes: Set<string>;
  criticalPathNodes: Set<string>;
  relatedTableNames: Set<string>;
}

export interface UIState {
  isMinimized: boolean;
  showHistoryPanel: boolean;
  showToast: boolean;
  toastMessage: string;
  isAnalyzing: boolean;
  focusedNode: string | null;
  currentFieldIndex: number;
  currentTableIndex: number;
}

export interface AnalysisConfig {
  sqlQuery: string;
  lineageLevel: 'table' | 'column';
  filterCtes: boolean;
  sqlDialect: string;
}

// API响应类型
export interface LineageAnalysisRequest {
  sql_query: string;
  filter_ctes: boolean;
  lineage_level: 'table' | 'column';
  sql_dialect: string;
}

export interface LineageAnalysisResponse {
  nodes: LineageNode[];
  edges: LineageEdge[];
  layout?: {
    maxLayer: number;
  };
  stats?: {
    tables: number;
    edges: number;
  };
  error?: string;
}

export interface FocusedPoint {
  point: Point;
  rect: DOMRect;
}

export interface ToastConfig {
  duration: number;
  position: 'top' | 'bottom';
}