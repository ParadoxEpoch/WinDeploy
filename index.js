const {msg, printLogo} = require('./func/common');
const sysInfo = require('./func/sysinfo');
const inquirer = require('inquirer');
const wininstall = require('./wininstall');

async function main(getSysInfo = false) {

    printLogo();

    if (getSysInfo) await getSystemInfo();

    const action = await inquirer.prompt({
        type: 'list',
        name: 'do',
        message: 'What would you like to do?',
        choices: [
            {name: 'Install Windows', value: 'wininstall'},
            //{name: 'Repair Windows', value: 'winrepair'},
            {name: 'View System Information', value: 'sysinfo'},
        ]
    });

    switch(action.do) {
        case 'wininstall':
            // install windows
            await wininstall.start();
            break;
		case 'winrepair':
            // repair windows
			printLogo('Not yet implemented');
			console.log(msg.warn('Please check back later, this feature is not yet implemented.'));
            break;
        case 'sysinfo':
            // system info
            printLogo('Getting System Information');
            await getSystemInfo();
            break;
    }

    const restart = await inquirer.prompt({
        type: 'confirm',
        name: 'do',
        message: 'Would you like to do something else?',
        default: true,
    });

    restart.do
        ? main(false)
        : printLogo('Thank you, come again!') && process.exit();

}

async function getSystemInfo() {

    const info = await sysInfo.get.all();

    printLogo();

    console.log(msg.info('Windows Version: ') + info.os.release);
    console.log(msg.info('Graphics Driver: ') + (info.gpu.driverVersion || msg.error('Unknown Driver')));
    console.log(msg.info('BIOS Date: ') + info.bios.releaseDate);
    console.log(msg.info('Processor: ') + `${info.cpu.brand} (${info.cpu.physicalCores}C/${info.cpu.cores}T @ ${info.cpu.speed}GHz)`);
    console.log(msg.info('Motherboard: ') + info.mobo.model);
    console.log(msg.info('Memory: ') + `${info.ram.manufacturer} ${info.ram.model} ${info.ram.totalGB}GB (${info.ram.dimms}x${info.ram.dimmSizeGB}GB @ ${info.ram.speed}MHz)`);
    console.log(msg.info('Graphics: ') + (info.gpu.name || info.gpu.model));
    console.log(msg.info('Connected Displays: ') + info.displays.length);
    console.log(msg.info('System UUID: ') + info.uuid.hardware);
    
    // RAM Speed Check (XMP/DOCP)
    if (info.ram.speed < 2150) console.log(msg.warn('\nWARNING: RAM speed is low. Check that XMP/DOCP is enabled in the BIOS!!'));
    
    // BIOS Date Check
    if ((Date.now() - 15778463000) > new Date(info.bios.releaseDate).getTime()) console.log(msg.warn('\nWARNING: BIOS is more than 6 months old and might be out of date. Check for a BIOS update!'));

    console.log(' ');

    return info;

    /* return {
        winVer: info.os.release,
    
        cpuVendor: cpu.manufacturer,
        cpuName: cpu.brand,
    
        gpuVendor: graphics.controllers[0].vendor,
        gpuName: graphics.controllers[0].name,
        gpuDriver: graphics.controllers[0].driverVersion,
    
        mobo: {
            brand: mobo.manufacturer,
            model: mobo.model,
            serial: mobo.serial
        },

        bios: {
            version: bios.version,
            date: bios.releaseDate
        },

        cpu: {
            brand: cpu.manufacturer,
            model: cpu.brand,
            specs: `${cpu.physicalCores}C/${cpu.cores}T @ ${cpu.speed}GHz`
        },

        ram: {
            brand: ramLayout[0].manufacturer,
            model: ramLayout[0].partNum,
            speed: ramLayout[0].clockSpeed,
            total: Math.ceil(ram.total / 1073741824), // RAM total in bytes / (1024 * 1024 * 1024), rounded up to nearest integer. Should give us total RAM in GB.
            layout: ramLayout
        },

        gpu: graphics.controllers[0],

        connectedDisplays: graphics.displays.length,

        disk: disk,

        uuid: uuid.hardware
    } */
}

main();