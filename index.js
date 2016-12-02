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
    return res.files.map((file) => {
      return {filename: file.filename, patch: file.patch};
    });
  }).catch((err) => {
    throw new Error(`Unable to access the github repository for ${repo}. ${err}`);
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
