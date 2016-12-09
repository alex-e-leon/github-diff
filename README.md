# github-diff

Get a diff between 2 commits or tags of a github project

## Usage

### Setup
In order to use github-diff to access a private repository you'll need to
[create a personal access token](https://github.com/settings/tokens)
and set the environment variable `GITHUB_DIFF_TOKEN` to the token

You can run the following in the command line or add it your `.bashrc`

```bash
export GITHUB_DIFF_TOKEN=token
```

### Arguments and return values

github-diff takes the following arguments

- repository: a github repository name and owner split by a `/`: ex `alex-e-leon/github-diff`
- base: a commit hash or tag to diff from
- head: a commit hash or tag to diff to

github-diff returns a promise that returns the following structure:

```javascript
[{ filename, patch, header, status, fileA, fileB}, ...]
```

- filename: The full path of the file from the base of the repo, ex: `/src/my-file.js`
- patch: The patch provided by github for the file. Looks like a regular git formatted patch without the header
- header: A basic git patch style header. Currently doesn't include commit hashes, but should validate if used with `git apply`
- status: The diff status for the file. Returns one of `modified`, `renamed`, `deleted`, `added`, etc. See [git docs](https://git-scm.com/docs/git-status) for all options
- fileA: The contents of the base file (if it exists in base)
- fileB: The contents of the head file (if it exists in head)
- previousFilename: The previous filename (if the file has been renamed)

### Node example

```javascript
import 'github-diff';
github-diff('alex-e-leon/github-diff', 'v1.0.0', 'v.1.0.1').then((patches) => {
  console.log(patches);
});
```

### Cli example

```shell
node cli.js domain-group/fe-boilerplate-generator v2.3.0 v3.0.0
```
