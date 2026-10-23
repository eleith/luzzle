import { createTemplateSelectionSchema } from '../config/association.js';
import { schema as fallback } from './default/schema.js';

export const schema = createTemplateSelectionSchema('page', [fallback]);
