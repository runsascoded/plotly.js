var constants = require('./util/constants');
var makeEmptyDirectory = require('./util/make_empty_directory');
var emptyDir = makeEmptyDirectory.emptyDir;
var makeDir = makeEmptyDirectory.makeDir;

var dist = constants.pathToDist;

// main
emptyDir(dist);
makeDir(dist);
