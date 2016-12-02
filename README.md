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
[{ filename: file, patch: patch }, ...]
```

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
