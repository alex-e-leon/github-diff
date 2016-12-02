var githubApi = require('github');

module.exports = function getDiff(githubRepo, base, head) {
  return new Promise((resolve, reject) => {
    try {
      // Setup the github api
      var github = new githubApi({
          protocol: "https",
          host: "api.github.com",
          headers: {
              "user-agent": "github-diff", // GitHub is happy with a unique user agent
          },
          followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
          timeout: 5000,
      });
      
      // Try get a personal access token from the environment
      var token = process.env.GITHUB_DIFF_TOKEN;
      var [owner, repo] = githubRepo.split('/');
      if (token) {
        // Authenticate to github
        github.authenticate({
          type: 'token',
          token: token,
        }, function(err, res) {
          if (err) {
            throw new Error('Unable to authenticate to github with the access token provided in GITHUB_DIFF_TOKEN');
          }
        });
      }

      // Connect and receive the list of patches
      github.repos.compareCommits({
        owner,
        repo,
        base,
        head,
      }, function(err, res) {
        if (err) {
          throw new Error(`Unable to access the github repository for ${repo}. ${err}`);
        }
        var patches = res.files.map((file) => {
          return {filename: file.filename, patch: file.patch};
        });
        resolve(patches);
      });
    } catch (error) {
      reject(error);
    }
  });
};
