import { Octokit } from "@octokit/core";
import GitUrlParse from "git-url-parse";
import core from "@actions/core";

const loadRepoCommit = async (
  auth: string,
  params: {
    owner: string;
    repo: string;
    ref?: string;
  }
) => {
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
};

(async () => {
  const watched_list_str = core.getInput("WATCHED_LIST");
  const token = core.getInput("GH_TOKEN");
  core.info(`test get watched_list: ${JSON.stringify(watched_list_str)}`);
  core.info(
    `test get gh_token: token length ${token.length}, type ${typeof token}`
  );

  const watched_list = watched_list_str
    .split(",")
    .map((repo) => repo.trim())
    .filter((repo) => !!repo);

  for (const repo of watched_list) {
    try {
      const { owner, name } = GitUrlParse(repo, []);
      const commit_info = await loadRepoCommit(token, {
        owner,
        repo: name,
      });
      core.info(`get commit info: ${JSON.stringify(commit_info)}`);
    } catch (err) {
      core.setFailed(err.message);
    }
  }
})();
