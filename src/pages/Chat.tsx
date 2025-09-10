import { useParams, useNavigate } from "react-router-dom";
import { ChatLayout } from "@/components/chat/ChatLayout";

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
    <ChatLayout
      selectedContact={phoneNumber}
      onContactSelect={handleContactSelect}
    />
  );
}