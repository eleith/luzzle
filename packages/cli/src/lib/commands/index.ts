import edit from './edit.js'
import editConfig from './editConfig.js'
import field from './field.js'
import process from './process.js'
import create from './create.js'
import fetch from './fetch.js'
import init from './init.js'
import sync from './sync.js'
import cd from './cd.js'
import deploy from './deploy.js'
import dump from './dump.js'
import validate from './validate.js'

export type { Command, Context } from './utils/types.js'

export default {
	edit,
	editConfig,
	field,
	process,
	create,
	fetch,
	init,
	sync,
	cd,
	deploy,
	dump,
	validate,
}
