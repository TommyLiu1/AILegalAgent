import { useState, useEffect } from 'react'
import { 
  Plus, 
  Upload, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { contractsApi, Contract, ContractCreate } from '@/lib/api'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-muted text-foreground' },
  pending_review: { label: '待审核', color: 'bg-yellow-100 text-yellow-700' },
  under_review: { label: '审核中', color: 'bg-blue-100 text-blue-700' },
  approved: { label: '已批准', color: 'bg-green-100 text-green-700' },
  signed: { label: '已签署', color: 'bg-purple-100 text-purple-700' },
  active: { label: '生效中', color: 'bg-emerald-100 text-emerald-700' },
  expired: { label: '已过期', color: 'bg-red-100 text-red-700' },
}

const RISK_LEVEL_MAP: Record<string, { label: string; color: string; icon: any }> = {
  low: { label: '低风险', color: 'text-green-600', icon: CheckCircle },
  medium: { label: '中风险', color: 'text-yellow-600', icon: Clock },
  high: { label: '高风险', color: 'text-orange-600', icon: AlertTriangle },
  critical: { label: '极高风险', color: 'text-red-600', icon: AlertTriangle },
}

const CONTRACT_TYPES = [
  { value: 'purchase', label: '采购合同' },
  { value: 'sales', label: '销售合同' },
  { value: 'service', label: '服务协议' },
  { value: 'labor', label: '劳动合同' },
  { value: 'lease', label: '租赁合同' },
  { value: 'nda', label: '保密协议' },
  { value: 'cooperation', label: '合作协议' },
  { value: 'other', label: '其他' },
]

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadContracts()
  }, [page])

  const loadContracts = async () => {
    setLoading(true)
    try {
      const response = await contractsApi.list({ page, page_size: 20 })
      setContracts(response.items)
      setTotal(response.total)
    } catch (error: any) {
      toast.error(error.message || '加载合同列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = (contract: Contract) => {
    setSelectedContract(contract)
    setShowReviewModal(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">合同审查</h1>
          <p className="text-muted-foreground">AI智能审查合同，识别风险条款</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
            新建合同
          </button>
          <button
            onClick={() => setShowReviewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            上传审查
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">待审核</p>
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {contracts.filter(c => c.status === 'pending_review').length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">审核中</p>
            <Loader2 className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {contracts.filter(c => c.status === 'under_review').length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">高风险</p>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {contracts.filter(c => c.risk_level === 'high' || c.risk_level === 'critical').length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">已完成</p>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {contracts.filter(c => c.status === 'approved' || c.status === 'signed').length}
          </p>
        </div>
      </div>

      {/* 合同列表 */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无合同</p>
            <button
              onClick={() => setShowReviewModal(true)}
              className="mt-4 text-primary hover:underline"
            >
              上传第一份合同进行审查
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {contracts.map((contract) => {
              const status = STATUS_MAP[contract.status] || STATUS_MAP.draft
              const riskLevel = contract.risk_level 
                ? RISK_LEVEL_MAP[contract.risk_level] 
                : null
              const RiskIcon = riskLevel?.icon
              
              return (
                <div key={contract.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">{contract.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{contract.contract_number || '-'}</span>
                          <span>·</span>
                          <span>{CONTRACT_TYPES.find(t => t.value === contract.contract_type)?.label || contract.contract_type}</span>
                          {contract.amount && (
                            <>
                              <span>·</span>
                              <span>¥{contract.amount.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {riskLevel && (
                        <div className={`flex items-center gap-1 ${riskLevel.color}`}>
                          {RiskIcon && <RiskIcon className="h-4 w-4" />}
                          <span className="text-sm">{riskLevel.label}</span>
                        </div>
                      )}
                      
                      <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                        {status.label}
                      </span>
                      
                      <button
                        onClick={() => handleReview(contract)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {contract.risk_score !== null && contract.risk_score !== undefined && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">风险评分:</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-xs">
                        <div 
                          className={`h-full ${
                            contract.risk_score >= 0.7 ? 'bg-red-500' :
                            contract.risk_score >= 0.5 ? 'bg-orange-500' :
                            contract.risk_score >= 0.3 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${contract.risk_score * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{(contract.risk_score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 审查模态框 */}
      {showReviewModal && (
        <ReviewModal
          contract={selectedContract}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedContract(null)
          }}
          onComplete={loadContracts}
        />
      )}

      {/* 创建合同模态框 */}
      {showCreateModal && (
        <CreateContractModal
          onClose={() => setShowCreateModal(false)}
          onComplete={loadContracts}
        />
      )}
    </div>
  )
}

// 审查模态框
function ReviewModal({ 
  contract, 
  onClose, 
  onComplete 
}: { 
  contract: Contract | null
  onClose: () => void
  onComplete: () => void 
}) {
  const [contractText, setContractText] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleReview = async () => {
    if (!contractText.trim()) {
      toast.error('请输入合同文本')
      return
    }

    setReviewing(true)
    try {
      // 如果没有选中的合同，先创建一个
      let contractId = contract?.id
      if (!contractId) {
        const newContract = await contractsApi.create({
          title: '待审查合同',
          contract_type: 'other',
        })
        contractId = newContract.id
      }

      const reviewResult = await contractsApi.review(contractId, contractText)
      setResult(reviewResult)
      toast.success('审查完成')
      onComplete()
    } catch (error: any) {
      toast.error(error.message || '审查失败')
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-xl shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">合同智能审查</h2>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {result ? (
            <div className="space-y-6">
              {/* 审查结果概览 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">风险等级</p>
                  <p className={`text-lg font-bold ${
                    result.risk_level === 'critical' || result.risk_level === 'high' ? 'text-red-600' :
                    result.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {RISK_LEVEL_MAP[result.risk_level]?.label || result.risk_level}
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">风险评分</p>
                  <p className="text-lg font-bold">{((result.risk_score || 0) * 100).toFixed(0)}%</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">风险点数量</p>
                  <p className="text-lg font-bold">{result.risks?.length || 0}</p>
                </div>
              </div>

              {/* 审查摘要 */}
              <div className="rounded-xl border p-4">
                <h3 className="font-medium mb-2">审查摘要</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {result.summary || '暂无摘要'}
                </p>
              </div>

              {/* 风险点列表 */}
              {result.risks && result.risks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">风险点 ({result.risks.length})</h3>
                  {result.risks.map((risk: any, index: number) => (
                    <div key={index} className="rounded-xl border p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${
                          risk.level === 'critical' || risk.level === 'high' ? 'text-red-500' :
                          risk.level === 'medium' ? 'text-yellow-500' : 'text-green-500'
                        }`} />
                        <span className="font-medium">{risk.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{risk.description}</p>
                      {risk.suggestion && (
                        <p className="text-sm mt-2 text-blue-600">建议: {risk.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                请粘贴合同文本，AI将自动识别风险条款并提供修改建议
              </p>
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="请在此粘贴合同文本..."
                className="w-full h-96 px-4 py-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
        
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
          >
            关闭
          </button>
          {!result && (
            <button
              onClick={handleReview}
              disabled={reviewing || !contractText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {reviewing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  审查中...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  开始审查
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// 创建合同模态框
function CreateContractModal({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [formData, setFormData] = useState<ContractCreate>({
    title: '',
    contract_type: 'other',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('请输入合同标题')
      return
    }

    setSubmitting(true)
    try {
      await contractsApi.create(formData)
      toast.success('合同创建成功')
      onComplete()
      onClose()
    } catch (error: any) {
      toast.error(error.message || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-xl shadow-lg w-full max-w-lg mx-4">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">新建合同</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">合同标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="请输入合同标题"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">合同类型</label>
            <select
              value={formData.contract_type}
              onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">合同金额</label>
            <input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || undefined })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="请输入合同金额"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
