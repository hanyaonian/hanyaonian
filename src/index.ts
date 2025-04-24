import { queryCommitInfo } from "src/service/github";
import type { CommitInfo } from "src/types/github";

import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";

import parseGitUrl from "git-url-parse";
import { setFailed, info } from "@actions/core";
import { $ } from "zx";

const loadRepoCommit = async (raw_repo: string) => {
  const token = process.env.GH_TOKEN;
  if (!token) {
    return setFailed("token not set.");
  }
  const { owner, name } = parseGitUrl(raw_repo);
  const commit_info = await queryCommitInfo(token, {
    owner,
    repo: name,
  });
  if (!commit_info) {
    return setFailed("load commit info failed.");
  }
  return commit_info;
};

const getListDisplayText = (commit_info: CommitInfo) => {
  const { commit, html_url } = commit_info;
  const { name: project } = parseGitUrl(html_url);
  const { committer } = commit;
  const update_date_str = new Date(committer.date).toLocaleDateString();
  return `- [${project}](${html_url}): Last updated at ${update_date_str}, by \`${
    committer.name ?? "unknown"
  }\``;
};

const updateGit = async () => {
  await $`git config user.name 'github-actions[bot]'`;
  await $`git config user.email 'github-actions[bot]@users.noreply.github.com'`;
  await $`git add .`;
  await $`git commit -m 'chore: auto update at ${new Date().toLocaleDateString()}'`;
  await $`git push`;
};

const getUpdatedMdContent = async (
  md_content: string,
  commits: CommitInfo[]
) => {
  const start_tag: string = "<!-- WATCHED_PROJECTS_START_TAG -->";
  const end_tag: string = "<!-- WATCHED_PROJECTS_END_TAG -->";
  const insert = (content: string) => {
    return md_content.replace(
      new RegExp(`${start_tag}([\\s\\S]*?)${end_tag}`, "g"),
      () => {
        return `${start_tag}\n${content}\n${end_tag}`;
      }
    );
  };
  return insert(commits.map(getListDisplayText).join("\n"));
};

const getAllWatchList = (repo_str: string) => {
  return repo_str
    .split(",")
    .map((repo) => repo.trim())
    .filter((repo) => !!repo);
};

const getReadmePath = () => {
  // TODO: use git env config
  return resolve("./README.md");
};

async function main() {
  if (!process.env.WATCHED_LIST) {
    return setFailed("WATCHED_LIST not set.");
  }
  const watched_list = getAllWatchList(process.env.WATCHED_LIST);
  info(`watched_list: ${watched_list.join("\n")}`);
  try {
    const readme_path = getReadmePath();
    const commits = await Promise.all(
      watched_list.map((repo) => loadRepoCommit(repo))
    );
    const current_content = await readFile(readme_path, {
      encoding: "utf-8",
    });
    const updated_content = await getUpdatedMdContent(
      current_content,
      commits.filter(Boolean) as CommitInfo[]
    );
    if (updated_content !== current_content) {
      await writeFile(readme_path, updated_content, { encoding: "utf-8" });
      await updateGit();
    }
  } catch (err: any) {
    setFailed(err.message);
  }
}

main();
