var getDiff = require('./index');

var repo = process.argv[2];
var base = process.argv[3];
var head = process.argv[4];

getDiff(repo, base, head).then((patches) => {
  patches.forEach(patch => {
    console.log(patch.header, patch.patch);
  });
  process.exit(0);
}).catch((err) => {
  console.error(err.message || err.toString());
  process.exit(1);
});
