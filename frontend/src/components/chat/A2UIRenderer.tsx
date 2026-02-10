import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle,
  FileText,
  Activity,
  ShieldCheck,
  Search,
  ArrowUpRight,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';

import { KnowledgeGraphView } from './KnowledgeGraphView';

interface A2UIComponent {
  id: string;
  type: 'card' | 'alert' | 'metric' | 'list' | 'text' | 'container' | 'graph';
  props: any;
  children?: A2UIComponent[];
}

interface A2UIRendererProps {
  data: {
    components: A2UIComponent[];
  };
}

export function A2UIRenderer({ data }: A2UIRendererProps) {
  const [showRawData, setShowRawData] = useState(false);
  const [copied, setCopied] = useState(false);
  const renderComponent = (component: A2UIComponent) => {
    const { type, props, children, id } = component;

    switch (type) {
      case 'container':
        return (
          <div key={id} className={`space-y-4 ${props.className || ''}`}>
            {children?.map(renderComponent)}
          </div>
        );

      case 'card':
        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300 ${props.className || ''}`}
          >
            {props.title && (
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2.5 text-[15px]">
                <div className="p-1.5 bg-slate-50 rounded-lg">
                  {getIcon(props.icon)}
                </div>
                {props.title}
              </h4>
            )}
            <div className="space-y-4">
              {children?.map(renderComponent)}
            </div>
          </motion.div>
        );

      case 'alert':
        const alertStyles = {
          error: 'bg-red-50/50 border-red-100 text-red-700',
          warning: 'bg-amber-50/50 border-amber-100 text-amber-700',
          success: 'bg-emerald-50/50 border-emerald-100 text-emerald-700',
          info: 'bg-blue-50/50 border-blue-100 text-blue-700',
        };
        const style = alertStyles[props.status as keyof typeof alertStyles] || alertStyles.info;
        return (
          <motion.div 
            key={id} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-xl border flex gap-3 ${style} ${props.className || ''}`}
          >
            <div className="shrink-0 mt-0.5 opacity-80">
              {props.status === 'error' && <AlertCircle className="w-5 h-5" />}
              {props.status === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {props.status === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {props.status === 'info' && <Info className="w-5 h-5" />}
            </div>
            <div>
              {props.title && <div className="font-semibold mb-1 text-sm">{props.title}</div>}
              <div className="text-sm opacity-90 leading-relaxed">{props.content}</div>
            </div>
          </motion.div>
        );

      case 'metric':
        return (
          <div key={id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100/50">
            <span className="text-sm font-medium text-slate-500">{props.label}</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold tracking-tight ${props.color === 'red' ? 'text-red-600' : 'text-slate-900'}`}>
                {props.value}
              </span>
              {props.unit && <span className="text-xs text-slate-400 font-medium">{props.unit}</span>}
            </div>
          </div>
        );

      case 'list':
        return (
          <ul key={id} className="space-y-3 my-2">
            {props.items?.map((item: any, idx: number) => (
              <li key={idx} className="flex gap-3 text-sm text-slate-600 group">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:bg-blue-600 transition-colors shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        );

      case 'text':
        return (
          <p key={id} className={`text-sm text-slate-600 leading-7 ${props.className || ''}`}>
            {props.content}
          </p>
        );

      case 'graph':
        return (
          <div className="rounded-xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50/50">
            <KnowledgeGraphView key={id} data={props.data} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/30">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">智能分析报告</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">GENERATED BY A2UI ENGINE</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100/50">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold">LIVE</span>
        </div>
      </div>
      
      <div className="space-y-6">
        {data.components?.map(renderComponent)}
      </div>
      
      <div className="pt-8 text-center space-y-3">
        <button
          onClick={() => setShowRawData(!showRawData)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
        >
          {showRawData ? '收起数据源' : '查看完整数据源'}
          <motion.div animate={{ rotate: showRawData ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3 h-3" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showRawData && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="relative mt-2 bg-slate-900 rounded-xl p-4 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Raw JSON Data</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <pre className="text-xs text-slate-300 font-mono overflow-x-auto max-h-[400px] overflow-y-auto leading-relaxed whitespace-pre-wrap break-all">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getIcon(name: string) {
  switch (name) {
    case 'shield': return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    case 'file': return <FileText className="w-4 h-4 text-blue-600" />;
    case 'search': return <Search className="w-4 h-4 text-slate-500" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    default: return <Activity className="w-4 h-4 text-slate-400" />;
  }
}
