import { GitHubSourceControl, GitlabSourceControl, type SourceControl } from "@acme/source-control";
import { clerkClient } from "@clerk/fastify";

const getUserForgeAccessToken = async (userId: string, forge: "github" | "gitlab") => {
  const userTokens = await clerkClient.users.getUserOauthAccessToken(userId, `oauth_${forge}`);
  if (userTokens[0] === undefined) throw new Error("no token");
  return userTokens[0].token;
}

type Props = {
  forge: "github" | "gitlab";
  userId: string;
  repositoryId: number;
  repositoryName: string;
  namespaceName: string;
}
export const tryFetchRepository = async ({
  userId,
  forge,
  namespaceName,
  repositoryId,
  repositoryName,
}: Props) => {
  const token = await getUserForgeAccessToken(userId, forge);

  let sc: SourceControl;
  if (forge === 'github') sc = new GitHubSourceControl(token);
  else sc = new GitlabSourceControl(token);

  try {
    const { repository, namespace } = await sc.fetchRepository(repositoryId, namespaceName, repositoryName);
    return { repository, namespace };
  } catch (error) {
    console.log("FAILED TO FETCH REPOSITORY");
    console.log(error);
  }

  return {
    repository: undefined,
    namespace: undefined
  }
}