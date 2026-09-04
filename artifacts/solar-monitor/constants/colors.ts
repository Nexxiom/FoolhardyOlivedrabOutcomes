/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#f5f7fb',
    tint: '#f6b94a',

    // Core surfaces
    background: '#0b1324',
    foreground: '#f5f7fb',

    // Cards / elevated surfaces
    card: '#121f35',
    cardForeground: '#f5f7fb',

    // Primary action color (buttons, links, active states)
    primary: '#f6b94a',
    primaryForeground: '#0b1324',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#1a2a44',
    secondaryForeground: '#d9e4f1',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#18263d',
    mutedForeground: '#8fa3bd',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#163b4a',
    accentForeground: '#94e6db',

    // Destructive actions (delete, error states)
    destructive: '#ff7168',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#233653',
    input: '#233653',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;
