import gql from '@app/lib/graphql/tag'
import { CreateBookDiscussionDocument } from './_gql_/DiscussionForm'
import {
	Box,
	Button,
	Input,
	TextArea,
	Select,
	SelectItem,
	useNotificationQueue,
	Text,
} from '@luzzle/ui/components'
import { CircleNotch } from 'phosphor-react'
import { Form, FormState, useFormState } from 'ariakit/form'
import gqlFetch from '@app/common/graphql/fetch'
import { PageProgress, useProgressPageState } from '@luzzle/ui/components'

const bookDiscussionMutation = gql<
	typeof CreateBookDiscussionDocument
>(`mutation CreateBookDiscussion($input: DiscussionInput!) {
  createBookDiscussion(input: $input) {
    __typename
    ... on Error {
      message
    }
    ... on ValidationError {
      fieldErrors {
        message
        path
      }
    }
    ... on MutationCreateBookDiscussionSuccess {
      data
    }
  }
}`)

type Props = {
	slug: string
	onClose?: () => void
	title?: string
}

export default function DiscussionForm({ slug, onClose, title = 'discuss' }: Props): JSX.Element {
	const notifications = useNotificationQueue()
	const pageProgressState = useProgressPageState({ imitate: true, progress: 0 })
	const formState = useFormState({
		defaultValues: { topic: '', discussion: '', email: '' },
	})

	formState.useSubmit(async () => {
		pageProgressState.setProgress(Math.random() * 35)
		const { createBookDiscussion } = await gqlFetch(bookDiscussionMutation, {
			input: {
				discussion: formState.values.discussion,
				email: formState.values.email,
				topic: formState.values.topic,
				slug,
			},
		})
		pageProgressState.setProgress(100)
		if (createBookDiscussion) {
			const type = createBookDiscussion.__typename
			if (type === 'MutationCreateBookDiscussionSuccess') {
				notifications.add({ item: 'thank you!' })
				formState.reset()
				onClose?.()
			} else if (type === 'Error') {
				console.error(createBookDiscussion)
				notifications.add({ item: 'your message was not sent, try again' })
			} else if (type === 'ValidationError') {
				const fieldErrors = createBookDiscussion.fieldErrors
				fieldErrors?.forEach((fieldError) => {
					const field = fieldError.path?.split('.').pop() || ''
					if (formState.names[field as keyof typeof formState.values]) {
						formState.setError(field, fieldError.message)
					}
				})
			}
		}
	})

	function getTouchedError<T>(form: FormState<T>, name: keyof T): string | undefined {
		const touched = form.getFieldTouched(name as string)
		const error = form.getError(name as string)

		if (touched && error) {
			return error
		} else {
			return undefined
		}
	}

	return (
		<Box>
			<Box
				style={{
					display: 'flex',
					justifyContent: 'center',
				}}
			>
				<Box>
					<Text as="h1" size="title">
						{title}
					</Text>
					{pageProgressState.loading && <PageProgress state={pageProgressState} />}
					<Form state={formState} resetOnSubmit={false}>
						<Select
							label={'topic'}
							name={formState.names.topic}
							state={formState}
							value={formState.values.topic}
							error={getTouchedError(formState, 'topic')}
							disabled={formState.submitting}
							required
						>
							<SelectItem value={''}>select a topic</SelectItem>
							<SelectItem value={'recommendation'} display={'recommendation'}>
								a related book recommendation
							</SelectItem>
							<SelectItem value={'reflection'} display={'positive reflection'}>
								positive reflections about this book
							</SelectItem>
							<SelectItem value={'reflection-critical'} display={'critical reflection'}>
								critical reflections about this book
							</SelectItem>
						</Select>
						<br />
						<Input
							required
							name={formState.names.email}
							disabled={formState.submitting}
							label={'email'}
							type={'email'}
							pattern={'[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'}
							error={getTouchedError(formState, 'email')}
						/>
						<br />
						<TextArea
							name={formState.names.discussion}
							label={'discussion'}
							required
							error={getTouchedError(formState, 'discussion')}
							maxLength={2048}
							disabled={formState.submitting}
						/>
						<br />
						<Box style={{ display: 'flex', justifyContent: 'space-between' }}>
							<Button
								outlined
								disabled={formState.submitting}
								onClick={() => {
									formState.reset()
									onClose?.()
								}}
							>
								{onClose ? 'cancel' : 'reset'}
							</Button>
							<Button type={'submit'} disabled={formState.submitting} raised>
								{formState.submitting ? (
									<CircleNotch size={24}>
										<animateTransform
											attributeName="transform"
											attributeType="XML"
											type="rotate"
											dur="0.75s"
											from="0 0 0"
											to="360 0 0"
											repeatCount="indefinite"
										></animateTransform>
									</CircleNotch>
								) : (
									'Send'
								)}
							</Button>
						</Box>
					</Form>
				</Box>
			</Box>
		</Box>
	)
}
