import { getAllCategories, type Category } from "@/lib/api";

export async function CategoriesList() {
  const categories = await getAllCategories().match(
    (items) => items,
    () => [],
  );

  return (
    <>
      <option value="">All categories</option>
      {categories.map((category: Category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </>
  );
}
