import { Anchor, Box } from '@luzzle/ui/components'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, HandWaving, MagnifyingGlass } from 'phosphor-react'
import * as styles from './PageBannerSlide.css'
import Link from 'next/link'

interface PageProps {
	children?: React.ReactNode
	isHome?: boolean
	invert?: boolean
}

export default function PageBannerSlide({
	children,
	isHome = false,
	invert = false,
}: PageProps): JSX.Element {
	const [mounted, setMounted] = useState(false)
	const { resolvedTheme, setTheme } = useTheme()

	useEffect(() => {
		setMounted(true)
	}, [])

	function switchTheme(): void {
		setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
	}

	const lightOn = (
		<Box onClick={switchTheme}>
			<Sun size={25} />
		</Box>
	)

	const darkOn = (
		<Box onClick={switchTheme}>
			<Moon size={25} />
		</Box>
	)

	const homeButton = (
		<Link href="/" passHref>
			<Anchor color="inherit" style={{ visibility: isHome ? 'hidden' : 'visible' }}>
				<HandWaving size={25} />
			</Anchor>
		</Link>
	)

	const searchButton = (
		<Link href="/search" passHref>
			<Anchor color="inherit">
				<MagnifyingGlass size={25} />
			</Anchor>
		</Link>
	)

	const themeToggle = resolvedTheme === 'light' ? darkOn : lightOn
	const styleBanner = invert ? [styles.banner, styles.bannerInverted].join(' ') : styles.banner
	const styleNavItem = invert ? [styles.navItemInverted, styles.navItem].join(' ') : styles.navItem

	const homeBanner = (
		<Box>
			<Box className={styleBanner}>
				<Box className={styles.leftNavItems}>
					<Box className={styleNavItem}>{homeButton}</Box>
				</Box>
				<Box>{children && children}</Box>
				<Box className={styles.rightNavItems}>
					<Box className={styleNavItem}>{searchButton}</Box>
					<Box className={styleNavItem}>{mounted && themeToggle}</Box>
				</Box>
			</Box>
		</Box>
	)

	return homeBanner
}
