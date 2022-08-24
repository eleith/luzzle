import builder from '@app/lib/graphql/builder'
import zod from 'zod'

const DiscussionInput = builder.inputType('DiscussionInput', {
  fields: (t) => ({
    slug: t.string({ required: true }),
    email: t.string({ required: true, validate: { email: true } }),
    discussion: t.string({ required: true, validate: { maxLength: 1024 } }),
    topic: t.string({
      required: true,
      validate: {
        schema: zod.enum(['reflection', 'recommendation', 'reflection-critical']),
      },
    }),
  }),
})

builder.mutationFields((t) => ({
  createBookDiscussion: t.boolean({
    args: {
      input: t.arg({ type: DiscussionInput, required: true }),
    },
    resolve: async () => {
      console.log('we are sending mail!')
      return true
    },
  }),
}))
