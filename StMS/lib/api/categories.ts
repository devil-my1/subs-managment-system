import { apiFetch } from "../api";

export type Category = {
	id: string;
	name: string;
	color?: string | null;
};

type CategoryListResponse = { categories: Category[] };

type CategoryModificationResponse = {
	id: string;
	name: string;
	color?: string | null;
};

export async function getCategoriesList(): Promise<Category[]> {
	const data = await apiFetch<CategoryListResponse>("/categories/", {
		method: "GET",
	});
	return data.categories || [];
}

export async function createCategory(payload: {
	name: string;
	color?: string | null;
}): Promise<CategoryModificationResponse> {
	return apiFetch<CategoryModificationResponse>("/categories/", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function updateCategory(
	categoryId: string,
	payload: { name?: string; color?: string | null },
): Promise<CategoryModificationResponse> {
	return apiFetch<CategoryModificationResponse>(`/categories/${categoryId}`, {
		method: "PUT",
		body: JSON.stringify(payload),
	});
}

export async function deleteCategory(categoryId: string) {
	return apiFetch<void>(`/categories/${categoryId}`, { method: "DELETE" });
}
