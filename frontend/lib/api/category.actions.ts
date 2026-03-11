import { Category } from "@/types"
import { apiFetch } from "./base.actions"

/** * Retrieve the list of categories for a specific user.
 * @returns A promise that resolves to an array of Categories objects.
 */
export async function getCategoriesList(): Promise<Category[]> {
	try {
		const data = await apiFetch<Category[]>(`/categories`, {
			method: "GET"
		})

		return data
	} catch (error) {
		console.error("Error retrieving categories:", error)
		throw error
	}
}

/** * Update a specific category by its ID.
 * @param categoryId - The ID of the category to update.
 * @param categoryData - The data to update the category with.
 * @returns A promise that resolves to the updated Categories object.
 */
export async function updateCategory(
	categoryId: string,
	categoryData: Partial<Category>
): Promise<Partial<Category>> {
	try {
		const data = await apiFetch<Partial<Category>>(
			`/categories/${categoryId}`,
			{
				method: "PUT",
				body: JSON.stringify(categoryData)
			}
		)
		return data
	} catch (error) {
		console.error("Error updating category:", error)
		throw error
	}
}

/** * Create a new category.
 * @param categoryData - The data for the new category.
 * @returns A promise that resolves to the created Categories object.
 */
export async function createCategory(
	categoryData: Partial<Category>
): Promise<Category> {
	try {
		const data = await apiFetch<Category>("/categories", {
			method: "POST",
			body: JSON.stringify(categoryData)
		})
		return data
	} catch (error) {
		if (error instanceof Error && error.message.includes("409")) {
			throw new Error("Category with this name already exists.")
		}
		console.error("Error creating category:", error)
		throw error
	}
}

/** * Delete a specific category by its ID.
 * @param categoryId - The ID of the category to delete.
 * @returns A promise that resolves to a message response.
 */
export async function deleteCategory(categoryId: string): Promise<void> {
	try {
		const data = await apiFetch<void>(`/categories/${categoryId}`, {
			method: "DELETE"
		})
		return data
	} catch (error) {
		console.error("Error deleting category:", error)
		throw error
	}
}
