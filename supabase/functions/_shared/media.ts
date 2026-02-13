// ========== MEDIA EXTRACTION ==========
// Extract media info from WhatsApp webhook messages

export interface MediaInfoResult {
  type: string;
  id: string | null;
  caption: string | null;
  mimeType: string | null;
  filename: string | null;
  url?: string;
  coordinates?: { latitude: number; longitude: number };
}

/**
 * Extract media info from a WhatsApp message and fetch media URL
 */
export async function extractMediaInfo(message: any, _value: any): Promise<MediaInfoResult | null> {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  if (!accessToken) {
    console.error('WhatsApp access token not found');
    return null;
  }

  let mediaInfo: MediaInfoResult | null = null;

  try {
    switch (message.type) {
      case 'image':
        mediaInfo = {
          type: 'image',
          id: message.image.id,
          caption: message.image.caption || null,
          mimeType: message.image.mime_type || 'image/jpeg',
          filename: null
        };
        break;

      case 'audio':
        mediaInfo = {
          type: 'audio',
          id: message.audio.id,
          caption: null,
          mimeType: message.audio.mime_type || 'audio/ogg',
          filename: null
        };
        break;

      case 'video':
        mediaInfo = {
          type: 'video',
          id: message.video.id,
          caption: message.video.caption || null,
          mimeType: message.video.mime_type || 'video/mp4',
          filename: null
        };
        break;

      case 'document':
        mediaInfo = {
          type: 'document',
          id: message.document.id,
          caption: message.document.caption || null,
          mimeType: message.document.mime_type || 'application/octet-stream',
          filename: message.document.filename || 'documento'
        };
        break;

      case 'sticker':
        mediaInfo = {
          type: 'sticker',
          id: message.sticker.id,
          caption: null,
          mimeType: message.sticker.mime_type || 'image/webp',
          filename: null
        };
        break;

      case 'voice':
        mediaInfo = {
          type: 'voice',
          id: message.voice.id,
          caption: null,
          mimeType: message.voice.mime_type || 'audio/ogg',
          filename: null
        };
        break;

      case 'location':
        mediaInfo = {
          type: 'location',
          id: null,
          caption: `📍 ${message.location.name || 'Localização'}\n${message.location.address || ''}`,
          mimeType: null,
          filename: null,
          coordinates: {
            latitude: message.location.latitude,
            longitude: message.location.longitude
          }
        };
        break;

      default:
        return null;
    }

    // Fetch media URL from WhatsApp API
    if (mediaInfo?.id) {
      try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${mediaInfo.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
          const mediaData = await response.json();
          mediaInfo.url = mediaData.url;
        } else {
          console.error('Failed to fetch media URL:', response.status);
        }
      } catch (error) {
        console.error('Error fetching media URL:', error);
      }
    }

    return mediaInfo;
  } catch (error) {
    console.error('Error extracting media info:', error);
    return null;
  }
}
