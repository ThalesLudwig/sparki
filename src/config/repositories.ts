export const REPOSITORY_MAP: Record<string, string> = {
  FRONTEND: 'https://github.com/company/frontend-app',
  SONA: 'https://github.com/company/frontend-app',
  BACKEND: 'https://github.com/company/backend-api',
  CORTANA: 'https://github.com/company/backend-api',
};

export const getRepositoryLink = (keyword: string): string | undefined => {
  const upperKeyword = keyword.toUpperCase();
  return REPOSITORY_MAP[upperKeyword];
};

export const findRepositoryFromTitle = (title: string): string | undefined => {
  const upperTitle = title.toUpperCase();
  
  for (const [keyword, link] of Object.entries(REPOSITORY_MAP)) {
    if (upperTitle.includes(keyword)) {
      return link;
    }
  }
  
  return undefined;
};
