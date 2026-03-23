import type {
  StatCardData,
  UsageStatistics,
  TipCategory,
  UsageTip,
} from '../types/statistics.interface';

/**
 * Formats a number for display.
 * @param num - The number to format.
 * @returns The formatted string.
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Gets the score class based on the average score.
 * @param averageScore - The average score.
 * @returns The score class.
 */
export function getScoreClass(averageScore: number): 'high' | 'medium' | 'low' {
  if (averageScore >= 80) return 'high';
  if (averageScore >= 60) return 'medium';
  return 'low';
}

/**
 * Calculates the daily progress percentage.
 * @param todayAnalyses - Today's analysis count.
 * @param dailyLimit - The daily limit.
 * @returns The percentage value.
 */
export function getDailyProgressPercentage(
  todayAnalyses: number,
  dailyLimit: number,
): number {
  return Math.min((todayAnalyses / dailyLimit) * 100, 100);
}

/**
 * Gets the label for a tip category.
 * @param category - The category.
 * @returns The localized label.
 */
export function getCategoryLabel(category: TipCategory): string {
  const labels: Record<string, string> = {
    general: '通用',
    file: '文件',
    accuracy: '准确性',
    analysis: '分析',
  };
  return labels[category] || category;
}

/**
 * Filters tips by category.
 * @param tips - The tips to filter.
 * @param category - The selected category.
 * @returns The filtered tips.
 */
export function getFilteredTips(
  tips: UsageTip[],
  category: TipCategory,
): UsageTip[] {
  return tips.filter(
    (tip) =>
      tip.category === category || (!tip.category && category === 'general'),
  );
}

/**
 * Tracks tips by their title and description.
 * @param tip - The tip to track.
 * @returns The track identifier.
 */
export function trackByTip(tip: UsageTip): string {
  return `${tip.title}-${tip.description.slice(0, 20)}`;
}

/**
 * Creates stat card data from usage statistics.
 * @param statistics - The usage statistics.
 * @returns An array of stat card data.
 */
export function createStatCards(statistics: UsageStatistics): StatCardData[] {
  const cards: StatCardData[] = [
    {
      value: statistics.todayAnalyses,
      label: '今日分析',
      icon: 'calendar',
      type: 'today',
      title: `今日已完成 ${statistics.todayAnalyses} 次分析`,
    },
    {
      value: statistics.totalAnalyses,
      label: '总计分析',
      icon: 'check',
      type: 'total',
      title: `累计完成 ${statistics.totalAnalyses} 次分析`,
    },
    {
      value: statistics.averageScore,
      label: '平均得分',
      icon: 'star',
      type: 'score',
      scoreClass: getScoreClass(statistics.averageScore),
      suffix: '分',
      title: `平均匹配分数为 ${statistics.averageScore} 分`,
    },
  ];

  if (statistics.monthlyAnalyses) {
    cards.push({
      value: statistics.monthlyAnalyses,
      label: '本月分析',
      icon: 'chart',
      type: 'monthly',
    });
  }

  if (statistics.successRate) {
    cards.push({
      value: statistics.successRate,
      label: '成功率',
      icon: 'check-circle',
      type: 'success',
      suffix: '%',
    });
  }

  return cards;
}
