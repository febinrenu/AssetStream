/**
 * Chart color helpers — pass these to Recharts SVG props
 * (SVG fill/stroke attrs don't resolve CSS custom properties)
 */
export function getChartColors(isDark: boolean) {
  return {
    text:    isDark ? "#8888A8" : "#6B6B82",
    surface: isDark ? "#131316" : "#FFFFFF",
    border:  isDark ? "#2C2C35" : "#D8D8E0",
    accent:  isDark ? "#2DD4BF" : "#0D9488",
    amber:   isDark ? "#FBBF24" : "#D97706",
    red:     isDark ? "#F87171" : "#DC2626",
    purple:  isDark ? "#C084FC" : "#9333EA",
    series:  isDark
      ? ["#2DD4BF", "#FBBF24", "#60A5FA", "#C084FC"]
      : ["#0D9488", "#D97706", "#3B82F6", "#9333EA"],
  };
}
