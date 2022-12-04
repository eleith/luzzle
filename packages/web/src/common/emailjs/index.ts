import { SMTPClient } from 'emailjs'
import config from '@app/common/config'

const client = new SMTPClient({
  user: config.private.EMAILJS_USER,
  password: config.private.EMAILJS_PASSWORD,
  host: config.private.EMAILJS_HOST,
  port: parseInt(config.private.EMAILJS_PORT || '465'),
  ssl: true,
})

export { client }
