"use client"

import {
	ColumnDef,
	RowSelectionState,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from "@tanstack/react-table"

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/components/ui/table"
import { Button } from "./ui/button"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface DataTableProps<TData, TValue> {
	columns:
		| ColumnDef<TData, TValue>[]
		| ((...args: any[]) => ColumnDef<TData, TValue>[]) // allow builder
	data: TData[]
	columnsArgs?: any[]
	onRowClick?: (row: TData) => void
	selectable?: boolean
	onSelectionChange?: (rows: TData[], selection: RowSelectionState) => void
	rowSelection?: RowSelectionState
}

export function SubTable<TData, TValue>({
	columns,
	data,
	columnsArgs = [],
	onRowClick,
	selectable = false,
	onSelectionChange,
	rowSelection
}: DataTableProps<TData, TValue>) {
	const resolvedColumns =
		typeof columns === "function" ? columns(...columnsArgs) : columns
	const [sorting, setSorting] = useState<SortingState>([])
	const [internalSelection, setInternalSelection] = useState<RowSelectionState>(
		{}
	)

	const selectionState = rowSelection ?? internalSelection

	const handleSelectionChange = (
		updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)
	) => {
		const next =
			typeof updater === "function" ? updater(selectionState) : updater
		if (!rowSelection) {
			setInternalSelection(next)
		}
		if (onSelectionChange) {
			const selectedRows = Object.keys(next)
				.map(idx => data[Number(idx)])
				.filter(Boolean) as TData[]
			onSelectionChange(selectedRows, next)
		}
	}

	const selectionColumn: ColumnDef<TData, TValue> | null = selectable
		? {
				id: "select",
				header: ({ table }) => (
					<input
						type='checkbox'
						checked={table.getIsAllRowsSelected()}
						onChange={table.getToggleAllRowsSelectedHandler()}
						className='h-4 w-4 accent-primary'
					/>
				),
				cell: ({ row }) => (
					<input
						type='checkbox'
						checked={row.getIsSelected()}
						onChange={row.getToggleSelectedHandler()}
						onClick={e => e.stopPropagation()}
						className='h-4 w-4 accent-primary'
					/>
				)
			}
		: null

	const resolvedColumnsWithSelect = selectionColumn
		? [selectionColumn, ...resolvedColumns]
		: resolvedColumns

	const table = useReactTable({
		data,
		columns: resolvedColumnsWithSelect,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting,
			rowSelection: selectionState
		},
		onRowSelectionChange: handleSelectionChange
	})

	return (
		<div className='w-full flex flex-col gap-4'>
			<div className='overflow-x-auto rounded-md'>
				<div className='min-w-[500px]'>
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map(header => {
										return (
											<TableHead
												className=''
												key={header.id}
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext()
														)}
											</TableHead>
										)
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map(row => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
										onClick={
											onRowClick ? () => onRowClick(row.original) : undefined
										}
										onKeyDown={event => {
											if (!onRowClick) return
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault()
												onRowClick(row.original)
											}
										}}
										tabIndex={onRowClick ? 0 : undefined}
										className={cn(
											"transition-colors",
											onRowClick
												? "cursor-pointer hover:bg-white/5"
												: "hover:bg-white/5/50"
										)}
									>
										{row.getVisibleCells().map(cell => (
											<TableCell
												className='pl-2'
												key={cell.id}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={resolvedColumnsWithSelect.length}
										className='h-24 text-center'
									>
										No results.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
			<div
				className={cn(
					"flex flex-row items-center justify-between mx-4 space-x-2 py-4",
					{
						hidden: table.getPageCount() <= 1
					}
				)}
			>
				<Button
					variant='outline'
					size='sm'
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					<ArrowLeft size={16} />
				</Button>
				<span className='text-sm text-[#ab9db9]'>
					Page {table.getState().pagination.pageIndex + 1} of{" "}
					{table.getPageCount()}
				</span>
				<Button
					variant='outline'
					size='sm'
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					<ArrowLeft
						size={16}
						className='rotate-180'
					/>
				</Button>
			</div>
		</div>
	)
}
