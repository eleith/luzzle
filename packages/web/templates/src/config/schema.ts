import { Type } from '@sinclair/typebox';
import { schema as icon } from '../icons/default/schema.js';
import { schema as page } from '../pages/default/schema.js';
import { schema as opengraph } from '../opengraphs/default/schema.js';
import { createRoleSchema } from './association.js';

export const templateSchema = Type.Object(
	{
		icon: createRoleSchema('icon', icon),
		page: createRoleSchema('page', page),
		opengraph: createRoleSchema('opengraph', opengraph)
	},
	{
		default: {},
		additionalProperties: false
	}
);
