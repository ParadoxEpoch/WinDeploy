const {msg, printLogo, epochToDuration, sleep, shellExec} = require('./func/common');
const sysInfo = require('./func/sysinfo');
const inquirer = require('inquirer');
//const cmd = require('node-cmd');
const diskpart = require('diskpart');
const fs = require('fs-extra');
const path = require('path');

let diskInfo;
let targetDisk;
let selectedWim = {};

// * Default WIM directory
const scriptDir = path.dirname(require.main.filename);
let wimDir = path.join(scriptDir, 'wim');

// * Target Partition Mounts
const targetVols = {
    system: 'S',
    primary: 'W',
    recovery: 'R'
}

exports.start = async function(tasks) {

    printLogo('WinDeploy - Provision System');

    // Get disk info for use in this provisining session
    diskInfo = await sysInfo.get.disks();

    printLogo('WinDeploy - Provision System');

    // Check if any drive letters the provisioner needs are already assigned, if so then bail out now
    if (await checkMountConflict()) return;

    // Ask the user to select a target disk to work with
    targetDisk = await selectDisk();

    printLogo('WinDeploy - Provision System');
    printTargetDisk(true);

    // If selected tasks have not been passed to this function, ask the user
    if (!Array.isArray(tasks)) tasks = await promptUser();

    // If deploywim is a selected task, ask the user to select a WIM image and index
    if (tasks.includes('deploywim')) await selectWim();

    const startTime = Date.now();

    const results = {};
    if (tasks.includes('partition')) results.partition = await runPartitioner();
    if (tasks.includes('deploywim')) results.deploy = await runDeploy();
    if (tasks.includes('installefi')) results.efi = await runEfiInstall();
    if (tasks.includes('installrec')) results.recovery = await runRecoveryInstall();

    const totalDuration = epochToDuration(Date.now() - startTime);
    console.log(msg.bold('\nProvisioning Completed in ' + totalDuration));

    console.log('\n');
    console.log(JSON.stringify(results));

    return results;

}

// * Prints target disk info to the console
function printTargetDisk(showDataWarning = false) {
    console.log(msg.info('Target Disk: ') + `${targetDisk.model} (${targetDisk.sizeGB}GB)`);
    console.log(msg.info('Serial Number: ') + targetDisk.serial);
    if (!showDataWarning) return console.log(' ');
    targetDisk.partitions === 0
        ? console.log(msg.success('This disk is empty and safe to provision to\n'))
        : console.log(msg.error(`This disk is NOT empty and will be wiped!\n`));
}

// * Checks if anything is already mounted on targetVols
async function checkMountConflict() {
    let hasMountConflicts = false;
    
    diskInfo.logical.forEach(logicalDisk => {
        if ([targetVols.system, targetVols.primary, targetVols.recovery].includes(logicalDisk.mount)) {
            console.log(msg.warn(`Disk #${logicalDisk.disk} Partition #${logicalDisk.partition} is already assigned to logical ${logicalDisk.mount}: drive!!`));
            hasMountConflicts = true;
        }
    });

    if (hasMountConflicts) {

        console.log(msg.error("\nThere are one or more partitions assigned to drive letters that I need! Please unassign these drive letters to continue safely."));
        console.log(msg.error("If you continue anyway, there's a good chance that you'll nuke the wrong disk!! Don't cry about it later.\n"));
        
        const continueAnyway = await inquirer.prompt({
            type: 'confirm',
            name: 'do',
            message: 'Would you like to ignore this very good advice and continue anyway?',
            default: false,
        });

        printLogo('WinDeploy - Provision System');

        if (continueAnyway.do) console.log(msg.error("YOU'VE BEEN WARNED\n"));
    
        return !continueAnyway.do
    }

    return hasMountConflicts;
}

// * Ask the user to select a target disk for provisioning
async function selectDisk() {

    console.log(msg.info('Physical disks attached to this system:\n'));
    console.table(diskInfo.physical, ['id', 'model', 'serial', 'partitions', 'sizeGB']);
    console.log(' ');

    const emptyDisks = [new inquirer.Separator('----- Empty Disks -----')];
    const usedDisks = [new inquirer.Separator('----- In-Use Disks -----')];

    diskInfo.physical.forEach(disk => {
        const choice = {
            name: `Disk ${disk.id}: ${disk.model} (${disk.sizeGB}GB)`,
            value: disk.id
        };

        disk.partitions === 0
            ? emptyDisks.push(choice)
            : usedDisks.push(choice);
    });

    if (emptyDisks.length < 2) emptyDisks.push(new inquirer.Separator('None'));
    if (usedDisks.length < 2) usedDisks.push(new inquirer.Separator('None'));

    const selectedDisk = await inquirer.prompt({
        type: 'list',
        name: 'do',
        message: 'Which disk do you want me to install Windows on?',
        choices: [
            ...emptyDisks,
            ...usedDisks
        ]
    });

    return diskInfo.physical.find(disk => disk.id === selectedDisk.do);
}

// * Ask the user which tasks they want to perform
async function promptUser() {

    const answers = await inquirer.prompt({
        type: 'checkbox',
        message: 'Which tasks should I run?',
        name: 'tasks',
        pageSize: 20,
        choices: [
            new inquirer.Separator('----- System Installation -----'),
            {name: 'Wipe & Partition Disk', value: 'partition', checked: true},
            {name: 'Install Windows', value: 'deploywim', checked: true},
            {name: 'Install EFI Bootloader', value: 'installefi', checked: true},
            {name: 'Install Recovery Data', value: 'installrec', checked: true},
            new inquirer.Separator('----- Post-Installation -----'),
            {name: 'Activate Windows', value: 'activatewin', checked: false},
            {name: 'Flash BIOS', value: 'flashbios', checked: false},
            new inquirer.Separator('----- Other Tasks -----'),
            {name: 'Mount Target Disk Volumes', value: 'mountdisk', checked: false}
        ],
        validate: function(answer) {
            return answer.length < 1 ? 'So... we\'re doing nothing? Pick something pls.' : true;
        }
    });

    return answers.tasks;

}

async function changeWimDir() {
	let {newWimDir} = await inquirer.prompt({
		type: 'input',
		name: 'newWimDir',
		message: 'Enter the new directory for WIM files:',
		default: wimDir,
		validate: function(input) {
			if (fs.existsSync(input) && fs.lstatSync(input).isDirectory()) {
				// Check if the directory contains any WIM files
				const files = fs.readdirSync(input);
				if (files.some(file => path.extname(file).toLowerCase() === '.wim')) {
					return true;
				}
				console.log(msg.error('The specified directory does not contain any WIM files.'));
				return false;
			}
			console.log(msg.error('The specified directory does not exist or is not a directory.'));
			return false;
		}
	});
	// Replace single backslashes with double backslashes for Windows paths
	//newWimDir = newWimDir.replace(/\\\\/g, '\\').replace(/\\/g, '\\\\');
	wimDir = newWimDir;
	console.log(msg.success(`WIM directory changed to: ${wimDir}`));
	return wimDir;
}

// * Ask the user which edition of Windows they want to install
async function selectWim() {

    printLogo('Choose a Windows version');

    let files = fs.readdirSync(wimDir);

	// If no WIM files found, prompt user to change directory
	if (files.some(file => path.extname(file).toLowerCase() === '.wim') === false) {
		printLogo('Choose a new WIM directory');
		console.log(msg.error('No WIM files found in the default directory. Please specify a directory containing WIM files.'));
		await changeWimDir();
		files = fs.readdirSync(wimDir);
	}

    const allImages = [];
    await Promise.all(files.map(async (file) => {

        // If the file is not a WIM, return early
        if (path.extname(file).toLowerCase() !== '.wim') return;

        // Get Windows version in WIM
        const {stdout} = await shellExec('dism', [
            '/Get-ImageInfo',
            `/ImageFile:${wimDir}${file}`,
            '/Index:1'
        ]);

        const regex = /Version\s*:\s*([\d.]+)\s*.*?ServicePack Build\s*:\s*(\d+)/;
        const match = regex.exec(stdout);
        const winver = `${match[1]}.${match[2]}`;

        allImages.push({
            name: `${file} (${winver})`,
            value: file
        })
    }))

    const {selectedWimFile} = await inquirer.prompt({
        type: 'list',
        message: 'Select an image to install',
        name: 'selectedWimFile',
        pageSize: 20,
        choices: allImages
    });

    selectedWim.file = selectedWimFile;

    printLogo('Choose a Windows edition');

    // Get all editions
    const {stdout} = await shellExec('dism', [
        '/Get-ImageInfo',
        `/ImageFile:${wimDir}${selectedWim.file}`
    ]);

    const regex = /Index : (\d+)\s+Name : (.+?)\s+Description : (.+?)\s+/g;
    let match;
    const options = [];

    while ((match = regex.exec(stdout)) !== null) {
        const [_, index, name] = match;
        options.push({ index, name });
    }

    const choices = options.map(option => ({
        name: option.name,
        value: option
    }));

    const {selectedEdition} = await inquirer.prompt({
        type: 'list',
        message: 'Select an edition to install',
        name: 'selectedEdition',
        pageSize: 20,
        choices: choices
    });

    selectedWim.name = selectedEdition.name;
    selectedWim.index = selectedEdition.index;

    console.log(`Selected ${selectedWim.name} (${selectedWim.file}) with index ${selectedWim.index}`);
}

// * DiskPart async wrapper
async function diskpart_run(commands = []) {
    return new Promise((resolve, reject) => {
        diskpart.evaluate(commands, function(error, output) {
            if (error) reject(error);
            resolve(output);
        });
    });
}

// * Partitioner
async function runPartitioner() {
    printLogo("*chuckles* I'm in danger!", "error");
    printTargetDisk(true);

    const diskId = targetDisk.id;

    if (targetDisk.partitions !== 0) {
        console.log(msg.info(`Listing Partitions on Disk ${diskId}...`));
        let partInfo = await diskpart_run([`sel disk ${diskId}`, 'list part']);
        printLogo("*chuckles* I'm in danger!", "error");
        printTargetDisk(true);
        console.log(msg.error('The following partitions already exist on this disk:'));
        console.log(partInfo.split('is now the selected disk.\r\n')[1]);

        const destroyExisting = await inquirer.prompt({
            type: 'confirm',
            name: 'do',
            message: `Are you sure you want to destroy ALL existing data on this disk?`,
            default: false,
        });
    
        if (!destroyExisting.do) return;

        printLogo("*chuckles* I'm in danger!", "error");
        printTargetDisk(true);
    }

    console.log(msg.warn(`We are about to completely ERASE ALL CONTENTS of DISK ${diskId} and create the following partitions for a new Windows install:`));
    
    console.log(' ');
    console.log('  ###  Name                       Size     Mount  ');
    console.log('  ---  -------------------------  -------  -------');
    console.log(`  1    EFI Partition               256 MB       ${targetVols.system}:`);
    console.log('  2    MSR (Reserved) Partition     16 MB         ');
    console.log(`  3    Primary Windows Partition     Auto       ${targetVols.primary}:`);
    console.log(`  4    WinRE Recovery Partition      1 GB       ${targetVols.recovery}:`);
    console.log(' ');

    console.log(msg.bold('Are you ' + msg.info('CERTAIN') + ' that you want to PERMANENTLY erase the contents of the ' + msg.info(targetDisk.model) + ` with disk ID ${diskId}?`));
    console.log(msg.error('THIS IS YOUR LAST CHANCE TO TURN BACK!!'));
    console.log(' ');

    const startPartition = await inquirer.prompt({
        type: 'confirm',
        name: 'do',
        message: `Erase ALL data on Disk ${diskId}?`,
        default: false,
    });

    if (!startPartition.do) return;

    printLogo('Partitioning System');
    printTargetDisk();

    /* const results = {};

    // Initialise disk as GPT
    console.log(msg.info(`Initialising Disk ${diskId} as GPT...`));
    results.initialise = await diskpart_run([`sel disk ${diskId}`, 'clean', 'convert gpt']);
    console.log(msg.success('OK\n'));

    // Create EFI System Partition
    console.log(msg.info(`Creating EFI System Partition...`));
    results.makeefi = await diskpart_run([`sel disk ${diskId}`, 'create partition efi size=260', 'format quick fs=fat32 label="System"', `assign letter="${targetVols.system}"`]);
    console.log(msg.success('OK\n'));

    // Create MSR Partition
    console.log(msg.info(`Creating Microsoft Reserved (MSR) Partition...`));
    results.makemsr = await diskpart_run([`sel disk ${diskId}`, 'create partition msr size=16']);
    console.log(msg.success('OK\n'));

    // Create Primary Partition
    console.log(msg.info(`Creating Windows Primary Partition...`));
    results.makeprimary = await diskpart_run([`sel disk ${diskId}`, 'create partition primary', 'shrink minimum=1000', 'format quick fs=ntfs label="Windows"', `assign letter="${targetVols.primary}"`]);
    console.log(msg.success('OK\n'));

    // Create Recovery Partition
    console.log(msg.info(`Creating Recovery Partition...`));
    results.makerecovery = await diskpart_run([`sel disk ${diskId}`, 'create partition primary', 'format quick fs=ntfs label="Recovery"', `assign letter="${targetVols.recovery}"`, 'set id="de94bba4-06d1-4d40-a16a-bfd50179d6ac"', 'gpt attributes=0x8000000000000001']);
    console.log(msg.success('OK\n')); */

    // * ALL IN ONE - Initialise & Create Partitions
    console.log('Creating Partitions...');
    const results = await diskpart_run([
        `sel disk ${diskId}`,
        'clean',
        'convert gpt',
        'create partition efi size=260',
        'format quick fs=fat32 label="System"',
        `assign letter="${targetVols.system}"`,
        'create partition msr size=16',
        'create partition primary',
        'shrink minimum=1000',
        'format quick fs=ntfs label="Windows"',
        `assign letter="${targetVols.primary}"`,
        'create partition primary',
        'format quick fs=ntfs label="Recovery"',
        `assign letter="${targetVols.recovery}"`,
        'set id="de94bba4-06d1-4d40-a16a-bfd50179d6ac"',
        'gpt attributes=0x8000000000000001'
    ]);
    console.log(msg.success('OK\n'));
    
    // Check Results
    console.log(msg.success('All done! Listing new partition table...'));
    const newPartitions = await diskpart_run([`sel disk ${diskId}`, 'list part']);
    console.log(newPartitions.split('is now the selected disk.\r\n')[1]);

    console.log(' ');

    return results;
}

// * Deploy Windows Image
async function runDeploy() {

    console.log(msg.info(`Installing ${selectedWim.name}...`));

    // Start deployment
    const result = await shellExec('dism', [
        '/Apply-Image',
        `/ImageFile:${wimDir}${selectedWim.file}`,
        `/Index:${selectedWim.index}`,
        `/ApplyDir:${targetVols.primary}:\\`
    ], true);
    result.code === 0 ? console.log(msg.success('OK\n')) : console.log(msg.error('\nFAILED\n'));

    return result;

}

// * Install EFI Bootloader
async function runEfiInstall() {

    console.log(msg.info(`Installing EFI Bootloader...`));

    // Install EFI with bcdboot
    const result = await shellExec(`${targetVols.primary}:\\Windows\\System32\\bcdboot`, [
        `${targetVols.primary}:\\Windows`,
        `/s`, `${targetVols.system}:`
    ]);
    result.code === 0 ? console.log(msg.success('OK\n')) : console.log(msg.error(result.stdout + '\nFAILED\n'));

    return result;

}

// * Install Recovery Data
async function runRecoveryInstall() {

    console.log(msg.info(`Installing Recovery Data...`));

    // Copy Winre.wim from primary partition to recovery using xcopy
    fs.ensureDirSync(`${targetVols.recovery}:\\Recovery\\WindowsRE`);
    fs.copySync(`${targetVols.primary}:\\Windows\\System32\\Recovery\\winre.wim`, `${targetVols.recovery}:\\Recovery\\WindowsRE\\winre.wim`);
    console.log(msg.success('OK\n'));

    // Register recovery tools with new installation using Reagentc
    console.log(msg.info(`Registering Recovery with Windows...`));
    const result = await shellExec(`${targetVols.primary}:\\Windows\\System32\\Reagentc`, [
        '/Setreimage',
        `/Path`, `${targetVols.recovery}:\\Recovery\\WindowsRE`,
        `/Target`, `${targetVols.primary}:\\Windows`
    ]);
    result.code === 0 ? console.log(msg.success('OK\n')) : console.log(msg.error(result.stdout + '\nFAILED\n'));

    return result;

}
