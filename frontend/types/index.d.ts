// Shared model types mirroring the backend schema.

export type UUID = string

export type BillingPeriod = "monthly" | "yearly"
export type SubscriptionStatus = "active" | "paused" | "canceled" | "expired"

export interface User {
	id: UUID
	email: string
	name: string
	created_at: string // ISO datetime
}
export interface UserSignUp {
	email: string
	password: string
	name: string
}

export interface Category {
	id: UUID
	user_id: UUID
	name: string
	color?: string | null
}

export interface Subscription {
	id: UUID
	category?: Category | null
	title: string
	description?: string | null
	url?: string | null
	start_date?: string | null // ISO date
	next_renewal_date?: string | null // ISO date
	end_date?: string | null // ISO date
	billing_period: BillingPeriod
	auto_renew: boolean
	amount: number
	currency: string // ISO 4217 code
	status: SubscriptionStatus
	reminder_days_before: number
}

export interface NewSubscription {
	title: string
	category_id?: UUID | null
	description?: string | null
	url?: string | null
	start_date?: string | null
	next_renewal_date?: string | null
	end_date?: string | null
	billing_period: BillingPeriod
	auto_renew: boolean
	amount: number
	currency: string
	status: SubscriptionStatus
	reminder_days_before: number
}

export interface NewSubscriptionResponse {
	title: string
	category_id: UUID
	description: string
	url: string
	start_date: string
	next_renewal_date: string
	end_date: string
	billing_period: BillingPeriod
	auto_renew: boolean
	amount: number
	currency: string
	status: SubscriptionStatus
	reminder_days_before: number
	id: UUID
	user_id: UUID
}

export interface UpdateSubscription extends Partial<Subscription> {
	category_id?: UUID | null
}

export interface SubscriptionPayment {
	id: UUID
	user_id: UUID
	subscription_id: UUID
	paid_at: string // ISO date
	amount: number
	currency: string
	note?: string | null
	created_at: string // ISO datetime
	subscription?: Subscription
}

export interface Reminder {
	id: UUID
	user_id: UUID
	subscription_id: UUID
	channel: string // e.g. "email" or "push"
	scheduled_for: string // ISO datetime
	sent_at?: string | null
	status: string // pending/sent/failed/canceled
	last_error?: string | null
	created_at: string // ISO datetime
	subscription?: Subscription
}

export interface MessageResponse {
	detail: string
}

export type SpendSummary = {
	total_spent: number
	currency: string
}
export type SpendMonthRow = { month: string; currency: string; total: number }
export type SpendCategoryRow = {
	category_id?: string | null
	category_name: string
	currency: string
	total: number
	color?: string | null
}

export type SubscriptionMonthSummary = {
	month: number
	count: number
	amount: number
	amounts_by_currency?: Record<string, number>
}

export type Payment = {
	amount: number
	currency: string
	paid_at: string
	subscription_id: string
}

export type SupportedCurrency = "USD" | "JPY"
