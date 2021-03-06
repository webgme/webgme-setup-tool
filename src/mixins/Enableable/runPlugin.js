/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var main, runPlugin;

main = function (argv, callback) {
  "use strict";
  var path = require("path"),
    gmeConfig = require(path.join(process.cwd(), "config")),
    Command = require("commander").Command,
    logger = webgme.Logger.create("gme:bin:import", gmeConfig.bin.log),
    pluginConfig,
    program = new Command();

  callback = callback || function () {};

  program.option("-p, --project <name><mandatory>", "Name of the project.");
  program.option("-b, --branch <name>", "Name of the branch.", "master");
  program.option(
    "-j, --pluginConfigPath <name>",
    "Path to json file with plugin options that should be overwritten.",
    ""
  );
  program.option("-n, --pluginName <name><mandatory>", "Path to given plugin.");
  program.option(
    "-s, --selectedObjID <webGMEID>",
    "ID to selected component.",
    ""
  );
  program.parse(argv);

  if (!(program.pluginName && program.project)) {
    program.help();
    logger.error("A project and pluginName must be specified.");
  }

  logger.info(
    "Executing " +
      program.pluginName +
      " plugin on " +
      program.project +
      " in branch " +
      program.branch +
      "."
  );

  if (program.pluginConfigPath) {
    pluginConfig = require(path.resolve(program.pluginConfigPath));
  } else {
    pluginConfig = {};
  }
  runPlugin(gmeConfig, pluginConfig, program, callback);
};

runPlugin = function (gmeConfig, pluginConfig, projectOptions, callback) {
  var webgme = require("webgme-engine"),
    PluginCliManager = webgme.PluginCliManager,
    Project = require("webgme-engine/src/server/storage/userproject"),
    logger = webgme.Logger.create("gme:bin:import", gmeConfig.bin.log);
  var storage, project;

  webgme.addToRequireJsPaths(gmeConfig);
  webgme
    .getGmeAuth(gmeConfig)
    .then(function (gmeAuth) {
      storage = webgme.getStorage(logger, gmeConfig, gmeAuth);
      return storage.openDatabase();
    })
    .then(function () {
      logger.info("Database is opened.");

      return storage.openProject({ projectId: projectOptions.project });
    })
    .then(function (dbProject) {
      logger.info("Project is opened.");
      project = new Project(dbProject, storage, logger, gmeConfig);
      return storage.getBranchHash({
        projectId: projectOptions.project,
        branchName: projectOptions.branch,
      });
    })
    .then(function (commitHash) {
      logger.info("CommitHash obtained ", commitHash);
      var pluginManager = new PluginCliManager(project, logger, gmeConfig),
        context = {
          activeNode: projectOptions.selectedObjID,
          activeSelection: [], //TODO: Enable passing this from command line.
          branchName: projectOptions.branch,
          commitHash: commitHash,
        };

      pluginManager.executePlugin(
        projectOptions.pluginName,
        pluginConfig,
        context,
        function (err, pluginResult) {
          if (err) {
            logger.error("execution stopped:", err, pluginResult);
            callback(err, pluginResult);
            process.exit(1);
          } else {
            logger.info("execution was successful:", err, pluginResult);
            callback(err, pluginResult);
            process.exit(0);
          }
        }
      );
    })
    .catch(function (err) {
      logger.error("Could not open the project or branch", err);
      callback(err);
      process.exit(1);
    });
};

module.exports = {
  main: main,
  run: runPlugin,
};

if (require.main === module) {
  main(process.argv);
}
