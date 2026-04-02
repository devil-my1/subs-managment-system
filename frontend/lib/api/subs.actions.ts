import { apiFetch } from "./base.actions"
import {
	MessageResponse,
	NewSubscription,
	NewSubscriptionResponse,
	Subscription,
	SubscriptionPayment,
	SubscriptionMonthSummary,
	UpdateSubscription
} from "@/types"

/** * Retrieve the list of subscriptions for the current user.
 * @returns A promise that resolves to an array of Subscription objects.
 */
export async function retrieveSubscriptionList(): Promise<Subscription[]> {
	try {
		const data = await apiFetch<Subscription[]>("/subscriptions", {
			method: "GET"
		})
		return data
	} catch (error) {
		throw error
	}
}

/** * Retrieve a specific subscription by its ID.
 * @param subscriptionId - The ID of the subscription to retrieve.
 * @returns A promise that resolves to the Subscription object.
 */
export async function retrieveSubscriptionById(
	subscriptionId: string
): Promise<Subscription> {
	try {
		const data = await apiFetch<Subscription>(
			`/subscriptions/${subscriptionId}`,
			{
				method: "GET"
			}
		)
		return data
	} catch (error) {
		throw error
	}
}

/** * Create a new subscription.
 * @param subscriptionData - The data for the new subscription.
 * @returns A promise that resolves to the created subscription response.
 */
export async function createSubscription(
	subscriptionData: NewSubscription
): Promise<NewSubscriptionResponse> {
	try {
		const data = await apiFetch<NewSubscriptionResponse>("/subscriptions", {
			method: "POST",
			body: JSON.stringify(subscriptionData)
		})
		return data
	} catch (error) {
		throw error
	}
}

/**
 * Update an existing subscription by its ID.
 * @param subscriptionId - The ID of the subscription to update.
 * @param subscriptionData - The data to update the subscription with.
 * @returns A promise that resolves to the updated Subscription object.
 */
export async function updateSubscription(
	subscriptionId: string,
	subscriptionData: UpdateSubscription
): Promise<Subscription> {
	try {
		const data = await apiFetch<Subscription>(
			`/subscriptions/${subscriptionId}`,
			{
				method: "PATCH",
				body: JSON.stringify(subscriptionData)
			}
		)
		return data
	} catch (error) {
		throw error
	}
}

/** * Delete a subscription by its ID.
 * @param subscriptionId - The ID of the subscription to delete.
 * @returns A promise that resolves to a MessageResponse object.
 */
export async function deleteSubscription(
	subscriptionId: string
): Promise<MessageResponse> {
	try {
		const data = await apiFetch<MessageResponse>(
			`/subscriptions/${subscriptionId}`,
			{
				method: "DELETE"
			}
		)
		return data
	} catch (error) {
		throw error
	}
}

/**
 * Retrieve payments for a subscription.
 */
export async function retrieveSubscriptionPayments(
	subscriptionId: string
): Promise<SubscriptionPayment[]> {
	return apiFetch<SubscriptionPayment[]>(
		`/subscriptions/${subscriptionId}/payments`,
		{ method: "GET" }
	)
}

export async function retrieveSubscriptionMonthlySummary(
	year?: number
): Promise<SubscriptionMonthSummary[]> {
	const params = year ? `?year=${year}` : ""
	return apiFetch<SubscriptionMonthSummary[]>(
		`/subscriptions/metrics/monthly${params}`,
		{ method: "GET" }
	)
}
