const githubApi = require('github');

function authenticate(github, token) {
  // github api is restful and stateless,
  // so authenticate is a sync function that just modifies the rest calls
  github.authenticate({
    type: 'token',
    token: token,
  });
}

function compareCommits(github, owner, repo, base, head) {
  return github.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  }).then((res) => {
    const promiseMap = res.files.map(buildContent.bind(null, github, owner, repo, base, head));
    return Promise.all(promiseMap);
  }).catch((err) => {
    throw new Error(`Unable to access the github repository for ${repo}. ${err}`);
  });
}

function buildContent(github, owner, repo, base, head, file) {
  // Build a limited but approximately valid git diff header
  // May not work for all variations of `git apply`
  const header = `diff --git a/${file.filename} b/${file.filename}\n` +
    `--- a/${file.filename}\n` +
    `+++ b/${file.filename}\n`;

  const {filename, patch, status} = file;

  // Get the content for the files
  switch (file.status) {
    case 'removed':
      return getContent(github, owner, repo, file.filename, base).then(file => {
        return {filename, patch, status, header, fileA: file};
      });
    case 'added':
      return getContent(github, owner, repo, file.filename, head).then(file => {
        return {filename, patch, status, header, fileB: file};
      });
    case 'modified':
      return Promise.all([
          getContent(github, owner, repo, file.filename, base),
          getContent(github, owner, repo, file.filename, head),
      ]).then(files => {
        const [fileA, fileB] = files;
        return {filename, patch, status, header, fileA, fileB};
      });
    default:
      return new Promise(resolve => {
        resolve({filename, patch, status, header});
      });
  }
}

function getContent(github, owner, repo, path, commit) {
  return github.repos.getContent({
    owner,
    repo,
    path,
    ref: commit,
  }).then((res) => {
    return res.content;
  }).catch((err) => {
    throw new Error(`Unable to get content for ${path} @commit:${commit}. ${err}`);
  });
}

module.exports = function getDiff(githubRepo, base, head) {
  return new Promise((resolve, reject) => {
    try {
      // Setup the github api
      const github = new githubApi({
          protocol: "https",
          host: "api.github.com",
          Promise: Promise,
          headers: {
            "user-agent": "github-diff", // GitHub is happy with a unique user agent
          },
          followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
          timeout: 5000,
      });

      const token = process.env.GITHUB_DIFF_TOKEN;
      const [owner, repo] = githubRepo.split('/');

      // Check if the user has set a token and then authenticate 
      if (token) {
        authenticate(github, token);
      }

      resolve(compareCommits(github, owner, repo, base, head));

    } catch (error) {
      reject(error);
    }
  });
};
