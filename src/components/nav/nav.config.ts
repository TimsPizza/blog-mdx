import { SiteConfig } from "@/types/layout";

// Define the menu items
export const mainMenu = {
  categories: "/posts/categories",
  articles: "/posts",
};

export const contentMenu = {
  categories: "/posts/categories",
  tags: "/posts/tags",
  authors: "/posts/authors",
};

export const footerMenu = {
  portfolio: "https://me.kixstar.xyz",
  github: "https://github.com/TimsPizza",
};

export const siteConfig: SiteConfig = {
  site_name: "tim's nest",
  site_description: "You're in the right place! I post my blogs here.",
  site_domain: "https://blog.kixstar.xyz",
};
