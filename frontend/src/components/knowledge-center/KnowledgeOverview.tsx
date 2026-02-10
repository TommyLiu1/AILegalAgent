/**
 * 知识中心总览
 */

import { memo } from 'react';
import { Database, Search, Network, BookOpen, TrendingUp, FileText } from 'lucide-react';

const stats = [
  { label: '知识库总量', value: '12', icon: Database, color: 'bg-blue-50 text-blue-600' },
  { label: '文档数', value: '1,284', icon: FileText, color: 'bg-emerald-50 text-emerald-600' },
  { label: '知识图谱节点', value: '3,562', icon: Network, color: 'bg-purple-50 text-purple-600' },
  { label: '今日搜索', value: '47', icon: Search, color: 'bg-amber-50 text-amber-600' },
];

const recentActivities = [
  { action: '新增法规', detail: '《民法典》司法解释（二）', time: '2小时前' },
  { action: '知识更新', detail: '劳动争议相关案例库已更新', time: '5小时前' },
  { action: '图谱扩展', detail: '合同纠纷关联关系新增 28 条', time: '1天前' },
  { action: '经验沉淀', detail: '知识产权侵权分析模板', time: '2天前' },
];

export const KnowledgeOverview = memo(function KnowledgeOverview() {
  return (
    <div className="p-6 space-y-6">
      {/* 数据概览 */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          知识中心概览
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 最近动态 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          最近动态
        </h3>
        <div className="space-y-3">
          {recentActivities.map((activity, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">{activity.action}</span>
                <span className="text-sm text-gray-500 ml-2">{activity.detail}</span>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 快捷操作 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">快捷操作</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: '搜索法律知识', desc: '全文检索法律法规和案例', icon: Search },
            { label: '浏览知识图谱', desc: '可视化法律关系网络', icon: Network },
            { label: '管理知识库', desc: '上传和整理法律文档', icon: Database },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="text-left bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <Icon className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                <div className="text-sm font-medium text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
