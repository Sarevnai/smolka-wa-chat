import { useParams, useNavigate } from "react-router-dom";
import { ChatLayout } from "@/components/chat/ChatLayout";
import Layout from "@/components/Layout";

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const handleConversationSelect = (selectedConversationId: string) => {
    if (selectedConversationId) {
      navigate(`/chat/${selectedConversationId}`);
    } else {
      navigate("/chat");
    }
  };

  return (
    <Layout>
      <ChatLayout
        selectedConversationId={conversationId}
        onConversationSelect={handleConversationSelect}
      />
    </Layout>
  );
}