type GithubRepo = {
  forgeType: 'github',
  name: string,
  owner: string,
  webUrl: string,
}

type UnknownRepo = {
  forgeType: 'unknown',
}

export type PublicRepo = GithubRepo | UnknownRepo;

export const PUBLIC_REPOS = [
  {
    forgeType: 'github',
    name: 'mr-tool-monorepo',
    owner: 'crocoder-dev',
    webUrl: 'https://github.com/crocoder-dev/mr-tool-monorepo'
  }
] satisfies PublicRepo[];