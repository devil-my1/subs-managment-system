"use client"

import { cn, currencyFormat, hexToRgba } from "@/lib/utils"
import { Subscription } from "@/types"
import { Column, ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Trash } from "lucide-react"
import { useMemo } from "react"
import { Button } from "./ui/button"
import { useCurrency } from "@/context/CurrencyContext"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "./ui/dropdown-menu"

type SubColumnsOptions = {
	onDelete?: (sub: Subscription) => void
	deletingId?: string | null
	disableActions?: boolean
}

interface DataTableColumnHeaderProps<
	TData,
	TValue
> extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>
	title: string
}

interface AmountCellProps {
	amount?: number
	currency?: string
}

function AmountCell({ amount = 0, currency = "USD" }: AmountCellProps) {
	const { formatCurrency } = useCurrency()

	const formatted = useMemo(() => {
		if (formatCurrency) return formatCurrency(amount, currency)
		return currencyFormat(amount, currency)
	}, [amount, currency, formatCurrency])

	return <span className='font-bold text-red-500/70 pl-4'>{formatted}</span>
}

export function buildSubColumns(
	options: SubColumnsOptions = {}
): ColumnDef<Subscription>[] {
	const { convertToBase } = useCurrency()
	const { onDelete, deletingId, disableActions } = options

	const compareAmount = (a: Subscription, b: Subscription) => {
		const aVal = convertToBase ? convertToBase(a.amount, a.currency) : a.amount
		const bVal = convertToBase ? convertToBase(b.amount, b.currency) : b.amount
		return aVal === bVal ? 0 : aVal > bVal ? 1 : -1
	}

	const compareCategory = (a: Subscription, b: Subscription) => {
		const aName = a.category?.name?.toLowerCase() ?? "zzz"
		const bName = b.category?.name?.toLowerCase() ?? "zzz"
		return aName.localeCompare(bName)
	}

	const columns: ColumnDef<Subscription>[] = [
		{
			accessorKey: "title",
			cell: ({ row }) => (
				<span className='font-medium '>{row.original.title}</span>
			),
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						className='group cursor-pointer'
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Title
						<ArrowUpDown className='ml-2 h-4 w-4 group-hover:text-primary-400 transition-colors' />
					</Button>
				)
			}
		},
		{
			accessorKey: "category",
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						className='group cursor-pointer'
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Category
						<ArrowUpDown className='ml-2 h-4 w-4 group-hover:text-primary-400 transition-colors' />
					</Button>
				)
			},
			sortingFn: (rowA, rowB) => compareCategory(rowA.original, rowB.original),
			cell: ({ row }) => {
				const color = row.original.category?.color
				const hasColor = Boolean(color)
				return (
					<span
						className={`text-[#ab9db9] row_badge ${
							hasColor ? "" : "bg-pink-600/50 "
						}`}
						style={
							hasColor
								? {
										backgroundColor: hexToRgba(color!, 0.35),
										color: color!
									}
								: undefined
						}
					>
						{row.original.category?.name
							? row.original.category?.name
							: "Other"}
					</span>
				)
			}
		},
		{
			accessorKey: "start_date",
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						className='group  cursor-pointer'
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Start Date
						<ArrowUpDown className='ml-2 h-4 w-4 group-hover:text-primary-400 transition-colors' />
					</Button>
				)
			},
			cell: ({ row }) => (
				<span className='text-sm text-text-muted pl-4'>
					{row.original.start_date
						? new Date(row.original.start_date).toLocaleDateString()
						: "N/A"}
				</span>
			)
		},

		{
			accessorKey: "amount",
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						className='group cursor-pointer'
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Amount
						<ArrowUpDown className='ml-2 h-4 w-4 group-hover:text-primary-400 transition-colors' />
					</Button>
				)
			},
			cell: ({ row }) => (
				<AmountCell
					amount={row.original.amount}
					currency={row.original.currency}
				/>
			),
			sortingFn: (rowA, rowB) => compareAmount(rowA.original, rowB.original)
		},
		{
			accessorKey: "next_renewal_date",
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						className='group cursor-pointer'
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Next Renewal
						<ArrowUpDown className='ml-2 h-4 w-4 group-hover:text-primary-400 transition-colors' />
					</Button>
				)
			},
			cell: ({ row }) => (
				<span className='text-sm text-text-muted pl-4'>
					{row.original.next_renewal_date
						? new Date(row.original.next_renewal_date).toLocaleDateString()
						: "N/A"}
				</span>
			)
		},
		{
			accessorKey: "status",
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						className='group cursor-pointer -ml-4'
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Status
						<ArrowUpDown className='ml-2 h-4 w-4 group-hover:text-primary-400 transition-colors' />
					</Button>
				)
			},
			cell: ({ row }) => (
				<span
					className={cn(" text-text-muted row_badge", {
						"bg-green-500/10 text-green-400": row.original.status === "active",
						"bg-purple-500/10 text-purple-400":
							row.original.status === "paused",
						"bg-red-500/10 text-red-400": row.original.status === "canceled"
					})}
				>
					{row.original.status}
				</span>
			)
		}
	]

	if (onDelete) {
		columns.push({
			id: "actions",
			header: () => <span className='sr-only'>Actions</span>,
			cell: ({ row }) => {
				const isRowDeleting = deletingId === row.original.id
				const disabled = Boolean(disableActions) || isRowDeleting

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='ghost'
								size='icon'
								className='h-8 w-8 p-0'
								onClick={e => e.stopPropagation()}
								disabled={disabled}
							>
								<MoreHorizontal className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align='end'
							className='bg-red-500'
							onClick={e => e.stopPropagation()}
						>
							<DropdownMenuItem
								variant='destructive'
								onClick={event => {
									event.stopPropagation()
									onDelete(row.original)
								}}
								disabled={disabled}
							>
								<Trash className='h-4 w-4' />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			}
		})
	}

	return columns
}
