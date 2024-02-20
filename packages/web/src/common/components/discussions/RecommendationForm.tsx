import gql from '@app/lib/graphql/tag'
import { CreateRecommendationDocument } from './_gql_/RecommendationForm'
import { Box, Button, Input, TextArea, useNotificationQueue, Text } from '@luzzle/ui/components'
import { CircleNotch } from 'phosphor-react'
import { Form, FormState, useFormState } from 'ariakit/form'
import gqlFetch from '@app/common/graphql/fetch'
import { PageProgress, useProgressPageState } from '@luzzle/ui/components'

const recommendationMutation = gql<
	typeof CreateRecommendationDocument
>(`mutation CreateRecommendation($input: RecommendationInput!) {
  createRecommendation(input: $input) {
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
    ... on MutationCreateRecommendationSuccess {
      data
    }
  }
}`)

type Props = {
	onClose?: () => void
	title?: string
}

export default function DiscussionForm({ onClose, title = 'recommend' }: Props): JSX.Element {
	const notifications = useNotificationQueue()
	const pageProgressState = useProgressPageState({ imitate: true, progress: 0 })
	const formState = useFormState({
		defaultValues: { topic: '', discussion: '', email: '' },
	})

	formState.useSubmit(async () => {
		pageProgressState.setProgress(Math.random() * 35)
		const { createRecommendation } = await gqlFetch(recommendationMutation, {
			input: {
				recommendation: formState.values.discussion,
				email: formState.values.email,
			},
		})
		pageProgressState.setProgress(100)
		if (createRecommendation) {
			const type = createRecommendation.__typename
			if (type === 'MutationCreateRecommendationSuccess') {
				notifications.add({ item: 'thank you!' })
				formState.reset()
				onClose?.()
			} else if (type === 'Error') {
				console.error(createRecommendation)
				notifications.add({ item: 'your message was not sent, try again' })
			} else if (type === 'ValidationError') {
				const fieldErrors = createRecommendation.fieldErrors
				fieldErrors?.forEach((fieldError) => {
					const field = fieldError.path?.split('.').pop() || ''
					if (formState.names[field as keyof typeof formState.values]) {
						formState.setError(field, fieldError.message)
					}
				})
			}
		}
	})

	function getTouchedError<T>(form: FormState, name: keyof T): string | undefined {
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
