import type { FigmaNode, FigmaFile, FigmaImageResponse, FigmaComment } from '../types/index.js';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

const getAccessToken = (token?: string): string => {
  const accessToken = token || process.env.FIGMA_ACCESS_TOKEN || '';
  if (!accessToken) {
    throw new Error('FIGMA_ACCESS_TOKEN is required. Set it in .env or pass it as parameter.');
  }
  return accessToken;
};

const request = async <T>(
  endpoint: string,
  accessToken: string,
  options?: { method?: string; body?: unknown }
): Promise<T> => {
  const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
    method: options?.method || 'GET',
    headers: {
      'X-Figma-Token': accessToken,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Figma API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
};

export const getFile = async (fileKey: string, accessToken?: string): Promise<FigmaFile> =>
  request<FigmaFile>(`/files/${fileKey}`, getAccessToken(accessToken));

export const getFileNodes = async (fileKey: string, nodeIds: string[], accessToken?: string): Promise<unknown> => {
  const ids = nodeIds.join(',');
  return request(`/files/${fileKey}/nodes?ids=${ids}`, getAccessToken(accessToken));
};

export const getImages = async (
  fileKey: string,
  nodeIds: string[],
  format: 'png' | 'jpg' | 'svg' | 'pdf' = 'png',
  scale: number = 2,
  accessToken?: string
): Promise<FigmaImageResponse> => {
  const ids = nodeIds.join(',');
  return request<FigmaImageResponse>(
    `/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`,
    getAccessToken(accessToken)
  );
};

export const downloadImage = async (imageUrl: string): Promise<Buffer> => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const extractFrames = (node: FigmaNode, frames: FigmaNode[] = []): FigmaNode[] => {
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    frames.push(node);
  }
  if (node.children) {
    for (const child of node.children) {
      extractFrames(child, frames);
    }
  }
  return frames;
};

export const postComment = async (
  fileKey: string,
  message: string,
  nodeId?: string,
  accessToken?: string
): Promise<FigmaComment> => {
  const body: { message: string; client_meta?: { node_id: string; node_offset: { x: number; y: number } } } = { message };

  if (nodeId) {
    body.client_meta = {
      node_id: nodeId,
      node_offset: { x: 0, y: 0 },
    };
  }

  return request<FigmaComment>(
    `/files/${fileKey}/comments`,
    getAccessToken(accessToken),
    { method: 'POST', body }
  );
};

export const checkConnection = async (accessToken?: string): Promise<boolean> => {
  try {
    await request('/me', getAccessToken(accessToken));
    return true;
  } catch (error) {
    console.error('Failed to connect to Figma:', error);
    return false;
  }
};

export const extractFigmaInfo = (input: string): { fileKey: string; nodeId?: string } => {
  const urlMatch = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  const fileKey = urlMatch ? urlMatch[1] : input;

  const nodeIdMatch = input.match(/node-id=([^&]+)/);
  const nodeId = nodeIdMatch ? nodeIdMatch[1].replace('-', ':') : undefined;

  return { fileKey, nodeId };
};
