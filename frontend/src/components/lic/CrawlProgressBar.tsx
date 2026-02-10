import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Globe } from 'lucide-react';

interface CrawlProgressBarProps {
  taskId: string;
  onComplete?: () => void;
}

export function CrawlProgressBar({ taskId, onComplete }: CrawlProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('initializing');
  const [message, setMessage] = useState<string>('准备启动抓取引擎...');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the API_BASE_URL from environment or default to 8001
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
    // Remove http/https and extract host/port if needed, but easier to just replace protocol
    const wsBase = apiBase.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/lic/ws/${taskId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      console.log('LIC WebSocket connected');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'lic_progress') {
        setProgress(data.progress);
        setStatus(data.status);
        setMessage(data.message);

        if (data.status === 'completed') {
          if (onComplete) onComplete();
        }
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('LIC WebSocket disconnected');
    };

    return () => {
      socket.close();
    };
  }, [taskId, onComplete]);

  if (!taskId) return null;

  return (
    <Card className="overflow-hidden border-blue-100 bg-blue-50/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900">LIC 情报抓取引擎</h4>
              <p className="text-xs text-blue-700/70">{message}</p>
            </div>
          </div>
          <Badge variant={status === 'error' ? 'destructive' : 'secondary'} className="capitalize">
            {status === 'completed' ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> 已完成
              </span>
            ) : status === 'error' ? (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> 失败
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> {status}
              </span>
            )}
          </Badge>
        </div>
        <Progress value={progress} className="h-2 bg-blue-100" />
        <div className="mt-2 flex justify-between items-center">
          <span className="text-[10px] text-blue-600 font-medium">进度: {progress}%</span>
          <span className="text-[10px] text-blue-400">
            {isConnected ? '● 实时连接中' : '○ 连接已断开'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
