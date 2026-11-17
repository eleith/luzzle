import { templates as icons } from './icons/schema.js';
import { templates as pages } from './pages/schema.js';

/** Available built-ins, independent of any site's runtime configuration. */
export const iconTemplateNames = icons.map((template) => template.name);
export const pageTemplateNames = pages.map((template) => template.name);
