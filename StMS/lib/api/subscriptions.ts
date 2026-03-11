import { apiFetch } from "../api";

export type Subscription = {
	id: string;
	title: string;
	description?: string | null;
	amount: number;
	currency: string;
	status: string;
	next_renewal_date: string | null;
	category_id?: string | null;
	created_at?: string;
	updated_at?: string;
};

export type SubscriptionPayment = {
	id: string;
	subscription_id: string;
	paid_at: string;
	amount: number;
	currency: string;
	note?: string | null;
};

export type SubscriptionMonthSummary = {
	month: number;
	count: number;
	amount: number;
	amounts_by_currency: Record<string, number>;
};

export type NewSubscription = {
	title: string;
	description?: string | null;
	amount: number;
	currency: string;
	status?: string;
	category_id?: string | null;
	next_renewal_date?: string | null;
};

export type UpdateSubscription = Partial<NewSubscription>;

export async function retrieveSubscriptionList(params?: {
	q?: string;
	status?: string;
	category_id?: string;
	sort?: "next_renewal_date" | "updated_at";
	limit?: number;
	offset?: number;
}): Promise<Subscription[]> {
	const query = new URLSearchParams();
	if (params?.q) query.set("q", params.q);
	if (params?.status) query.set("status", params.status);
	if (params?.category_id) query.set("category_id", params.category_id);
	if (params?.sort) query.set("sort", params.sort);
	if (params?.limit) query.set("limit", String(params.limit));
	if (params?.offset) query.set("offset", String(params.offset));

	const suffix = query.toString() ? `?${query.toString()}` : "";
	return apiFetch<Subscription[]>(`/subscriptions${suffix}`, { method: "GET" });
}

export async function retrieveSubscriptionById(subscriptionId: string) {
	return apiFetch<Subscription>(`/subscriptions/${subscriptionId}`, {
		method: "GET",
	});
}

export async function createSubscription(subscriptionData: NewSubscription) {
	return apiFetch<Subscription>("/subscriptions", {
		method: "POST",
		body: JSON.stringify(subscriptionData),
	});
}

export async function updateSubscription(
	subscriptionId: string,
	subscriptionData: UpdateSubscription,
) {
	return apiFetch<Subscription>(`/subscriptions/${subscriptionId}`, {
		method: "PATCH",
		body: JSON.stringify(subscriptionData),
	});
}

export async function deleteSubscription(subscriptionId: string) {
	return apiFetch<{ detail: string }>(`/subscriptions/${subscriptionId}`, {
		method: "DELETE",
	});
}

export async function retrieveSubscriptionPayments(subscriptionId: string) {
	return apiFetch<SubscriptionPayment[]>(
		`/subscriptions/${subscriptionId}/payments`,
		{ method: "GET" },
	);
}

export async function createSubscriptionPayment(
	subscriptionId: string,
	payload: {
		paid_at?: string;
		amount: number;
		currency: string;
		note?: string | null;
	},
) {
	return apiFetch<SubscriptionPayment>(
		`/subscriptions/${subscriptionId}/payments`,
		{ method: "POST", body: JSON.stringify(payload) },
	);
}

export async function renewSubscription(
	subscriptionId: string,
	payload: {
		paid_at?: string;
		amount?: number;
		currency?: string;
		note?: string | null;
		advance?: number | null;
	},
) {
	return apiFetch<Subscription>(`/subscriptions/${subscriptionId}/renew`, {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function retrieveSubscriptionMonthlySummary(year?: number) {
	const params = year ? `?year=${year}` : "";
	return apiFetch<SubscriptionMonthSummary[]>(
		`/subscriptions/metrics/monthly${params}`,
		{ method: "GET" },
	);
}
