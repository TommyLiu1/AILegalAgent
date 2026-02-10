import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge,
  Position,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: 'entity' | 'law' | 'document' | 'query' | 'conclusion';
  }>;
  edges: Array<{
    source: string;
    target: string;
    label?: string;
    relation: string;
  }>;
}

interface KnowledgeGraphViewProps {
  data: GraphData;
}

const nodeStyles: Record<string, React.CSSProperties> = {
  query: { background: '#f8fafc', border: '2px solid #64748b', borderRadius: '8px', padding: '10px' },
  entity: { background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '8px', padding: '10px' },
  law: { background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '8px', padding: '10px' },
  document: { background: '#fff7ed', border: '2px solid #f97316', borderRadius: '8px', padding: '10px' },
  conclusion: { background: '#faf5ff', border: '2px solid #a855f7', borderRadius: '8px', padding: '10px' },
};

export function KnowledgeGraphView({ data }: KnowledgeGraphViewProps) {
  const { nodes: rawNodes, edges: rawEdges } = data;

  const initialNodes: Node[] = useMemo(() => {
    // 简单的自动布局：根据类型分层
    const layers: Record<string, number> = {
      query: 0,
      entity: 1,
      document: 2,
      law: 3,
      conclusion: 4
    };

    return rawNodes.map((node, index) => {
      const layer = layers[node.type] || 0;
      return {
        id: node.id,
        type: 'default',
        data: { label: node.label },
        position: { x: layer * 250, y: index * 100 },
        style: nodeStyles[node.type] || nodeStyles.entity,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
  }, [rawNodes]);

  const initialEdges: Edge[] = useMemo(() => {
    return rawEdges.map((edge, index) => ({
      id: `e${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || edge.relation,
      labelStyle: { fill: '#64748b', fontWeight: 700, fontSize: 10 },
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      },
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }));
  }, [rawEdges]);

  return (
    <div className="w-full h-[400px] border border-slate-200 rounded-xl bg-slate-50 relative">
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-2 rounded border border-slate-200 shadow-sm">
        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">知识逻辑链路图谱</h5>
      </div>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        fitView
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
    </div>
  );
}
