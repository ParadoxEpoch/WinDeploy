const chalk = require('chalk');
const {spawn} = require("child_process");

const msg = {
    bold: chalk.bold,
    info: chalk.bold.blue,
    link: chalk.underline.blue,
    //error: chalk.bgRed.hex('#cccccc'),
    error: chalk.bold.red,
    warn: chalk.bold.yellow,
    success: chalk.bold.green,
    brand: chalk.bold.hex('#0078d7')
}
exports.msg = msg;

// * Adds padding to both side of a string to center align it to the ASCII logo in the console
function centerString(text) {
    if (text >= 42) return text; // If text is too long to center, do nothing.
    const padding = Math.floor((42 - text.length) / 2);
    return ' '.repeat(padding) + text + ' '.repeat(padding);
}

exports.printLogo = function(text, style) {
    console.clear();
    console.log('                                        ');
    console.log(msg.brand(' _      ___      ___           __         '));
    console.log(msg.brand('| | /| / (_)__  / _ \\___ ___  / /__  __ __'));
    console.log(msg.brand('| |/ |/ / / _ \\/ // / -_) _ \\/ / _ \\/ // /'));
    console.log(msg.brand('|__/|__/_/_//_/____/\\__/ .__/_/\\___/\\_, / '));
    console.log(msg.brand('                      /_/          /___/  '));
    console.log('------------------------------------------');
    console.log(msg[style || 'bold'](centerString(text || 'WinDeploy v2.0.0')));
    console.log('------------------------------------------');
    console.log('                                        ');
}

exports.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.epochToDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return (
        seconds === 60
            ? (minutes + 1) + ':00'
            : minutes + ':' + (seconds < 10 ? '0' : '') + seconds
    );
}

// Executes a shell command. Inherits stdio if verbose=true, so output is shown and input is interactive.
exports.shellExec = async (shellCmd, shellArgs = [], verbose = false) => {
    const result = await new Promise(async function(resolve, reject) {
        const spawnArgs = verbose ? {stdio: 'inherit'} : {stdio: 'pipe'}
        let stdoutData = '';
        const script = spawn(shellCmd, shellArgs, spawnArgs);
        if (script.stdout) script.stdout.on('data', data => stdoutData += data.toString());
        script.on('close', (code) => {
            resolve({
                code: code,
                stdout: stdoutData
            });
        });
    });
    return result;
};