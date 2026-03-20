import type {
  SkillTagStyle,
  RadarChartData,
} from '../../../../interfaces/detailed-analysis.interface';
import type { DetailedAnalysisResult } from '../../../../interfaces/detailed-analysis.interface';

/**
 * Generates skill tag styles based on skill name.
 * @param skill - The skill name.
 * @returns The skill tag style.
 */
export function getSkillTagStyle(skill: string): SkillTagStyle {
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
  ];
  const index = skill.length % colors.length;

  return {
    'background-color': colors[index],
    color: 'white',
  };
}

/**
 * Calculates the radar chart data from skill analysis.
 * @param skillAnalysis - The skill analysis data.
 * @returns Array of radar chart data.
 */
export function getRadarChartData(
  skillAnalysis: DetailedAnalysisResult['skillAnalysis'],
): RadarChartData[] {
  if (!skillAnalysis) return [];

  return [
    { skill: '技术能力', value: skillAnalysis.technical },
    { skill: '沟通能力', value: skillAnalysis.communication },
    { skill: '问题解决', value: skillAnalysis.problemSolving },
    { skill: '团队协作', value: skillAnalysis.teamwork },
    { skill: '领导能力', value: skillAnalysis.leadership },
  ];
}

/**
 * Calculates the overall match percentage.
 * @param radarData - The radar chart data.
 * @returns The overall match percentage.
 */
export function getOverallMatch(radarData: RadarChartData[]): number {
  if (radarData.length === 0) return 0;

  const total = radarData.reduce((sum, item) => sum + item.value, 0);
  return Math.round(total / radarData.length);
}

/**
 * Formats the analysis time for display.
 * @param analysisTime - The ISO analysis time.
 * @returns The formatted time string.
 */
export function getFormattedAnalysisTime(
  analysisTime: string | undefined,
): string {
  if (!analysisTime) return '';

  const date = new Date(analysisTime);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value || '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  return `${year}年${month}月${day}日 ${hour}:${minute}`;
}

/**
 * Extracts experience years from experience text.
 * @param experienceText - The experience text.
 * @returns The number of years.
 */
export function getExperienceYears(experienceText: string | undefined): number {
  if (!experienceText) return 0;
  const match = experienceText.match(/(\d+)年/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Determines if the device is mobile.
 * @returns True if mobile.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

/**
 * Gets the layout class based on device type.
 * @returns The layout class string.
 */
export function getLayoutClass(): string {
  const classes = ['results-container'];
  if (isMobileDevice()) {
    classes.push('mobile-layout');
  }
  return classes.join(' ');
}
