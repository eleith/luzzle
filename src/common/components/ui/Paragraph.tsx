import React from 'react'
import { Text } from './Text'
import { VariantProps, CSS } from '@app/lib/ui/stitches.config'
import merge from 'lodash/merge'

const DEFAULT_TAG = 'p'

type TextSizeVariants = Pick<VariantProps<typeof Text>, 'size'>
type ParagraphSizeVariants = '1' | '2'
type ParagraphVariants = { size?: ParagraphSizeVariants } & Omit<VariantProps<typeof Text>, 'size'>
type ParagraphProps = React.ComponentProps<typeof DEFAULT_TAG> &
  ParagraphVariants & { css?: CSS; as?: 'span' | 'p' }

function ParagraphComponent(
  props: ParagraphProps,
  forwardedRef: React.ForwardedRef<HTMLParagraphElement>
): JSX.Element {
  // '2' here is the default Paragraph size variant
  const { size = '1', ...textProps } = props

  // This is the mapping of Paragraph Variants to Text variants
  const textSize: Record<ParagraphSizeVariants, TextSizeVariants['size']> = {
    1: { '@initial': '3' },
    2: { '@initial': '5' },
  }

  // This is the mapping of Paragraph Variants to Text css
  const textCss: Record<ParagraphSizeVariants, CSS> = {
    1: { lineHeight: '25px' },
    2: { color: '$slate11', lineHeight: '27px' },
  }

  return (
    <Text
      as={DEFAULT_TAG}
      {...textProps}
      ref={forwardedRef}
      size={textSize[size]}
      css={{
        ...merge(textCss[size], props.css),
      }}
    />
  )
}

export const Paragraph = React.forwardRef<React.ElementRef<typeof DEFAULT_TAG>, ParagraphProps>(
  ParagraphComponent
)
