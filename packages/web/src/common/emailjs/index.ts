import { SMTPClient } from 'emailjs'

const client = new SMTPClient({
  user: process.env.EMAILJS_USER,
  password: process.env.EMAILJS_PASSWORD,
  host: process.env.EMAILJS_HOST,
  port: parseInt(process.env.EMAILJS_PORT || '465'),
  ssl: true,
})

export { client }
