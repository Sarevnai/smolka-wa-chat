import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

// Dimensões baseadas no BaseNode.tsx (min-w-[180px] + padding)
const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

export type LayoutDirection = 'TB' | 'LR'; // Top-Bottom ou Left-Right

export function getLayoutedElements<T extends Record<string, unknown>, E extends Edge = Edge>(
  nodes: Node<T>[],
  edges: E[],
  direction: LayoutDirection = 'TB'
): { nodes: Node<T>[]; edges: E[] } {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80,     // Espaço horizontal entre nós no mesmo nível
    ranksep: 120,    // Espaço vertical entre níveis
    edgesep: 40,     // Espaço entre arestas
    marginx: 50,
    marginy: 50,
  });

  // Adicionar nós ao grafo dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Adicionar arestas ao grafo dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calcular layout
  dagre.layout(dagreGraph);

  // Aplicar novas posições aos nós
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    if (!nodeWithPosition) {
      return node;
    }

    return {
      ...node,
      // Ajustar posição do centro (Dagre) para canto superior esquerdo (React Flow)
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
