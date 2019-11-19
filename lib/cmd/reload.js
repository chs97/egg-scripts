const Command = require('../command')
const utils = require('egg-utils')
const homedir = require('node-homedir')
const ipc = require('node-ipc')
const helper = require('../helper')

class ReloadCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv)
    this.usage = 'Usage: egg-scripts-enhanced reload [options]'
    this.options = {
      title: {
        description: 'process title description, use for kill grep, default to `egg-server-${APP_NAME}`',
        type: 'string',
      }
    }
  }

  async run(context) {
    const { argv, env, cwd, execArgv } = context

    let baseDir = argv._[0] || cwd;
    if (!path.isAbsolute(baseDir)) baseDir = path.join(cwd, baseDir);
    argv.baseDir = baseDir;
    argv.framework = yield this.getFrameworkPath({
      framework: argv.framework,
      baseDir,
    });

    this.frameworkName = yield this.getFrameworkName(argv.framework);

    const pkgInfo = require(path.join(baseDir, 'package.json'));
    argv.title = argv.title || `egg-server-${pkgInfo.name}`;

    ipc.config.id = 'egg-reload-client-' + title
    ipc.config.retry = 1000
    ipc.config.silent = true
    const masterServerId = 'egg-master-ipc-process-' + title
    await new Promise((resolve, reject) => {
      ipc.connectTo(masterServerId, async () => {
        ipc.of[masterServerId].on('connect', async () => {
          ipc.of[masterServerId].emit(helper.constants.RELOAD_MESSAGE)
          ipc.of[masterServerId].on('message', msg => {
            if (msg === helper.constants.RELOAD_SUCCESS) {
              resolve()
            }
            if (msg === helper.constants.RELOAD_FAIL) {
              reject()
            }
          })
        })
      })
    })
    ipc.disconnect(masterServerId)
    ipc.disconnect()
  }

  * getFrameworkPath(params) {
    return utils.getFrameworkPath(params);
  }

  * getFrameworkName(framework) {
    const pkgPath = path.join(framework, 'package.json');
    let name = 'egg';
    try {
      const pkg = require(pkgPath);
      /* istanbul ignore else */
      if (pkg.name) name = pkg.name;
    } catch (_) {
      /* istanbul next */
    }
    return name;
  }
}