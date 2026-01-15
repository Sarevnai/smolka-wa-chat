import { useParams, useNavigate } from "react-router-dom";
import { ChatLayout } from "@/components/chat/ChatLayout";
import Layout from "@/components/Layout";
import { useSyncDepartment } from "@/hooks/useSyncDepartment";

export default function MarketingChat() {
  useSyncDepartment('marketing');
  
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const handleConversationSelect = (selectedConversationId: string) => {
    if (selectedConversationId) {
      navigate(`/marketing/chat/${selectedConversationId}`);
    } else {
      navigate("/marketing/chat");
    }
  };

  return (
    <Layout>
      <ChatLayout
        selectedConversationId={conversationId}
        onConversationSelect={handleConversationSelect}
        departmentFilter="marketing"
      />
    </Layout>
  );
}
