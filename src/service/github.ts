import { Octokit } from "@octokit/core";

import type { CommitInfo } from "src/types/github";

/**
 * @description load commit info from github
 * @see {link https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28}
 */
export async function queryCommitInfo(
  auth: string,
  params: {
    owner: string;
    repo: string;
    ref?: string;
  }
): Promise<CommitInfo> {
  const { owner, repo, ref = "main" } = params;
  const octokit = new Octokit({
    auth,
  });
  const result = await octokit.request(
    `GET /repos/${owner}/${repo}/commits/${ref}`,
    {
      owner: "OWNER",
      repo: "REPO",
      ref: "REF",
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  return result?.data;
}
