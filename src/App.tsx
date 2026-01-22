import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RealtimeMessagesProvider } from "@/contexts/RealtimeMessagesContext";
import { DepartmentProvider } from "@/contexts/DepartmentContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Inbox from "./pages/Inbox";
import Chat from "./pages/Chat";
import Send from "./pages/Send";
import Contacts from "./pages/Contacts";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";
import Triage from "./pages/Triage";
import Pipeline from "./pages/Pipeline";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import PermissionsMatrix from "./pages/admin/PermissionsMatrix";
import UserPermissions from "./pages/admin/UserPermissions";
import SystemSettings from "./pages/admin/SystemSettings";
import AIAgentConfig from "./pages/admin/AIAgentConfig";
import C2SDashboard from "./pages/admin/C2SDashboard";
import PortalIntegration from "./pages/admin/PortalIntegration";
import ManagementDashboard from "./pages/admin/ManagementDashboard";
import AIMainDashboard from "./pages/admin/AIMainDashboard";
import LeadsManagement from "./pages/admin/LeadsManagement";
import AIBehaviorConfig from "./pages/admin/AIBehaviorConfig";
import LeadsReports from "./pages/admin/LeadsReports";
import AINotifications from "./pages/admin/AINotifications";
import AIUnifiedConfig from "./pages/admin/AIUnifiedConfig";
import WhatsAppProfileSettings from "./pages/admin/WhatsAppProfileSettings";
import DevelopmentsManagement from "./pages/admin/DevelopmentsManagement";
import { AdminGuard } from "./components/guards/AdminGuard";
import { MarketingGuard } from "./components/guards/MarketingGuard";
// Marketing Module
import MarketingDashboard from "./pages/marketing/MarketingDashboard";
import MarketingContacts from "./pages/marketing/MarketingContacts";
import MarketingCampaigns from "./pages/marketing/MarketingCampaigns";
import MarketingReports from "./pages/marketing/MarketingReports";
import MarketingAIConfig from "./pages/marketing/MarketingAIConfig";
import MarketingChat from "./pages/marketing/MarketingChat";
import DesignPreview from "./pages/admin/DesignPreview";

// Create QueryClient outside component to avoid recreating on hot reload
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="smolka-theme">
      <AuthProvider>
        <DepartmentProvider>
          <RealtimeMessagesProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/inbox" element={
                    <ProtectedRoute>
                      <Inbox />
                    </ProtectedRoute>
                  } />
                  <Route path="/chat" element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } />
                  <Route path="/chat/:conversationId" element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } />
                  <Route path="/send" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <Send />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/contacts" element={
                    <ProtectedRoute>
                      <Contacts />
                    </ProtectedRoute>
                  } />
                  <Route path="/reports" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <Reports />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/integrations" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <Integrations />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  {/* New Routes: Triage and Pipeline */}
                  <Route path="/triage" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <Triage />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/pipeline/:department" element={
                    <ProtectedRoute>
                      <Pipeline />
                    </ProtectedRoute>
                  } />
                  {/* Marketing Module Routes */}
                  <Route path="/marketing" element={
                    <ProtectedRoute>
                      <MarketingGuard>
                        <MarketingDashboard />
                      </MarketingGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/marketing/chat" element={
                    <ProtectedRoute>
                      <MarketingGuard>
                        <MarketingChat />
                      </MarketingGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/marketing/chat/:conversationId" element={
                    <ProtectedRoute>
                      <MarketingGuard>
                        <MarketingChat />
                      </MarketingGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/marketing/contacts" element={
                    <ProtectedRoute>
                      <MarketingGuard>
                        <MarketingContacts />
                      </MarketingGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/marketing/campaigns" element={
                    <ProtectedRoute>
                      <MarketingGuard>
                        <MarketingCampaigns />
                      </MarketingGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/marketing/reports" element={
                    <ProtectedRoute>
                      <MarketingGuard>
                        <MarketingReports />
                      </MarketingGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/marketing/ai-config" element={
                    <ProtectedRoute>
                      <MarketingGuard>
                        <MarketingAIConfig />
                      </MarketingGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/marketing/send" element={
                    <ProtectedRoute>
                      <MarketingGuard>
                        <Send />
                      </MarketingGuard>
                    </ProtectedRoute>
                  } />
                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <AdminDashboard />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <UserManagement />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/logs" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <AuditLogs />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/permissions" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <PermissionsMatrix />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/user-permissions" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <UserPermissions />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <SystemSettings />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/ai-agent" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <AIAgentConfig />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/c2s-dashboard" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <C2SDashboard />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/portal-integration" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <PortalIntegration />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/gestao" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <ManagementDashboard />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  {/* Minha IA Routes */}
                  <Route path="/admin/ia-dashboard" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <AIMainDashboard />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/leads" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <LeadsManagement />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/ia-comportamento" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <AIUnifiedConfig />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/ia-configuracao" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <AIUnifiedConfig />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/leads-relatorios" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <LeadsReports />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/ia-notificacoes" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <AINotifications />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/design-preview" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <DesignPreview />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/whatsapp-profile" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <WhatsAppProfileSettings />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/empreendimentos" element={
                    <ProtectedRoute>
                      <AdminGuard>
                        <DevelopmentsManagement />
                      </AdminGuard>
                    </ProtectedRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </RealtimeMessagesProvider>
        </DepartmentProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;