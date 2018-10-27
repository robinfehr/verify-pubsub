const dbWrapper = require('./databases/');

require('yargs') // eslint-disable-line
  .usage('Usage: $0 <command> [options]')
  .command('publish', 'Start publishing data to a key for a database type (e.g. redis) with certain throughput.',() => {
    yargs.option('dbtype', {
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
        default: 10,
        demandOption: true
      })
      .option('key', {
        desc: 'Set the key for either publishing or subscribing',
        alias: 'k',
        default: 'foobar-[i]',
        demandOption: true
      })
      .option('password', {
        desc: 'Set the password for the database',
        alias: 'p',
        default: 'admin',
        demandOption: true
      })
  } , (argv) => {
    const dbInstance = new dbWrapper({
      database: argv.database,
      host: argv.host,
      port: argv.port,
      password: argv.password
    });

    dbInstance.startPublish(argv.key, argv.interval);
  })
  .example('$0 publish -dbtype redis -interval 10 -host localhost -port 6379 -password somePassword -key fooBar', 'start publishing to redis every 10ms with the key :"someKey[i]" where [i] will be replaced with the increment')
  .command('subscribe', () => {
    yargs.option('dbtype', {
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
      .option('key', {
        desc: 'Set the key for either publishing or subscribing',
        alias: 'k',
        default: 'foobar-[i]',
        demandOption: true
      })
      .option('password', {
        desc: 'Set the password for the database',
        alias: 'p',
        default: 'admin',
        demandOption: true
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
  .example('$0 subscribe -dbtype redis -host localhost -port 6379 -password somePassword -key fooBar', 'start subscriber to redis for the key fooBar')
  .demandCommand(1, ,1 'Use either the publish or subscribe command')
  // open the help if no command was provided
  .help()
  // define the column size
  .wrap(60)
  // display the version in the package.json
  .version()
  .argv
