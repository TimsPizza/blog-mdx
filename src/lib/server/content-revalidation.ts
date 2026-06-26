import { revalidatePath } from "next/cache";

export function revalidateContentRoutes() {
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/posts/[...mdxFullPath]", "page");
  revalidatePath("/category");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/admin/article");
}
