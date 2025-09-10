import { useParams, useNavigate } from "react-router-dom";
import { ChatLayout } from "@/components/chat/ChatLayout";
import Layout from "@/components/Layout";

export default function Chat() {
  const { phoneNumber } = useParams<{ phoneNumber?: string }>();
  const navigate = useNavigate();

  const handleContactSelect = (selectedPhoneNumber: string) => {
    if (selectedPhoneNumber) {
      navigate(`/chat/${selectedPhoneNumber}`);
    } else {
      navigate("/chat");
    }
  };

  return (
    <Layout>
      <ChatLayout
        selectedContact={phoneNumber}
        onContactSelect={handleContactSelect}
      />
    </Layout>
  );
}