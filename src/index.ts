import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";

import GitUrlParse from "git-url-parse";
import { Octokit } from "@octokit/core";
import { setFailed, info } from "@actions/core";
import { $ } from "zx";

type DisplayListItem = {
  project: string;
  committer: string;
  github_url: string;
  update_date_str: string;
};

const queryCommitInfo = async (
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

const loadRepoCommit = async (raw_repo: string): Promise<DisplayListItem> => {
  const token = process.env.GH_TOKEN;
  const { owner, name } = GitUrlParse(raw_repo, []);
  const commit_info = await queryCommitInfo(token, {
    owner,
    repo: name,
  });
  if (!commit_info) {
    setFailed("load commit info failed.");
  }
  const { commit = {} } = commit_info;
  const { committer = {} } = commit;
  const update_date_str = new Date(committer.date).toLocaleDateString();
  return Object.assign({}, commit_info, {
    committer: committer.name,
    update_date_str,
    project: name,
    github_url: `https://github.com/${owner}/${name}`,
  });
};

const getListDisplayTemplate = (info: DisplayListItem) =>
  `- [${info.project}](${info.github_url}): Last updated at ${info.update_date_str}, by \`${info.committer}\``;

const updateGit = async () => {
  const commit_msg = `chore: auto update at ${new Date().toLocaleDateString()}`;
  await $`git config user.name 'github-actions[bot]'`;
  await $`git config user.email 'github-actions[bot]@users.noreply.github.com'`;
  await $`git add .`;
  await $`git commit -m ${commit_msg}`;
  await $`git push`;
};

const updateReadme = async (params: DisplayListItem[]) => {
  const readme_path = resolve("./README.md");
  const current_content = await readFile(readme_path, {
    encoding: "utf-8",
  });
  const start_tag: string = "<!-- WATCHED_PROJECTS_START_TAG -->";
  const end_tag: string = "<!-- WATCHED_PROJECTS_END_TAG -->";
  const insert = (content: string) => {
    return current_content.replace(
      new RegExp(`${start_tag}([\\s\\S]*?)${end_tag}`, "g"),
      () => {
        return `${start_tag}\n${content}\n${end_tag}`;
      }
    );
  };
  const updated_content = insert(params.map(getListDisplayTemplate).join("\n"));
  if (updated_content !== current_content) {
    await writeFile(readme_path, updated_content, { encoding: "utf-8" });
    await updateGit();
  }
};

const getAllWatchList = (repo_str: string) => {
  return repo_str
    .split(",")
    .map((repo) => repo.trim())
    .filter((repo) => !!repo);
};

(async () => {
  info(`test get watched_list: ${process.env.WATCHED_LIST}`);
  const watched_list = getAllWatchList(process.env.WATCHED_LIST);
  try {
    const commit_messages = await Promise.all(
      watched_list.map((repo) => loadRepoCommit(repo))
    );
    await updateReadme(commit_messages);
  } catch (err) {
    setFailed(err.message);
  }
})();
