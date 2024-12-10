import fs from 'node:fs/promises';
import path from 'node:path';
import { type AliasToken } from 'antd/es/theme/internal';
import { darkToken, isValidColor, isValidKey, lightToken } from './utils.ts';

/**
 * Generates CSS variables for valid color values in the token object under the specified CSS selector.
 * Non-color values are ignored.
 *
 * Example output:
 * :root {
 *   --colorPrimary: #1F21B6;
 *   --colorInfo: #1f21b6;
 *   --colorText: #1F2126E0;
 * }
 */
function generateCssVars(token: AliasToken, selector: string = ':root') {
  let cssContent = `${selector} {\n`;

  // Process token colors
  Object.entries(token).forEach(([key, value]) => {
    if (typeof value === 'string' && isValidColor(value) && isValidKey(key)) {
      cssContent += `  --${key}: ${value};\n`;
    }
  });

  cssContent += '}\n';

  return cssContent;
}

/**
 * Generates CSS variables for dark theme differences compared to the light theme.
 * Only colors that are different in dark theme are included.
 *
 * Example output:
 * .dark {
 *   --colorPrimary: #1B20B2;
 * }
 */
function generateDarkThemeVars(lightToken: AliasToken, darkToken: AliasToken) {
  let cssContent = '.dark {\n';

  // Only include colors that are different in dark theme
  (Object.entries(darkToken) as Array<[keyof AliasToken, string]>).forEach(([key, value]) => {
    if (
      typeof value === 'string' &&
      isValidColor(value) &&
      isValidKey(key) &&
      lightToken[key] !== value
    ) {
      cssContent += `  --${key}: ${value};\n`;
    }
  });

  cssContent += '}\n';

  return cssContent;
}

/**
 * Main function that generates the theme.css file.
 * It includes all base CSS variables and dark theme differences.
 *
 * Example output:
 * :root { ... }
 * .dark { ... }
 */
async function main() {
  try {
    // Generate light theme CSS and dark theme differences
    const lightCssContent = generateCssVars(lightToken);
    const darkCssContent = generateDarkThemeVars(lightToken, darkToken);

    const combinedCssContent = `${lightCssContent}\n${darkCssContent}`;

    const outputPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../app/theme.css',
    );

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, combinedCssContent, 'utf-8');
    // eslint-disable-next-line no-console
    console.log('✅ Successfully generated theme.css in', outputPath);
  } catch (error) {
    console.error('❌ Error generating CSS file:', error);
    process.exit(1);
  }
}

main();
