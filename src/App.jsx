import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { GlobalStoreProvider } from './contexts/GlobalStoreContext'
import AppShell from './components/layout/AppShell'
import LoginScreen from './components/LoginScreen'

// Module imports
import Dashboard from './components/modules/Dashboard'
import InterventionsV2 from './components/modules/InterventionsV2'
import DeviceRegistryModule from './components/modules/DeviceRegistryModule'
import DevicesDHR from './components/modules/DevicesDHR'
import WarrantyModule from './components/modules/WarrantyModule'
import EquipmentModule from './components/modules/EquipmentModule'
import FleetModule from './components/modules/FleetModule'
import CalendarModuleV2 from './components/modules/CalendarModuleV2'
import WarehouseModuleV2 from './components/modules/WarehouseModuleV2'
import ContractsModuleV2 from './components/modules/ContractsModuleV2'
import ReportsModule from './components/modules/ReportsModule'
import MaintenanceModuleV2 from './components/modules/MaintenanceModuleV2'
import OffersModuleV2 from './components/modules/OffersModuleV2'
import ClientPortalModule from './components/modules/ClientPortalModule'
import StandbyModule from './components/modules/StandbyModule'
import PhotoDocsModule from './components/modules/PhotoDocsModule'
import NotificationsCenterV2 from './components/modules/NotificationsCenterV2'
import MLEngineModule from './components/modules/MLEngineModule'
import CloudStatusPanel from './components/modules/CloudStatusPanel'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #1B4F72, #148F77)' }}>
            <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <GlobalStoreProvider>
      <AppShell>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/interventions" element={<InterventionsV2 />} />
          <Route path="/registry" element={<DeviceRegistryModule />} />
          <Route path="/dhr" element={<DevicesDHR />} />
          <Route path="/warranties" element={<WarrantyModule />} />
          <Route path="/equipment" element={<EquipmentModule />} />
          <Route path="/fleet" element={<FleetModule />} />
          <Route path="/calendar" element={<CalendarModuleV2 />} />
          <Route path="/warehouse" element={<WarehouseModuleV2 />} />
          <Route path="/contracts" element={<ContractsModuleV2 />} />
          <Route path="/reports" element={<ReportsModule />} />
          <Route path="/maintenance" element={<MaintenanceModuleV2 />} />
          <Route path="/offers" element={<OffersModuleV2 />} />
          <Route path="/portal" element={<ClientPortalModule />} />
          <Route path="/standby" element={<StandbyModule />} />
          <Route path="/photos" element={<PhotoDocsModule />} />
          <Route path="/notifications" element={<NotificationsCenterV2 />} />
          <Route path="/mlengine" element={<MLEngineModule />} />
          <Route path="/cloud" element={<CloudStatusPanel />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </GlobalStoreProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}
