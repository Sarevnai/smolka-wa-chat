import { useState } from "react";
import { MessageRow } from "@/lib/messages";

export function useMediaGallery() {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const openGallery = (mediaIndex: number = 0) => {
    setSelectedMediaIndex(mediaIndex);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
    setSelectedMediaIndex(0);
  };

  const getMediaMessages = (messages: MessageRow[]) => {
    return messages.filter(msg => msg.media_url && msg.media_type);
  };

  return {
    isGalleryOpen,
    selectedMediaIndex,
    openGallery,
    closeGallery,
    getMediaMessages
  };
}