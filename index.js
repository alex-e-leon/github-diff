const githubApi = require('github');
const isBinary = require('is-binary-buffer');

function atob(base64encoded) {
  const decodedFile = (new Buffer(base64encoded, 'base64'));
  return isBinary(decodedFile) ? decodedFile : decodedFile.toString('utf8');
}

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

function buildHeader(fileA, fileB) {
  // Build a limited but approximately valid git diff header
  // May not work for all variations of `git apply`
  return `diff --git a/${fileA} b/${fileB}\n` +
    `--- a/${fileA}\n` +
    `+++ b/${fileB}\n`;
}

function buildContent(github, owner, repo, base, head, file) {
  const {filename, patch, status} = file;

  // Get the content for the files
  switch (status) {
    case 'removed':
      return getContent(github, owner, repo, filename, base).then(content => {
        return {filename, patch, status, header: buildHeader(filename, filename), fileA: atob(content)};
      });

    case 'added':
      return getContent(github, owner, repo, filename, head).then(content => {
        return {filename, patch, status, header: buildHeader(filename, filename), fileB: atob(content)};
      });

    case 'modified':
      return Promise.all([
          getContent(github, owner, repo, filename, base),
          getContent(github, owner, repo, filename, head),
      ]).then(files => {
        const [fileA, fileB] = files;
        return {filename, patch, status, header: buildHeader(filename, filename), fileA: atob(fileA), fileB: atob(fileB)};
      });

    case 'renamed':
      return getContent(github, owner, repo, filename, head).then(content => {
        const decodedFile = atob(content);
        const previousFilename = file.previous_filename;
        const header = buildHeader(filename, previousFilename);

        return {filename, patch, status, header, previousFilename, fileA: decodedFile, fileB: decodedFile};
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
    try {
      const apiError = JSON.parse(err);
      if (apiError.errors.find(error => error.code === 'too_large')) {
        return github.gitdata.getTree({
          owner,
          repo,
          // May hit githubs maximum limit if the tree is too large
          // we could handle larger trees if we recursively fetched subtrees.
          // see https://developer.github.com/v3/git/trees/#get-a-tree-recursively
          recursive: true,
          sha: commit
        })
        .then(commit => commit.tree.find(file => file.path === path).sha)
        .then(sha => github.gitdata.getBlob({
          owner,
          repo,
          sha
        }))
        .then(data => data.content);
      }
    } catch(parseError) {}
    return Promise.reject(err);
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
