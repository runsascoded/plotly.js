var fs = require('fs');
var pkg = require('../../package.json');

module.exports = function updateVersion(pathToFile) {
    var code = fs.readFileSync(pathToFile, 'utf-8');
    var out = code.replace(
        /export var version = '[^']*'/,
        "export var version = '" + pkg.version + "'"
    );
    fs.writeFileSync(pathToFile, out);
};
