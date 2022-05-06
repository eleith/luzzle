import React from 'react'
import { Text } from './Text'
import { VariantProps, CSS } from '@app/lib/ui/stitches.config'
import merge from 'lodash/merge'

const DEFAULT_TAG = 'h1'

type TextSizeVariants = Pick<VariantProps<typeof Text>, 'size'>
type HeadingSizeVariants = '1' | '2' | '3' | '4'
type HeadingVariants = { size?: HeadingSizeVariants } & Omit<VariantProps<typeof Text>, 'size'>
type HeadingProps = React.ComponentProps<typeof DEFAULT_TAG> &
  HeadingVariants & { css?: CSS; as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' }

function HeadingComponent(
  props: HeadingProps,
  forwardedRef: React.ForwardedRef<HTMLHeadingElement>
): JSX.Element {
  // '2' here is the default heading size variant
  const { size = '1', ...textProps } = props

  // This is the mapping of Heading Variants to Text variants
  const textSize: Record<HeadingSizeVariants, TextSizeVariants['size']> = {
    1: { '@initial': '4' },
    2: { '@initial': '6' },
    3: { '@initial': '7' },
    4: { '@initial': '8' },
  }

  // This is the mapping of Heading Variants to Text css
  const textCss: Record<HeadingSizeVariants, CSS> = {
    1: { fontWeight: 500, lineHeight: '20px' },
    2: { fontWeight: 500, lineHeight: '35px' },
    3: { fontWeight: 500, lineHeight: '43px' },
    4: { fontWeight: 500, lineHeight: '55px' },
  }

  return (
    <Text
      as={DEFAULT_TAG}
      {...textProps}
      ref={forwardedRef}
      size={textSize[size]}
      css={{
        fontVariantNumeric: 'proportional-nums',
        ...merge(textCss[size], props.css),
      }}
    />
  )
}

export const Heading = React.forwardRef<React.ElementRef<typeof DEFAULT_TAG>, HeadingProps>(
  HeadingComponent
)
