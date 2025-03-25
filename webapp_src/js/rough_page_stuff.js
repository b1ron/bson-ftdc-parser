//AKIRA broken on buffer.readUInt32LE atm: import { readFTDCFile } from './ftdc_parser.js';

let addFetchItBtn;
let debugPaneDiv;

const fetchFtdcAndDisplay = async () => {
    //AKIRA broken on buffer.readUInt32LE atm:  readFTDCFile('/files/metrics.2021-03-15T02-21-47Z-00000');
    let x = await fetch('/files/metrics.2021-03-15T02-21-47Z-00000');
    let y = await x.text();
    console.log(y);
    debugPaneDiv.innerText = "adfsfasdfa";
};

const dynamicContentSetup = async () => {
    addFetchItBtn = document.createElement("button");
    addFetchItBtn.innerText = "Fetch it";
    document.body.append(addFetchItBtn);
    addFetchItBtn.addEventListener('click', fetchFtdcAndDisplay);

    debugPaneDiv = document.createElement("div");
    debugPaneDiv.id = "debug_pane";
    document.body.append(debugPaneDiv);
};

export {
    dynamicContentSetup,
};
