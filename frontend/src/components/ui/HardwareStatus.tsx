import { Cpu, Wifi, WifiOff, Activity } from 'lucide-react';
import { usePrivacy, HardwareStatus as HWStatus } from '../../context/PrivacyContext';

export const HardwareStatus = () => {
  const { hardwareStatus, hardwareName, secureComputeUsage, toggleHardwareConnection } = usePrivacy();

  const isConnected = hardwareStatus === HWStatus.CONNECTED;

  return (
    <div 
      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
        isConnected 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
      }`}
      onClick={toggleHardwareConnection}
      title={isConnected ? "点击断开连接" : "点击模拟连接硬件"}
    >
      <div className={`p-1 rounded-md ${isConnected ? 'bg-emerald-200' : 'bg-slate-200'}`}>
        <Cpu className="w-4 h-4" />
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold whitespace-nowrap">
            {isConnected ? hardwareName : '未检测到AI硬件'}
          </span>
          {isConnected ? (
            <Wifi className="w-3 h-3 text-emerald-600" />
          ) : (
            <WifiOff className="w-3 h-3 text-slate-400" />
          )}
        </div>
        
        {isConnected && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Activity className="w-3 h-3" />
            <div className="w-16 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000"
                style={{ width: `${secureComputeUsage}%` }}
              />
            </div>
            <span className="text-[10px] font-mono leading-none">
              {Math.round(secureComputeUsage)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
