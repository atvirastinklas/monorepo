const GITHUB_REPOSITORY_URL = "https://github.com/atvirastinklas/monorepo";
const GITHUB_EDIT_BRANCH = "main";

export function getGitHubEditUrl(sourcePath: string) {
  return `${GITHUB_REPOSITORY_URL}/edit/${GITHUB_EDIT_BRANCH}/${sourcePath}`;
}
