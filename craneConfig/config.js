module.exports = function(crane) {
  var config = {};
  config.debug = true;

  //crane.registerCustomPiece({
  //  type: 'jsconfig',
  //  onlyIf: function() {
  //    return true;
  //  },
  //  filename: siteConfig.out,
  //  options: siteConfig,
  //  withTasks: ['jsconfig', 'version', 'copy']
  //});

  config.jade = {
    debug: config.debug,
    options: {
    },
    lib: 'js/vendor/jade.js'
  };

  config.javascript = {
    excludes: [],
  };

  config.jsx = {
    harmony: false, // use traceur instead
  };

  config.jshint = {
    enable: true,
  };

  config.jscs = {
    enable: true,
  };

  config.traceur = {
    enable: true,
    filter: '**',
  };

  config.stylus = {
    debug: config.debug,
    compress: !config.debug,
  };

  config.excludes = [];

  crane.registerConfig(config);
}
