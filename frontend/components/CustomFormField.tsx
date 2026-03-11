"use client"
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage
} from "./ui/form"
import { Control, FieldPath, FieldValues } from "react-hook-form"

import Image from "next/image"

interface CustomFormFieldProps<TFieldValues extends FieldValues> {
	control: Control<TFieldValues>
	name: FieldPath<TFieldValues>
	placeholder?: string
	label?: string
	className?: string
	labelClassName?: string
	controlClassName?: string
	render: (props: { field: any }) => React.ReactNode
}

const CustomFormField = <TFieldValues extends FieldValues>({
	control,
	name,
	label,
	className,
	labelClassName,
	controlClassName,
	render
}: CustomFormFieldProps<TFieldValues>) => {
	return (
		<FormField<TFieldValues, FieldPath<TFieldValues>>
			control={control}
			name={name}
			render={({ field }) => (
				<FormItem className={className}>
					{name === "image" ? (
						<FormLabel className={labelClassName}>
							{field.value ? (
								<Image
									src={field.value}
									alt='profile photo'
									width={96}
									height={96}
									priority
									className='rounded-full object-contain max-w-24 max-h-24 pointer-events-none'
								/>
							) : (
								<Image
									src='/assets/profile.svg'
									alt='profile photo'
									width={24}
									height={24}
									className='rounded-full object-contain'
								/>
							)}
						</FormLabel>
					) : (
						label && <FormLabel className={labelClassName}>{label}</FormLabel>
					)}
					<FormControl className={controlClassName}>
						{render({ field })}
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}

export default CustomFormField
