import { clsx } from "clsx";

type Category = {
  key: string;
  label: string;
};

type Props = {
  categories: Category[];
  activeKey: string;
  onSelect: (key: string) => void;
};

export function HomeCategoryBar({ categories, activeKey, onSelect }: Props) {
  return (
    <div className="home-category-bar mb-4">
      <div className="home-category-track flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((category) => {
          const isActive = category.key === activeKey;
          return (
            <button
              key={category.key}
              type="button"
              className={clsx(
                "home-category-pill rounded-full px-3 py-1 text-xs font-semibold transition",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "bg-white/70 text-gray-600 hover:bg-white dark:bg-gray-900/60 dark:text-gray-200 dark:hover:bg-gray-900",
              )}
              aria-pressed={isActive}
              onClick={() => onSelect(category.key)}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
