# WinDeploy

![WinDeploy](https://i.imgur.com/5I3L0Dc.png)

A better Windows installer that runs *almost anywhere*.

WinDeploy can install a new copy of Windows to almost any SSD/HDD/USB storage connected to your PC.

It handles every step of the Windows install process, including wiping the drive, installing Windows itself, setting up the bootloader and even installing the recovery partition (WinRE).

Best of all, it can even do all this right from within your existing copy of Windows!

## Requirements

* A Windows image (WIM)
  * All versions from Windows 7 to 11 are supported, including alternate editions such as Enterprise, IoT etc.
  * You can get a WIM file from any Windows ISO.
    * The file is in the `sources` directory and is named `install.wim`   
* Windows 10+ or a recent version of WinPE to run WinDeploy
* A second drive (WinDeploy completely wipes your chosen disk, so it can't be used to install Windows on a currently booted drive)
* Any recent version of [Node.js](https://nodejs.org/en) (tested on Node 22+, but reasonably older versions should work fine)

## Installation

***NOTE:** Rolling WinDeploy into your own bootable WinPE is supported, but is beyond the scope of this guide*

1. Install [Node.js](https://nodejs.org/en) if it's not already installed
2. Get a Windows installation image (WIM) file
   - ***Hint:** You can use the `install.wim` file from the `sources` folder of any Windows ISO*
3. [Download](https://github.com/ParadoxEpoch/WinDeploy/archive/refs/heads/main.zip) the latest WinDeploy project code
4. Extract the downloaded zip file to a folder on your computer
5. Create a `wim` folder in the extracted project folder and drop your installation image *(WIM)* file in it
   - *The name of the file doesn't matter. WinDeploy will scan all the installation images in the `wim` folder.*
7. Open *Windows Terminal* or *Command Prompt* and navigate to the folder you extracted the zip to
    * This is easiest to do by right clicking an empty space in the folder and then choosing *Open in Terminal*
8. Run `npm install` to automatically install dependencies
9. Finally, double click the `Run WinDeploy.bat` file to start WinDeploy
