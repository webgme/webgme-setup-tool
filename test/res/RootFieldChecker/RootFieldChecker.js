/*globals define*/
/*jshint node:true, browser:true*/

/**
* This is simply a testing utility to check that a component has been enabled or disabled
*/

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'common/util/assert'
], function (PluginConfig, PluginBase, assert) {
    'use strict';

    /**
    * Initializes a new instance of RootFieldChecker.
    * @class
    * @augments {PluginBase}
    * @classdesc This class represents the plugin RootFieldChecker.
    * @constructor
    */
    var RootFieldChecker = function () {
        // Call base class' constructor.
        PluginBase.call(this);
    };

    // Prototypal inheritance from PluginBase.
    RootFieldChecker.prototype = Object.create(PluginBase.prototype);
    RootFieldChecker.prototype.constructor = RootFieldChecker;

    /**
    * Gets the name of the RootFieldChecker.
    * @returns {string} The name of the plugin.
    * @public
    */
    RootFieldChecker.prototype.getName = function () {
        return 'RootFieldChecker';
    };

    /**
    * Gets the semantic version (semver.org) of the RootFieldChecker.
    * @returns {string} The version of the plugin.
    * @public
    */
    RootFieldChecker.prototype.getVersion = function () {
        return '0.1.0';
    };

    RootFieldChecker.prototype.getConfigStructure = function () {
        // Get the field and the attribute
        return [
            { name: 'field',
              displayName: 'Field',
              description: 'Field of root node to add to',
              value: null,
              valueType: 'string',
              readOnly: false },
            { name: 'presentAttribute',
              displayName: 'Existing Attribute',
              description: 'Attribute to verify existence for field',
              value: null,
              valueType: 'string',
              readOnly: false },
            { name: 'missingAttribute',
              displayName: 'Missing Attribute',
              description: 'Attribute to verify nonexistence for field',
              value: null,
              valueType: 'string',
              readOnly: false }
        ];
    };

    /**
    * Main function for the plugin to execute. This will perform the execution.
    * Notes:
    * - Always log with the provided logger.[error,warning,info,debug].
    * - Do NOT put any user interaction logic UI, etc. inside this method.
    * - callback always has to be called even if error happened.
    *
    * @param {function(string, plugin.PluginResult)} callback - the result callback
    */
    RootFieldChecker.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            currentConfig = self.getCurrentConfig(),
            field = currentConfig.field,
            attribute = currentConfig.attribute,
            attributes;

        if (!currentConfig.field) {
            self.result.setSuccess(false);
            return callback('No field provided', self.result);
        }

        // Add to root node's "field" attribute
        attributes = self.core.getRegistry(self.rootNode, field).split(' ');
        if (currentConfig.presentAttribute) {
            assert(attributes.indexOf(attribute) > -1);
        }

        if (currentConfig.missingAttribute) {
            assert(attributes.indexOf(attribute) === -1);
        }

        // This will save the changes. If you don't want to save;
        // exclude self.save and call callback directly from this scope.
        self.result.setSuccess(true);
        callback(null, self.result);
    };

    return RootFieldChecker;
});
