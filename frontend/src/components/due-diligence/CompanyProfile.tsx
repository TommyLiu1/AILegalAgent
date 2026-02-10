import { motion } from 'framer-motion';
import { Building2, MapPin, Calendar, Users, DollarSign, Award } from 'lucide-react';

interface CompanyProfileProps {
  data?: {
    name?: string;
    legal_representative?: string;
    registered_capital?: string;
    established_date?: string;
    status?: string;
    business_scope?: string;
    address?: string;
    company_type?: string;
  };
  companyName?: string;
}

export function CompanyProfile({ data, companyName }: CompanyProfileProps) {
  const companyData = {
    name: data?.name || companyName || '科技有限公司',
    legalPerson: data?.legal_representative || '张某',
    registeredCapital: data?.registered_capital || '5000万元',
    foundedDate: data?.established_date || '2018-03-15',
    status: data?.status || '存续',
    industry: data?.business_scope?.slice(0, 20) || '软件和信息技术服务业',
    address: data?.address || '北京市海淀区中关村大街1号',
    employees: '200-500人',
  };

  const items = [
    { icon: Users, label: '法定代表人', value: companyData.legalPerson },
    { icon: DollarSign, label: '注册资本', value: companyData.registeredCapital },
    { icon: Calendar, label: '成立日期', value: companyData.foundedDate },
    { icon: Award, label: '经营状态', value: companyData.status, highlight: true },
    { icon: Building2, label: '所属行业', value: companyData.industry },
    { icon: MapPin, label: '注册地址', value: companyData.address },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#007AFF] to-[#0051D5] rounded-2xl border border-[#007AFF]/30 p-6 text-white shadow-lg"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{companyData.name}</h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
              {companyData.employees}
            </span>
            <span className="px-3 py-1 bg-[#34C759]/90 rounded-full text-sm font-medium">
              ✓ 正常经营
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/70 text-sm mb-1">综合评分</p>
          <p className="text-4xl font-bold">78</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-white/70" />
                <span className="text-xs text-white/70">{item.label}</span>
              </div>
              <p className={`text-sm font-medium ${item.highlight ? 'text-[#34C759]' : ''}`}>
                {item.value}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
