import { readFTDCFile } from './ftdc_parser.js';

let addFetchItBtn;
let debugPaneDiv;

const fetchFtdcAndDisplay = async () => {
    const hostPrefix = "https://lfs-example-files-202503.s3.ap-northeast-1.amazonaws.com/";
    const fpath = "wt_internals_training/diagnostic.data/metrics.2021-03-11T08-20-52Z-00000";
    readFTDCFile(`${hostPrefix}${fpath}`);
    //let x = await fetch(`${hostPrefix}${fpath}`);
    //let y = await x.text();
    //console.log(y);
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
