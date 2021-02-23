const report = require('yurnalist').createReporter({
    useMessageSymbols: true,
});
const emoji = require('node-emoji');

/* eslint-disable flowtype/require-return-type */
const someList = ['bananas', 'tulips', 'eggs', 'bamischijf'];

/* A function to fake some async task */
function doSomeWork(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function fetchSomething() {
    const spinner = report.activity();
    spinner.tick('Hunting endesa');

    try {
      await doSomeWork(1000);
      spinner.tick('Still busy');
      await doSomeWork(1000);
      spinner.tick('Almost there');
      await doSomeWork(1000);
      report.success('Done!');
    } catch (err) {
      report.error(err);
    }
  
    spinner.end();
    report.footer(true);
  }
  
  fetchSomething();

report.step(2, 3, 'Run', emoji.get(':runner:'));
report.step(3, 3, 'Finish', emoji.get(':checkered_flag:'));

