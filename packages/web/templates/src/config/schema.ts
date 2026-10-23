import { Type } from '@sinclair/typebox';
import { schema as icon } from '../icons/schema.js';
import { schema as page } from '../pages/schema.js';
import { schema as opengraph } from '../opengraphs/schema.js';

export const templateSchema = Type.Object(
	{ icon, page, opengraph },
	{
		default: {},
		additionalProperties: false
	}
);
