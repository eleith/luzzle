import { colors, Modes } from './color'

export const shadows = {
  [Modes.light]: {
    raised: `0px 3px 1px -2px ${colors.light.shadowMedium}, 0px 2px 2px 0px ${colors.light.shadowLight}, 0px 1px 5px 0px rgba(0, 0, 0, 0.12)`,
  },
  [Modes.dark]: {
    raised: `0px 3px 1px -2px ${colors.dark.shadowMedium}, 0px 2px 2px 0px ${colors.dark.shadowLight}, 0px 1px 5px 0px rgba(0, 0, 0, 0.12)`,
  },
}
