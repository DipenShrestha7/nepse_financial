export const BACKEND = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") || "";

export const getImageUrl = (path?: string | null) => {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return BACKEND ? `${BACKEND}${normalizedPath}` : normalizedPath;
};
