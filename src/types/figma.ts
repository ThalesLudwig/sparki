// ============================================
// Figma Types
// ============================================

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: unknown[];
  strokes?: unknown[];
  effects?: unknown[];
  characters?: string;
  style?: unknown;
}

export interface FigmaFile {
  name: string;
  lastModified: string;
  document: FigmaNode;
  components: Record<string, unknown>;
  styles: Record<string, unknown>;
}

export interface FigmaImageResponse {
  images: Record<string, string>;
  err: string | null;
}

export interface FigmaComment {
  id: string;
  message: string;
  file_key: string;
  parent_id?: string;
  user: {
    id: string;
    handle: string;
    img_url: string;
  };
  created_at: string;
  resolved_at?: string;
  client_meta?: {
    node_id?: string;
    node_offset?: { x: number; y: number };
  };
}
