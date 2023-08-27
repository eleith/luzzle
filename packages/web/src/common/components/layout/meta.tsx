import Head from 'next/head'
import config from '@app/common/config'

// NOTE: https://github.com/vercel/next.js/issues/5635

const makeTitle = (title: string, name?: string): string =>
	title === name || name === undefined ? title : `${title} | ${name}`

export interface MetaProps {
	title: string
	name?: string
	description?: string
	image?: string
	children?: React.ReactNode
}

const Meta = ({ title, name, description, image, children = [] }: MetaProps): JSX.Element => (
	<Head>
		<title key="title">{makeTitle(title, name)}</title>
		<meta key="og_locale" property="og:locale" content="en_US" />
		<meta key="og_type" property="og:type" content="website" />
		<meta key="og_site" property="og:site_name" content={name} />
		<meta key="og_title" property="og:title" content={makeTitle(title, name)} />
		<meta key="tw_title" name="twitter:title" content={makeTitle(title, name)} />
		{description && (
			<>
				<meta key="desc" name="description" content={description} />
				<meta key="og_desc" property="og:description" content={description} />
				<meta key="tw_desc" name="twitter:description" content={description} />
			</>
		)}
		{image && (
			<>
				<meta key="og_img" property="og:image" content={`${config.public.HOST}${image}`} />
				<meta key="og_img_type" property="og:image:type" content="image/png" />
				<meta key="og_img_width" property="og:image:width" content="1200" />
				<meta key="og_img_height" property="og:image:height" content="600" />
				<meta key="tw_card" name="twitter:card" content="summary_large_image" />
				<meta key="tw_img" name="twitter:image" content={`${config.public.HOST}${image}`} />
			</>
		)}
		<meta key="theme_color" name="theme-color" content={'blue'} />
		<meta key="tile_color" name="msapplication-TileColor" content={'blue'} />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link
			key="apple_icon"
			rel="apple-touch-icon"
			sizes="180x180"
			href={`${config.public.HOST_STATIC}/apple-touch-icon.png`}
		/>
		<link
			key="favicon_32"
			rel="icon"
			type="image/png"
			sizes="32x32"
			href={`${config.public.HOST_STATIC}/favicon-32x32.png`}
		/>
		<link
			key="favicon_16"
			rel="icon"
			type="image/png"
			sizes="16x16"
			href={`${config.public.HOST_STATIC}/favicon-16x16.png`}
		/>
		<link key="manifest" rel="manifest" href={`${config.public.HOST_STATIC}/site.webmanifest`} />
		<link
			rel="alternate"
			type="application/rss+xml"
			title="rss feed for books"
			href={`${config.public.HOST}/rss/books/feed.xml`}
		/>
		{children}
	</Head>
)

export default Meta
