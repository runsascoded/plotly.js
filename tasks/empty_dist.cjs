var constants = require('./util/constants.cjs');
var makeEmptyDirectory = require('./util/make_empty_directory.cjs');
var emptyDir = makeEmptyDirectory.emptyDir;
var makeDir = makeEmptyDirectory.makeDir;

var dist = constants.pathToDist;

// main
emptyDir(dist);
makeDir(dist);
