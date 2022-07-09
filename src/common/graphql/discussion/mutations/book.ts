import builder from '@app/lib/graphql/builder'

const DiscussionInput = builder.inputType('DiscussionInput', {
  fields: (t) => ({
    email: t.string({ required: true }),
    discussion: t.string({ required: true }),
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
