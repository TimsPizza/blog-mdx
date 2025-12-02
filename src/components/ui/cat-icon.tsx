import {
  Atom,
  Bike,
  BookOpen,
  Code2,
  Database,
  Search,
  TrendingUp,
  Wrench,
} from "lucide-react";

export function getCategoryLogoByName(category: string, className?: string) {
  const overallClassName = `h-5 w-5 ${className ?? ""}`;
  switch (category) {
    case "lifetyle":
      return <BookOpen className={overallClassName} />;
    case "programming":
      return <Code2 className={overallClassName} />;
    case "technology":
      return <TrendingUp className={overallClassName} />;
    case "travel":
      return <Bike className={overallClassName} />;
    case "uncategorized":
      return <Search className={overallClassName} />;
    case "toolrecommendation":
      return <Wrench className={overallClassName} />;
    case "essay":
      return <BookOpen className={overallClassName} />;
    case "frontend":
      return <Atom className={overallClassName} />;
    case "backend":
      return <Database className={overallClassName} />;
    default:
      return <BookOpen className={overallClassName} />;
  }
}
const CatIconByName = ({
  category,
  className,
}: {
  category: string;
  className?: string;
}) => {
  return getCategoryLogoByName(
    category.split(" ").join("").toLowerCase(),
    className,
  );
};

export default CatIconByName;
