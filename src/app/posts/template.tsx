import type { ReactNode } from "react";

export default function PostsTemplate({ children }: { children: ReactNode }) {
  return <div className="route-template-section">{children}</div>;
}
