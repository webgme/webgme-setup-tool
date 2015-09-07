/*globals define*/
define(['lodash', 
        'fs',
        'path',
        'assert',
        'module',
        'ramda'], function(_, 
                           fs,
                           path,
                           assert,
                           module,
                           R) {

    'use strict';

    var PROJECT_CONFIG = 'webgme-setup.json',
        __dirname = path.dirname(module.uri);

    var getRootPath = function() {
        // Walk back from current path until you find a webgme-setup.json file
        var abspath = path.resolve('.');

        while (abspath.length > 1) {
            if (isProjectRoot(abspath)) {
                return abspath;
            }
            abspath = path.dirname(abspath);
        }
        return null;
    };

    var isProjectRoot = function(abspath) {
        // Check for webgme-setup.json file
        if (!fs.existsSync(abspath)) {
            return null;
        }

        var files = fs.readdirSync(abspath);
        return files.filter(function(file) {
            return file === PROJECT_CONFIG;
        }).length > 0;
    };

    /**
     * Save file and create directories as needed.
     *
     * @param {File} file
     * @return {undefined}
     */
    var saveFile = function(file) {
        var dir = path.dirname(file.name);

        createDir(dir);
        fs.writeFileSync(file.name, file.content);
    };

    /**
     * Create directory as needed.
     *
     * @param {String} dir
     * @return {undefined}
     */
    var createDir = function(dir) {
        var dirs = path.resolve(dir).split(path.sep),
            shortDir,
            i = 1;

        while (i++ < dirs.length) {
            shortDir = dirs.slice(0,i).join(path.sep);
            if (!fs.existsSync(shortDir)) {
                fs.mkdirSync(shortDir);
            }
        }
    };

    var saveFilesFromBlobClient = function(blobClient) {
        var artifactNames = Object.keys(blobClient.artifacts);
        for (var i = artifactNames.length; i--;) {
            blobClient.artifacts[artifactNames[i]].files.forEach(saveFile);
        }
    };

    /* * * * * * * Config Settings * * * * * * * */
    var getConfig = function() {
        var root = getRootPath();
        var config = fs.readFileSync(path.join(root, PROJECT_CONFIG));
        return JSON.parse(config);
    };

    var saveConfig = function(config) {
        var root = getRootPath();
        var configText = JSON.stringify(config, null, 2);
        fs.writeFileSync(path.join(root, PROJECT_CONFIG), configText);
    };

    /**
     * Update the WebGME config based on the paths in the webgme-setup.json. 
     *
     * @return {undefined}
     */
    var updateWebGMEConfig = function() {
        var content = getWebGMEConfigContent(),
            templatePath = path.join(__dirname, 'res', 'config.template.js'),
            template = _.template(fs.readFileSync(templatePath)),
            configPath = path.join(getRootPath(), 'config.webgme.js');

        fs.writeFileSync(configPath, template(content));
    };

    /**
     * Get the paths from a config (sub) object such as "components" or 
     * "dependencies"
     *
     * @param {Object} config
     * @return {String[]}
     */
    var getPathsFromConfigGroup = function(config) {
        return R.mapObj(function(componentType) {
            return R.values(componentType).map(function(component) {
                return component.src || component.path;
            });
        }, config);
    };

    var unique = function(array) {
        var duplicates = {};
        array.forEach(function(key) {
            duplicates[key] = 1;
        });
        return Object.keys(duplicates);
    };

    var getWebGMEConfigContent = function() {
        var arrays,
            config = getConfig(),
            paths = {},
            configGroupPaths = ['components', 'dependencies']
                .map(function(type) {
                    return getPathsFromConfigGroup(config[type]);
                }
            );

        // Merge the arrays for each componentType
        Object.keys(configGroupPaths[0]).forEach(function(type) {
            arrays = configGroupPaths.map(function(group) {
                // Remove duplicates
                return unique(group[type]);
            });
            // Merge all paths
            paths[type] = arrays.reduce(R.concat);
        });

        return paths;
    };

    var getConfigPath = function(project) {
        return path.join(getRootPath(), 'node_modules', 
            project, PROJECT_CONFIG);
    };

    /**
     * Get the GME path for the given dependent project or the working project
     * if unspecified
     *
     * @param {String} project
     * @return {String} path
     */
    var getGMEConfigPath = function(project) {
        var gmeConfigPath,
            projectPath = '';

        if (project) {
            projectPath = path.join('node_modules', project);
        }
        gmeConfigPath = path.join(getRootPath(), projectPath, 'config.js');

        return gmeConfigPath;
    };

    /**
     * Find the first path containing the given item.
     *
     * @param {String[]} pathType
     * @param {String} item
     * @return {String} path containing the item
     */
    var getPathContaining = function(paths, item) {
        var validPaths = paths.filter(function(p) {
            return fs.existsSync(p) && fs.readdirSync(p).indexOf(item) + 
                fs.readdirSync(p).indexOf(item+'.js') !== -2;
        });
        return validPaths.length ? validPaths[0] : null;
    };

    var nop = function() {};
    /**
     * Get the name of the package installed with "npmPackage"
     *
     * @param {String} npmPackage
     * @return {String} name
     */
    var getPackageName = function(npmPackage) {
        // FIXME: It currently assumes everything is a github url. Should support
        // hashes, packages, etc
        // Ideally, we could use an npm feature to do this
        return npmPackage.split('/').pop();
    };

    return {
        PROJECT_CONFIG: PROJECT_CONFIG,
        saveConfig: saveConfig,
        getConfig: getConfig,
        getRootPath: getRootPath,
        nop: nop,
        getGMEConfigPath: getGMEConfigPath,
        getPathContaining: getPathContaining,
        getConfigPath: getConfigPath,
        updateWebGMEConfig: updateWebGMEConfig,
        saveFilesFromBlobClient: saveFilesFromBlobClient,
        saveFile: saveFile,
        mkdir: createDir,
        getPackageName: getPackageName
    };
});
