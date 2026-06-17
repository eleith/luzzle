<script lang="ts">
	import { DatePicker as DatePickerPrimitive } from 'bits-ui'
	import { parseDate, type DateValue } from '@internationalized/date'
	import CalendarIcon from 'virtual:icons/ph/calendar-blank'
	import CaretLeftIcon from 'virtual:icons/ph/caret-left'
	import CaretRightIcon from 'virtual:icons/ph/caret-right'

	type Props = {
		value: string // YYYY-MM-DD
		label?: string
	}

	let { value = $bindable(''), label }: Props = $props()

	let internalValue = $state<DateValue | undefined>(undefined)

	// Sync value from parent string to internal DateValue
	$effect(() => {
		if (value) {
			try {
				const parsed = parseDate(value)
				if (!internalValue || internalValue.toString() !== parsed.toString()) {
					internalValue = parsed
				}
			} catch {
				internalValue = undefined
			}
		} else {
			internalValue = undefined
		}
	})

	// Sync internal DateValue back to parent string
	function handleValueChange(newValue: DateValue | undefined) {
		value = newValue ? newValue.toString() : ''
	}
</script>

<div class="datepicker-wrapper">
	<DatePickerPrimitive.Root
		value={internalValue}
		onValueChange={handleValueChange}
		weekdayFormat="short"
		fixedWeeks={true}
	>
		{#if label}
			<DatePickerPrimitive.Label class="date-label">{label}</DatePickerPrimitive.Label>
		{/if}
		<DatePickerPrimitive.Input class="date-input">
			{#snippet children({ segments })}
				<div class="segments-container">
					{#each segments as { part, value: val }, idx (idx)}
						<DatePickerPrimitive.Segment {part} class="date-segment">
							{val}
						</DatePickerPrimitive.Segment>
					{/each}
				</div>
				<DatePickerPrimitive.Trigger class="date-trigger">
					<CalendarIcon />
				</DatePickerPrimitive.Trigger>
			{/snippet}
		</DatePickerPrimitive.Input>

		<DatePickerPrimitive.Portal>
			<DatePickerPrimitive.Content sideOffset={6} class="date-calendar-content">
				<DatePickerPrimitive.Calendar>
					{#snippet children({ months, weekdays })}
						<header class="calendar-header">
							<DatePickerPrimitive.PrevButton class="calendar-nav-btn">
								<CaretLeftIcon />
							</DatePickerPrimitive.PrevButton>
							<DatePickerPrimitive.Heading class="calendar-heading" />
							<DatePickerPrimitive.NextButton class="calendar-nav-btn">
								<CaretRightIcon />
							</DatePickerPrimitive.NextButton>
						</header>

						{#each months as month, mIdx (mIdx)}
							<DatePickerPrimitive.Grid class="calendar-grid">
								<DatePickerPrimitive.GridHead>
									<DatePickerPrimitive.GridRow>
										{#each weekdays as day, dIdx (dIdx)}
											<DatePickerPrimitive.HeadCell class="calendar-head-cell">
												{day}
											</DatePickerPrimitive.HeadCell>
										{/each}
									</DatePickerPrimitive.GridRow>
								</DatePickerPrimitive.GridHead>

								<DatePickerPrimitive.GridBody>
									{#each month.weeks as weekDates, wIdx (wIdx)}
										<DatePickerPrimitive.GridRow>
											{#each weekDates as date (date.toString())}
												<DatePickerPrimitive.Cell {date} month={month.value} class="calendar-cell">
													<DatePickerPrimitive.Day class="calendar-day" />
												</DatePickerPrimitive.Cell>
											{/each}
										</DatePickerPrimitive.GridRow>
									{/each}
								</DatePickerPrimitive.GridBody>
							</DatePickerPrimitive.Grid>
						{/each}
					{/snippet}
				</DatePickerPrimitive.Calendar>
			</DatePickerPrimitive.Content>
		</DatePickerPrimitive.Portal>
	</DatePickerPrimitive.Root>
</div>

<style>
	.datepicker-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
	}

	/* Use :global() to style child components without trigger Svelte unused warnings */
	.datepicker-wrapper :global(.date-label) {
		font-size: var(--font-size-xs);
		color: var(--color-on-surface-variant);
		text-transform: uppercase;
		font-weight: var(--font-weight-medium);
	}

	.datepicker-wrapper :global(.date-input) {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		border: 3px solid var(--color-surface-inverse);
		background: var(--color-surface-container-highest);
		height: 50px;
		color: var(--color-on-surface);
		padding: 0 12px;
		font-size: 16px;
		width: 100%;
		outline: none;
		box-sizing: border-box;
	}

	.datepicker-wrapper :global(.date-input:focus-within) {
		background: var(--color-surface-inverse);
		color: var(--color-on-surface-inverse);
	}

	.datepicker-wrapper :global(.segments-container) {
		display: flex;
		align-items: center;
	}

	.datepicker-wrapper :global(.date-segment) {
		padding: 0 2px;
		outline: none;
		user-select: none;
	}

	.datepicker-wrapper :global(.date-segment[data-placeholder]) {
		color: var(--color-on-surface-variant);
		opacity: 0.7;
	}

	.datepicker-wrapper :global(.date-segment:focus) {
		background: var(--color-primary);
		color: var(--color-on-primary);
		border-radius: var(--radius-small);
	}

	.datepicker-wrapper :global(.date-trigger) {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		padding: 0;
	}

	:global(.date-calendar-content) {
		background-color: var(--color-surface-container-highest);
		border: 1px solid var(--color-outline);
		border-radius: var(--radius-medium);
		box-shadow: var(--shadow-raised);
		z-index: 2000;
		padding: var(--space-4);
	}

	:global(.date-calendar-content .calendar-header) {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-3);
		gap: var(--space-4);
	}

	:global(.date-calendar-content .calendar-nav-btn) {
		background: transparent;
		border: none;
		color: var(--color-on-surface);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
	}

	:global(.date-calendar-content .calendar-nav-btn:hover) {
		background-color: var(--color-surface-container-low);
	}

	:global(.date-calendar-content .calendar-heading) {
		font-weight: var(--font-weight-medium);
		color: var(--color-on-surface);
	}

	:global(.date-calendar-content .calendar-grid) {
		width: 100%;
		border-collapse: collapse;
	}

	:global(.date-calendar-content .calendar-head-cell) {
		font-weight: var(--font-weight-medium);
		font-size: 12px;
		color: var(--color-on-surface-variant);
		padding: var(--space-1);
		text-align: center;
		width: 32px;
	}

	:global(.date-calendar-content .calendar-cell) {
		padding: 2px;
		text-align: center;
	}

	:global(.date-calendar-content .calendar-day) {
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-full);
		cursor: pointer;
		font-size: 14px;
		background: transparent;
		border: none;
		color: var(--color-on-surface);
	}

	:global(.date-calendar-content .calendar-day:hover),
	:global(.date-calendar-content .calendar-day[data-highlighted]) {
		background-color: var(--color-surface-container-low);
	}

	:global(.date-calendar-content .calendar-day[data-selected]) {
		background-color: var(--color-primary) !important;
		color: var(--color-on-primary) !important;
	}

	:global(.date-calendar-content .calendar-day[data-disabled]) {
		color: var(--color-on-surface-variant);
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
