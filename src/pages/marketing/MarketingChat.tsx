import { useParams, useNavigate } from "react-router-dom";
import { ChatLayout } from "@/components/chat/ChatLayout";
import Layout from "@/components/Layout";
import { useSyncDepartment } from "@/hooks/useSyncDepartment";

export default function MarketingChat() {
  useSyncDepartment('marketing');
  
  const { phoneNumber } = useParams<{ phoneNumber?: string }>();
  const navigate = useNavigate();

  const handleContactSelect = (selectedPhoneNumber: string) => {
    if (selectedPhoneNumber) {
      navigate(`/marketing/chat/${selectedPhoneNumber}`);
    } else {
      navigate("/marketing/chat");
    }
  };

  return (
    <Layout>
      <ChatLayout
        selectedContact={phoneNumber}
        onContactSelect={handleContactSelect}
        departmentFilter="marketing"
      />
    </Layout>
  );
}
