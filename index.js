const dbWrapper = require('./databases/');

require('yargs') // eslint-disable-line
  .usage('Usage: $0 <command> [options]')
  .command('publish [dbtype] [host] [port] [password] [key] [interval] ', 'Start publishing data to a key for a database type (e.g. redis) with certain throughput.', (yargs) => {
    yargs
      .positional('dbtype', {
        describe: 'Set the database e.g. "redis"',
        default: 'redis'
      })
      .positional('host', {
        describe: 'Set the host of the database',
        default: 'localhost'
      })
      .positional('port', {
        describe: 'Set the port of the database',
        default: 6379
      })
      .positional('password', {
        describe: 'Set the password of the database',
        default: 'admin'
      })
      .positional('key', {
        describe: 'Set the key for either publishing or subscribing',
        default: 'fooBar'
      })
      .positional('interval', {
        describe: 'Set the interval of the publisher in [ms]',
        default: 10
      })
  }, (argv) => {
    const dbInstance = new dbWrapper({
      database: argv.database,
      host: argv.host,
      port: argv.port,
      password: argv.password
    });

    dbInstance.startPublish(argv.key, argv.interval);
  })
  .example('$0 publish -db redis -i 10 -k someKey -p somePassword', 'start publishing to redis every 10ms with the key :"someKey[i]" where [i] will be replaced with the increment')
  .command('subscribe [dbtype] [host] [port] [password] [key]', (yargs) => {
    yargs
      .positional('dbtype', {
        describe: 'Set the database e.g. "redis"',
        default: 'redis'
      })
      .positional('host', {
        describe: 'Set the host of the database',
        default: 'localhost'
      })
      .positional('port', {
        describe: 'Set the port of the database',
        default: 6379
      })
      .positional('password', {
        describe: 'Set the password of the database',
        default: 'admin'
      })
      .positional('key', {
        describe: 'Set the key for either publishing or subscribing',
        default: 'fooBar'
      })
  }, (argv) => {
    const dbInstance = new dbWrapper({
      database: argv.database,
      host: argv.host,
      port: argv.port,
      password: argv.password
    });

    dbInstance.startSubscribe(argv.key);
  })
  .example('$0 subscribe redis localhost 6379 somePassword fooBar', 'start subscriber to redis for the key fooBar')
  .demandCommand(1, ,1 'Use either the publish or subscribe command')
  // open the help if no command was provided
  .help()
  .option('dbtype', {
    desc: 'Set the database e.g. "redis"',
    alias: 'db',
    default: 'redis',
    demandOption: true
  })
  .option('host', {
    desc: 'Set the host of the database',
    alias: 'h',
    default: 'localhost',
    demandOption: true
  })
  .option('port', {
    desc: 'Set the port of the database',
    alias: 'po',
    default: 6379,
    demandOption: true
  })
  .option('interval', {
    desc: 'Set the interval of the publisher in [ms]',
    alias: 'i',
    default: 10',
    demandOption: true
  })
  .option('key', {
    desc: 'Set the key for either publishing or subscribing',
    alias: 'k',
    default: 'foobar-[i]',
    demandOption: true
  })
  .options('password', {
    desc: 'Set the password for the database',
    alias: 'p',
    default: 'admin',
    demandOption: true
  })
  // define the column size
  .wrap(60)
  // display the version in the package.json
  .version()
  .argv
