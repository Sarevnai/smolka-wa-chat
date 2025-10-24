/**
 * Calculate automatic contact rating based on engagement metrics
 * Returns a rating from 1 to 5 stars
 */

interface ContactMetrics {
  totalMessages: number;
  lastMessageTimestamp: string | null;
  activeContracts: number;
}

export function calculateContactRating(metrics: ContactMetrics): number {
  let score = 0;
  
  // 1. Message frequency score (0-2 points)
  if (metrics.totalMessages === 0) {
    score += 0;
  } else if (metrics.totalMessages < 5) {
    score += 0.5;
  } else if (metrics.totalMessages < 10) {
    score += 1;
  } else if (metrics.totalMessages < 20) {
    score += 1.5;
  } else {
    score += 2; // 20+ messages
  }
  
  // 2. Recency score (0-2 points)
  if (metrics.lastMessageTimestamp) {
    const daysSinceLastMessage = getDaysSince(metrics.lastMessageTimestamp);
    
    if (daysSinceLastMessage <= 7) {
      score += 2; // Within last week
    } else if (daysSinceLastMessage <= 30) {
      score += 1.5; // Within last month
    } else if (daysSinceLastMessage <= 90) {
      score += 1; // Within last 3 months
    } else if (daysSinceLastMessage <= 180) {
      score += 0.5; // Within last 6 months
    }
    // else: 0 points for older contacts
  }
  
  // 3. Active contracts score (0-1 point)
  if (metrics.activeContracts >= 3) {
    score += 1;
  } else if (metrics.activeContracts >= 2) {
    score += 0.75;
  } else if (metrics.activeContracts >= 1) {
    score += 0.5;
  }
  
  // Convert 0-5 score to 1-5 rating
  // If no activity at all, return 1 star minimum
  if (score === 0) {
    return 1;
  }
  
  // Round to nearest 0.5 and cap at 5
  const rating = Math.min(5, Math.max(1, Math.round(score * 2) / 2));
  
  return Math.round(rating); // Return integer rating (1-5)
}

function getDaysSince(timestamp: string): number {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get a description of what the rating means
 */
export function getRatingDescription(rating: number): string {
  switch (rating) {
    case 5:
      return "Contato VIP - Alta engajamento e atividade recente";
    case 4:
      return "Contato ativo - Boa interação";
    case 3:
      return "Contato regular - Interação moderada";
    case 2:
      return "Contato com pouca atividade";
    case 1:
      return "Contato inativo ou novo";
    default:
      return "Sem classificação";
  }
}
