import { Routes, Route, Navigate } from "react-router-dom"
import LandingPage from "@/pages/LandingPage"
import DashboardLayout from "@/pages/dashboard/DashboardLayout"
import OverviewPage from "@/pages/dashboard/OverviewPage"
import HealthPage from "@/pages/dashboard/HealthPage"
import AssetsPage from "@/pages/dashboard/AssetsPage"
import AlertsPage from "@/pages/dashboard/AlertsPage"
import CopilotPage from "@/pages/dashboard/CopilotPage"
import IngestPage from "@/pages/dashboard/IngestPage"
import MaintenancePage from "@/pages/dashboard/MaintenancePage"
import ReportsPage from "@/pages/dashboard/ReportsPage"
import { DashboardProvider } from "@/context/DashboardContext"

function DashboardWrapper() {
  return (
    <DashboardProvider>
      <DashboardLayout />
    </DashboardProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardWrapper />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="copilot" element={<CopilotPage />} />
        <Route path="ingest" element={<IngestPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}
