/**
 * TubeRise Design Tokens — TubeRise Standard
 *
 * Primary accent : Royal Blue  #3366FF  (user UI, icons, toggles, progress)
 * Admin/Action   : Crimson Red #E02020  (admin UI, create campaign button)
 * Card bg        : Deep Black  #121212  (content cards)
 * Background     : Pure White  #FFFFFF
 */
export const Colors = {
  // ── Brand ──────────────────────────────────────────────────────────────
  primary:       '#3366FF',   // Royal Blue  — user accent
  primaryDark:   '#2952CC',
  primaryLight:  '#EEF3FF',

  admin:         '#E02020',   // Crimson Red — admin / create campaign
  adminLight:    '#FFEBEB',

  // ── Backgrounds ────────────────────────────────────────────────────────
  background:    '#FFFFFF',   // pure white screen backgrounds
  cardBg:        '#121212',   // deep black cards (video area, task cards)
  cardBgLight:   '#F8F8F8',   // light card variant
  surface:       '#FFFFFF',

  // ── Text ───────────────────────────────────────────────────────────────
  textPrimary:           '#121212',
  textSecondary:         '#6B7280',
  textMuted:             '#9CA3AF',
  textOnDark:            '#FFFFFF',
  textOnDarkSecondary:   'rgba(255,255,255,0.55)',

  // ── Neutrals ───────────────────────────────────────────────────────────
  border:       '#E5E7EB',
  divider:      '#F3F4F6',
  lightGray:    '#F9FAFB',
  medGray:      '#E5E7EB',

  // ── Task type palette ──────────────────────────────────────────────────
  watch:     '#3366FF',   // Royal Blue
  subscribe: '#F59E0B',   // Amber
  like:      '#E02020',   // Crimson Red
  comment:   '#8B5CF6',   // Violet

  // ── Status ─────────────────────────────────────────────────────────────
  success:   '#10B981',
  warning:   '#F59E0B',
  error:     '#E02020',

  // ── Misc ───────────────────────────────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
  gold:        '#F59E0B',
  blue:        '#3366FF',
  overlayDark: 'rgba(18,18,18,0.88)',

  // Legacy aliases kept for backward-compat with existing components
  headerBg:    '#3366FF',
  headerText:  '#FFFFFF',
  timerBg:     '#FFFFFF',
};
