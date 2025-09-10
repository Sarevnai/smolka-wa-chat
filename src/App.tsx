import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Index from "./pages/Index";
import Inbox from "./pages/Inbox";
import Chat from "./pages/Chat";
import Send from "./pages/Send";
import Contacts from "./pages/Contacts";
import Reports from "./pages/Reports";
import ClickUpConfig from "./pages/ClickUpConfig";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:phoneNumber" element={<Chat />} />
            <Route path="/send" element={<Send />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/clickup" element={<ClickUpConfig />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
