import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import Cases from '@/pages/Cases'
import CaseDetail from '@/pages/CaseDetail'
import Contracts from '@/pages/Contracts'
import ContractReview from '@/pages/ContractReview'
import Documents from '@/pages/Documents'
import DueDiligence from '@/pages/DueDiligence'
import Knowledge from '@/pages/Knowledge'
import Settings from '@/pages/Settings'
import Sentiment from '@/pages/Sentiment'
import Collaboration from '@/pages/Collaboration'
import LegalTools from '@/pages/LegalTools'
import TaxAssets from '@/pages/TaxAssets'
import { PrivacyProvider } from '@/context/PrivacyContext'

function App() {
  return (
    <PrivacyProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="chat" element={<Chat />} />
            <Route path="cases" element={<Cases />} />
            <Route path="cases/:id" element={<CaseDetail />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="contract-review" element={<ContractReview />} />
            <Route path="documents" element={<Documents />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="due-diligence" element={<DueDiligence />} />
            <Route path="knowledge" element={<Knowledge />} />
            <Route path="tools" element={<LegalTools />} />
            <Route path="tax-assets" element={<TaxAssets />} />
            <Route path="settings" element={<Settings />} />
            <Route path="sentiment" element={<Sentiment />} />
            <Route path="collaboration" element={<Collaboration />} />
            <Route path="collaboration/:sessionId" element={<Collaboration />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PrivacyProvider>
  )
}

export default App
