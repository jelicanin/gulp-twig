'use strict';

var Twig = require('twig'),
	twig = Twig.twig,
	_ = require('lodash'),
	glob = require('glob'),
	fs = require('fs'),
	through = require('through2'),
	util = require('gulp-util'),
	pluginName = 'gulp-twig';

module.exports = function(options) {
	options = _.merge({
		data: {},
		includes: null,
		getIncludeId: function(filePath) {
			return filePath;
		}
	}, options || {});

	Twig.cache(false);

	// Register includes
	if (options.includes) {
		if (!_.isArray(options.includes)) {
			options.includes = [options.includes];
		}

		options.includes.forEach(function(pattern) {
			glob.sync(pattern).forEach(function(file) {
				var id = options.getIncludeId(file),
					content = fs.readFileSync(file, 'utf8').toString();

				twig({
					id: id,
					data: content
				});
			});
		});
	}

	return through.obj(function(file, enc, cb) {
		if (file.isNull()) {
			this.push(file);

			return cb();
		}

		if (file.isStream()) {
			this.emit('error', new util.PluginError(pluginName, 'Streaming not supported'));

			return cb();
		}

		var data = typeof options.data === 'function' ? options.data(file) : options.data,
			template = twig({
				allowInlineIncludes: true,
				data: file.contents.toString()
			});

		try {
			file.contents = new Buffer(template.render(data));
		} catch(err) {
			this.emit('error', new util.PluginError(pluginName, file.path, err));

			return cb();
		}

		// Add file back to stream
		this.push(file);

		cb();
	});
};