import { MetaProps } from '@app/common/components/layout/meta'
import { Box, Text } from '@luzzle/ui/components'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowUp, Swap } from 'phosphor-react'
import Page from './Page'
import PageBannerSlide from './PageBannerSlide'

interface PageProps {
	meta: MetaProps
	children: React.ReactNode
	link: string
	markdown?: string
}

export default function PageMarkdown(props: PageProps): JSX.Element {
	const { meta, link, markdown, children } = props
	const [showMarkdown, setShowMarkdown] = useState(false)

	return (
		<Page meta={meta}>
			<PageBannerSlide>
				<Link href={link}>
					<a>
						<ArrowUp size={35} color={'#4f4f4f'} />
					</a>
				</Link>
				<Box style={{ cursor: 'pointer' }}>
					<Swap
						size={35}
						color={'#4f4f4f'}
						onClick={() => {
							setShowMarkdown(!showMarkdown)
						}}
					/>
				</Box>
			</PageBannerSlide>
			<Box>{children}</Box>
			<Text as={'code'}>{markdown}</Text>
		</Page>
	)
}
