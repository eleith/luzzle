import fs from 'fs'
import { Feed, Item } from 'feed'
import config from '@app/common/config'

export function generate(items: Item[], type: string) {
  const feed = new Feed({
    title: config.private.SITE_TITLE || '',
    description: config.private.SITE_DESCRIPTION,
    id: `${config.public.HOST}/${type}`,
    link: config.public.HOST,
    ttl: 60 * 24,
    // image,
    // favicon,
    updated: new Date(),
    generator: 'jpmonette/feed',
    language: 'en',
    copyright: `© ${new Date().getFullYear()}`,
    feedLinks: {
      rss2: `${config.public.HOST}/rss/${type}/feed.xml`,
      json: `${config.public.HOST}/rss/${type}/feed.json`,
      atom: `${config.public.HOST}/rss/${type}/atom.xml`,
    },
    // author: {
    //   name: '',
    //   email: '',
    //   link: '',
    // },
  })

  items.forEach((item) => {
    feed.addItem(item)
  })

  fs.mkdirSync(`./public/rss/${type}`, { recursive: true })
  fs.writeFileSync(`./public/rss/${type}/feed.xml`, feed.rss2())
  fs.writeFileSync(`./public/rss/${type}/atom.xml`, feed.atom1())
  fs.writeFileSync(`./public/rss/${type}/feed.json`, feed.json1())
}
